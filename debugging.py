"""
car_detection.py — Project Uniview Sensor Node
================================================
Detects vehicle presence using an analog Hall Effect sensor read via an
MCP3002 ADC (SPI), drives an MCP4822 DAC output to reflect occupancy state,
and POSTs status to the Uniview backend.

POST behaviour (combines both prior versions):
  - Immediate POST whenever occupancy status changes (car arrives / departs).
  - Guaranteed heartbeat POST every SLEEP_SECONDS (default 1 hr) so the
    backend always receives a reading even if nothing has changed.

Hardware connections:
  Hall Effect Sensor (analog out) → MCP3002 CH0 (pin 2)
  MCP3002 CS  → GPIO7  / SPI0 CE1  (pin 26)
  MCP3002 CLK → GPIO11 / SPI0 SCLK (pin 23)
  MCP3002 Din → GPIO10 / SPI0 MOSI (pin 19)
  MCP3002 Dout→ GPIO9  / SPI0 MISO (pin 21)

  MCP4822 CS   → GPIO8  / SPI0 CE0  (pin 24)   [Arduino: dacCS  = 8 ]
  MCP4822 SCK  → GPIO11 / SPI0 SCLK (pin 23)   [Arduino: dacSCK = 11]
  MCP4822 SDI  → GPIO10 / SPI0 MOSI (pin 19)   [Arduino: dacSDI = 10]
  MCP4822 LDAC → GPIO7               (pin 26)   [Arduino: dacLDAC = 7]

  NOTE: MCP3002 CS and LDAC both use GPIO7. Wire LDAC to GND instead if
  you need both SPI CE lines free, since holding LDAC LOW permanently is
  the correct default (immediate latch on CS rising edge).

Dependencies:
    pip install spidev lgpio requests

    lgpio replaces RPi.GPIO for Pi 5 compatibility. RPi.GPIO raises
    "cannot determine SoC peripheral base address" on Pi 5 because it
    does not support the RP1 I/O chip. lgpio works on Pi 4 and Pi 5.

    Alternatively, wire MCP4822 LDAC directly to GND — it is held LOW
    permanently anyway — and remove the lgpio dependency entirely.

Usage:
    python car_detection.py            # continuous mode (recommended)
    python car_detection.py --once     # single read + POST, then exit (cron)
"""

import time
import logging
import argparse
import sys
import spidev
import lgpio
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
NODE_ID         = "node-001"    # Unique ID for this sensor node
LOT_ID          = "lot-001"     # ID of the parking lot this sensor belongs to
REQUEST_TIMEOUT = 10            # seconds before HTTP request times out

# ── Timing ────────────────────────────────────────────────────────────────────
SLEEP_SECONDS   = 3600          # Heartbeat interval: POST at least once per hour
POLL_SECONDS    = 0.1           # How often to sample the ADC (100 ms)

# ── ADC — MCP3002 (SPI bus 0, CE1 / GPIO7) ───────────────────────────────────
ADC_BUS         = 0
ADC_DEVICE      = 1             # CE1 = GPIO7
ADC_CHANNEL     = 0             # CH0 connected to Hall Effect sensor
ADC_SPEED_HZ    = 1_200_000     # Safe for 3.3 V supply (max 1.2 MHz @ 2.7 V)

# ── DAC — MCP4822 / MCP48X2 (SPI bus 0, CE0 / GPIO8) ─────────────────────────
DAC_BUS         = 0
DAC_DEVICE      = 0             # CE0 = GPIO8
DAC_SPEED_HZ    = 20_000_000    # MCP4822 max clock
DAC_CHANNEL     = 0             # 0 = output channel A, 1 = output channel B
DAC_GAIN_1X     = True          # True = 1x gain (Vout = Vref * D/4096)

# ── Detection ─────────────────────────────────────────────────────────────────
# Midpoint of the 10-bit ADC range (0-1023).
# Raise this value if the sensor reads high in an empty space (ambient field);
# lower it if a parked car produces only a modest magnetic deflection.
THRESHOLD       = 512

# ── GPIO (LDAC pin for MCP4822) ───────────────────────────────────────────────
LDAC_PIN        = 7             # Held LOW: DAC latches output immediately on CS rising edge


# ══════════════════════════════════════════════════════════════════════════════
# MCP3002 — SPI ADC (replaces GPIO.input() from the original script)
# ══════════════════════════════════════════════════════════════════════════════

