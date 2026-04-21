"""
car_detection.py — Project Uniview Sensor Node
================================================
Detects vehicle presence using an analog Hall Effect sensor read via an
MCP3002 ADC over SPI, and POSTs occupancy status to the Uniview backend.

POST behaviour:
  - Immediate POST whenever occupancy status changes (car arrives / departs).
  - Guaranteed heartbeat POST every SLEEP_SECONDS (default 1 hr) so the
    backend always receives a reading even if nothing has changed.

Hardware connections:
  Hall Effect Sensor (analog out) → MCP3002 CH0 (pin 2)
  MCP3002 CS  → GPIO7  / SPI0 CE1  (pin 26)
  MCP3002 CLK → GPIO11 / SPI0 SCLK (pin 23)
  MCP3002 Din → GPIO10 / SPI0 MOSI (pin 19)
  MCP3002 Dout→ GPIO9  / SPI0 MISO (pin 21)  ← sensor data arrives here

  The Pi reads the sensor result on GPIO9 / MISO. The raw analog signal
  from the Hall Effect sensor goes into MCP3002 pin 2 (CH0) only — it
  never connects to a Pi GPIO pin directly.

Dependencies:
    pip install spidev requests

Usage:
    python car_detection.py            # continuous mode (recommended)
    python car_detection.py --once     # single read + POST, then exit (cron)
"""

import os
import time
import logging
import argparse
import sys
import spidev
import requests

# ── Logging ────────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
log = logging.getLogger(__name__)

# ── Backend Configuration ──────────────────────────────────────────────────────
SERVER_URL      = "http://your_app_endpoint/sensor/update"
NODE_ID         = "NODE_LOT_TEST_001"    # Unique ID for this sensor node
LOT_ID          = "LOT_TEST"     # ID of the parking lot this sensor belongs to
REQUEST_TIMEOUT = 10            # seconds before HTTP request times out

# ── Timing ────────────────────────────────────────────────────────────────────
SLEEP_SECONDS   = 3600          # Heartbeat interval: POST at least once per hour
POLL_SECONDS    = 0.1           # How often to sample the ADC (100 ms)

# ── ADC — MCP3002 (SPI bus 0, CE1 / GPIO7) ───────────────────────────────────
ADC_BUS         = 0
ADC_DEVICE      = 1             # CE1 = GPIO7  →  /dev/spidev0.1
ADC_CHANNEL     = 0             # CH0 connected to Hall Effect sensor
ADC_SPEED_HZ    = 1_200_000     # Max 1.2 MHz @ 2.7 V supply, 3.2 MHz @ 5 V

# ── Detection ─────────────────────────────────────────────────────────────────
# Midpoint of the 10-bit ADC range (0–1023).
# Raise if the sensor reads high in an empty space (strong ambient field).
# Lower if a parked car produces only a small magnetic deflection.
THRESHOLD       = 512


# ══════════════════════════════════════════════════════════════════════════════
# SPI preflight check
# ══════════════════════════════════════════════════════════════════════════════

def _check_spi_device(bus: int, device: int) -> None:
    """
    Verify /dev/spidev{bus}.{device} exists before attempting to open it.

    spidev.open() raises a bare FileNotFoundError (errno 2) when the device
    file is missing — this happens when SPI is disabled in the Pi boot config.

    Fix:
      1. Open  /boot/firmware/config.txt  (Pi 5) or  /boot/config.txt  (Pi 4)
      2. Add or uncomment:  dtparam=spi=on
      3. sudo reboot
      4. Verify:  ls /dev/spidev*   →  should show /dev/spidev0.0  /dev/spidev0.1
    """
    path = f"/dev/spidev{bus}.{device}"
    if not os.path.exists(path):
        available = [f for f in os.listdir("/dev") if f.startswith("spidev")]
        raise FileNotFoundError(
            f"\n\nSPI device '{path}' not found.\n"
            f"Available SPI devices: {available or ['none']}\n\n"
            f"To fix:\n"
            f"  1. Open  /boot/firmware/config.txt  (Pi 5)  or  /boot/config.txt  (Pi 4)\n"
            f"  2. Add or uncomment:  dtparam=spi=on\n"
            f"  3. sudo reboot\n"
            f"  4. Verify: ls /dev/spidev*\n"
        )


# ══════════════════════════════════════════════════════════════════════════════
# MCP3002 — SPI ADC
# ══════════════════════════════════════════════════════════════════════════════