class MCP3002:
    """
    10-bit, 2-channel SPI ADC.

    2-byte SPI transaction (unlike the 3-byte MCP3008 protocol):

        TX byte 0: [0][START][SGL][CH][MSBF][0][0][0]
                    CH=0 -> 0x68 (0b01101000)
                    CH=1 -> 0x78 (0b01111000)
        TX byte 1: 0x00  (don't care, clocks out the result)

        Result = ((rx[0] & 0x03) << 8) | rx[1]   ->  0 to 1023
    """
    _CMD_BASE = 0x68    # START=1, SGL=1, CH0, MSBF=1

    def __init__(self, bus: int, device: int, speed_hz: int) -> None:
        self._spi = spidev.SpiDev()
        self._spi.open(bus, device)
        self._spi.max_speed_hz = speed_hz
        self._spi.mode = 0b00           # CPOL=0, CPHA=0

    def read(self, channel: int) -> int:
        """Return a 10-bit reading (0-1023) for channel 0 or 1."""
        if channel not in (0, 1):
            raise ValueError(f"MCP3002 only has channels 0 and 1, got {channel}")
        cmd = [self._CMD_BASE | (channel << 4), 0x00]
        rx  = self._spi.xfer2(cmd)
        return ((rx[0] & 0x03) << 8) | rx[1]

    def close(self) -> None:
        self._spi.close()


# ══════════════════════════════════════════════════════════════════════════════
# MCP4822 — SPI DAC (absent from the original script)
# ══════════════════════════════════════════════════════════════════════════════

class MCP4822:
    """
    12-bit, dual-channel SPI DAC.

    2-byte SPI transaction:
        Byte 0: [~A/B][BUF][~GA][~SHDN][D11][D10][D9][D8]
        Byte 1: [D7][D6][D5][D4][D3][D2][D1][D0]

    Outputs 0 V (no car) or Vref (car detected) to mirror the Arduino's
    DAC logic: outputValue = (sensorValue > threshold) ? 4095 : 0
    """
    MAX = 4095

    def __init__(self, bus: int, device: int, speed_hz: int,
                 channel: int = 0, gain_1x: bool = True) -> None:
        self._spi = spidev.SpiDev()
        self._spi.open(bus, device)
        self._spi.max_speed_hz = speed_hz
        self._spi.mode = 0b00

        # Pre-compute the config nibble (upper 4 bits of first byte)
        ab   = channel << 7                         # bit 7: channel select
        buf  = 0 << 6                               # bit 6: unbuffered Vref
        ga   = (1 if gain_1x else 0) << 5           # bit 5: gain
        shdn = 1 << 4                               # bit 4: output active
        self._cfg = ab | buf | ga | shdn

    def write(self, value: int) -> None:
        """Send a 12-bit value (0-4095) to the DAC output pin."""
        value     = max(0, min(value, self.MAX))
        high_byte = self._cfg | ((value >> 8) & 0x0F)
        low_byte  = value & 0xFF
        self._spi.xfer2([high_byte, low_byte])

    def close(self) -> None:
        self._spi.close()


# ══════════════════════════════════════════════════════════════════════════════
# GPIO helpers
# ══════════════════════════════════════════════════════════════════════════════

# Module-level lgpio handle — opened once, shared by setup/cleanup
_gpio_handle: int = -1


def setup_gpio() -> None:
    """
    Hold LDAC LOW so the MCP4822 latches immediately on every CS rising edge.

    Uses lgpio instead of RPi.GPIO. RPi.GPIO raises:
        "RuntimeError: cannot determine SoC peripheral base address"
    on Raspberry Pi 5 because RPi.GPIO does not support the RP1 I/O chip.
    lgpio uses the kernel gpiochip interface and works on Pi 4 and Pi 5.

    lgpio equivalents of the RPi.GPIO calls replaced:
        GPIO.setmode(GPIO.BCM)          -> lgpio.gpiochip_open(0)
        GPIO.setup(pin, GPIO.OUT)       -> lgpio.gpio_claim_output(h, pin)
        GPIO.output(pin, GPIO.LOW)      -> lgpio.gpio_write(h, pin, 0)
    """
    global _gpio_handle
    _gpio_handle = lgpio.gpiochip_open(0)           # open /dev/gpiochip0
    lgpio.gpio_claim_output(_gpio_handle, LDAC_PIN)  # configure as output
    lgpio.gpio_write(_gpio_handle, LDAC_PIN, 0)      # hold LOW
    log.info("GPIO ready — LDAC (GPIO%d) held LOW via lgpio.", LDAC_PIN)