class MCP3002:
    """
    10-bit, 2-channel SPI ADC.

    2-byte SPI transaction:
        TX byte 0: [0][START=1][SGL=1][CH][MSBF=1][0][0][0]
                    CH=0  →  0x68  (0b01101000)
                    CH=1  →  0x78  (0b01111000)
        TX byte 1: 0x00  (don't care — clocks out the result)

        Result = ((rx[0] & 0x03) << 8) | rx[1]   →  0 to 1023

    Data comes back to the Pi on GPIO9 / SPI0 MISO (physical pin 21).
    """
    _CMD_BASE = 0x68    # START=1, SGL=1, CH0 selected, MSBF=1

    def __init__(self, bus: int, device: int, speed_hz: int) -> None:
        _check_spi_device(bus, device)
        self._spi = spidev.SpiDev()
        self._spi.open(bus, device)
        self._spi.max_speed_hz = speed_hz
        self._spi.mode = 0b00           # CPOL=0, CPHA=0

    def read(self, channel: int) -> int:
        """Return a 10-bit reading (0–1023) for channel 0 or 1."""
        if channel not in (0, 1):
            raise ValueError(f"MCP3002 only has channels 0 and 1, got {channel}")
        cmd = [self._CMD_BASE | (channel << 4), 0x00]
        rx  = self._spi.xfer2(cmd)
        return ((rx[0] & 0x03) << 8) | rx[1]

    def close(self) -> None:
        self._spi.close()


# ══════════════════════════════════════════════════════════════════════════════
# Sensor read
# ══════════════════════════════════════════════════════════════════════════════

def read_sensor(adc: MCP3002) -> str:
    """
    Read the Hall Effect sensor via the MCP3002 and return an occupancy string.

    Replaces the original digital read:
        value = GPIO.input(HALL_SENSOR_PIN)
        return "occupied" if value == GPIO.HIGH else "available"

    With the analog equivalent:
        raw      = adc.read(ADC_CHANNEL)    # 0–1023
        occupied = raw > THRESHOLD
    """
    raw      = adc.read(ADC_CHANNEL)
    occupied = raw > THRESHOLD
    status   = "occupied" if occupied else "available"

    log.info(
        "Hall sensor: %4d / 1023  threshold: %d  ->  %s",
        raw, THRESHOLD, status.upper(),
    )
    return status


# ══════════════════════════════════════════════════════════════════════════════
# HTTP POST
# ══════════════════════════════════════════════════════════════════════════════

def send_status_update(status: str) -> None:
    """
    POST occupancy status to the Uniview backend.

    Payload: { "nodeId": "...", "lotId": "...", "status": "occupied"|"available" }
    """
    payload = {"nodeId": NODE_ID, "lotId": LOT_ID, "status": status}
    try:
        response = requests.post(SERVER_URL, json=payload, timeout=REQUEST_TIMEOUT)
        response.raise_for_status()
        log.info("Response code: %d  %s", response.status_code, response.text.strip())
    except requests.exceptions.ConnectionError:
        log.error("POST failed — could not reach %s", SERVER_URL)
    except requests.exceptions.Timeout:
        log.error("POST failed — request timed out after %ds", REQUEST_TIMEOUT)
    except requests.exceptions.HTTPError as exc:
        log.error("POST failed — server returned %s", exc)
    except requests.exceptions.RequestException as exc:
        log.error("POST failed — %s", exc)


# ══════════════════════════════════════════════════════════════════════════════
# Main
# ══════════════════════════════════════════════════════════════════════════════

def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Project Uniview — Hall Effect sensor node")
    p.add_argument(
        "--once",
        action="store_true",
        help="Take one reading, POST it, then exit. Use with cron for hourly execution.",
    )
    return p.parse_args()


def main() -> None:
    args = parse_args()
    log.info("=== Project Uniview — Node: %s  Lot: %s ===", NODE_ID, LOT_ID)

    adc: MCP3002 | None = None

    try:
        adc = MCP3002(ADC_BUS, ADC_DEVICE, ADC_SPEED_HZ)

        if args.once:
            # ── Single-shot / cron mode ────────────────────────────────────────
            # Take one reading, POST it, and exit.
            # Schedule with cron for the 1-hour interval:
            #   crontab -e
            #   0 * * * * python3 /path/to/car_detection.py --once
            status = read_sensor(adc)
            send_status_update(status)
            log.info("Single reading complete. Exiting.")

        else:
            # ── Continuous mode ───────────────────────────────────────────────
            # Polls the ADC every POLL_SECONDS (100 ms) and POSTs in two cases:
            #   1. Status change  — immediate POST when a car arrives/departs.
            #   2. Heartbeat      — POST every SLEEP_SECONDS (1 hr) regardless,
            #                       so the backend always has a recent reading.
            log.info(
                "Continuous mode — polling every %.0f ms, heartbeat every %d s.",
                POLL_SECONDS * 1000, SLEEP_SECONDS,
            )
            last_status:    str | None = None
            last_post_time: float      = 0.0    # force an immediate POST on startup

            while True:
                status     = read_sensor(adc)
                now        = time.monotonic()
                elapsed    = now - last_post_time

                if status != last_status or elapsed >= SLEEP_SECONDS:
                    reason = "status change" if status != last_status else "heartbeat"
                    log.info("POSTing (%s).", reason)
                    send_status_update(status)
                    last_status    = status
                    last_post_time = now

                time.sleep(POLL_SECONDS)

    except KeyboardInterrupt:
        log.info("Interrupted by user.")

    finally:
        if adc is not None:
            adc.close()


if __name__ == "__main__":
    main()