def cleanup_gpio() -> None:
    """Release the lgpio handle. Equivalent to GPIO.cleanup()."""
    global _gpio_handle
    if _gpio_handle >= 0:
        lgpio.gpio_free(_gpio_handle, LDAC_PIN)
        lgpio.gpiochip_close(_gpio_handle)
        _gpio_handle = -1
    log.info("GPIO cleaned up.")


# ══════════════════════════════════════════════════════════════════════════════
# Sensor read  (replaces GPIO.input(HALL_SENSOR_PIN) from the original script)
# ══════════════════════════════════════════════════════════════════════════════

def read_sensor(adc: MCP3002, dac: MCP4822) -> str:
    """
    Read the Hall Effect sensor via the MCP3002 ADC, apply the detection
    threshold, drive the MCP4822 DAC output, and return a status string.

    Replaces the original:
        value = GPIO.input(HALL_SENSOR_PIN)
        return "occupied" if value == GPIO.HIGH else "available"

    With the analog equivalent:
        raw      = adc.read(ADC_CHANNEL)           # 0-1023
        occupied = raw > THRESHOLD                 # same logic as Arduino sketch
        dac.write(4095 if occupied else 0)
    """
    raw      = adc.read(ADC_CHANNEL)
    occupied = raw > THRESHOLD
    status   = "occupied" if occupied else "available"

    dac.write(MCP4822.MAX if occupied else 0)   # 4095 = car present, 0 = empty

    log.info(
        "Hall sensor: %4d / 1023  threshold: %d  ->  %s  (DAC: %d)",
        raw, THRESHOLD, status.upper(), MCP4822.MAX if occupied else 0,
    )
    return status


# ══════════════════════════════════════════════════════════════════════════════
# HTTP POST  (kept from the original script, signature unchanged)
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

    setup_gpio()
    adc = MCP3002(ADC_BUS, ADC_DEVICE, ADC_SPEED_HZ)
    dac = MCP4822(DAC_BUS, DAC_DEVICE, DAC_SPEED_HZ, DAC_CHANNEL, DAC_GAIN_1X)

    try:
        if args.once:
            # ── Single-shot (cron) mode ────────────────────────────────────────
            # Mirrors the original script's structure and the Arduino's setup():
            #   read -> send -> exit   (OS scheduler handles the 1-hour interval)
            #
            # To schedule hourly via cron:
            #   crontab -e
            #   0 * * * * python3 /path/to/car_detection.py --once
            status = read_sensor(adc, dac)
            send_status_update(status)
            log.info("Single reading complete. Exiting.")

        else:
            # ── Continuous mode ───────────────────────────────────────────────
            # Polls the ADC every POLL_SECONDS (100 ms) for a responsive DAC
            # output, but only POSTs to the backend in two cases:
            #
            #   1. Status change  — immediate POST when a car arrives/departs.
            #   2. Heartbeat      — POST every SLEEP_SECONDS (1 hr) regardless,
            #                       so the backend and Redis cache always have a
            #                       fresh reading. Matches the original script's
            #                       guaranteed hourly reporting behaviour.
            log.info(
                "Continuous mode — polling every %.0f ms, heartbeat every %d s.",
                POLL_SECONDS * 1000, SLEEP_SECONDS,
            )
            last_status:    str | None = None
            last_post_time: float      = 0.0    # triggers an immediate POST on start

            while True:
                status     = read_sensor(adc, dac)
                now        = time.monotonic()
                elapsed    = now - last_post_time

                status_changed = status != last_status
                heartbeat_due  = elapsed >= SLEEP_SECONDS

                if status_changed or heartbeat_due:
                    reason = "status change" if status_changed else "heartbeat"
                    log.info("POSTing (%s).", reason)
                    send_status_update(status)
                    last_status    = status
                    last_post_time = now

                time.sleep(POLL_SECONDS)

    except KeyboardInterrupt:
        log.info("Interrupted by user.")

    finally:
        adc.close()
        dac.close()
        cleanup_gpio()


if __name__ == "__main__":
    main()
