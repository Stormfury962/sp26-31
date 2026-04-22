"""
Car Detection System for Parking Lot

Detects vehicle presence using a Hall Effect sensor connected to a
Raspberry Pi via GPIO. Reads the sensor, determines occupancy status,
sends the result to the Uniview backend over WiFi, then sleeps for 1 hour.

Dependencies:
    pip install RPi.GPIO requests

Connections:
    - Hall Effect Sensor output -> GPIO17 (BCM numbering)
    - Power via DC-DC buck converter
"""

import time
import json
import logging
import RPi.GPIO as GPIO
import requests

# ── Logging ────────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
log = logging.getLogger(__name__)

# ── Pin Configuration ──────────────────────────────────────────────────────────
HALL_SENSOR_PIN = 7  # BCM GPIO pin connected to the Hall Effect sensor

# ── Backend Configuration ──────────────────────────────────────────────────────
SERVER_URL = "http://10.71.50.49:3000/sensors/update"
NODE_ID         = "NODE_LOT_TEST_001"    # Unique ID for this sensor node
LOT_ID          = "LOT_TEST"     # ID of the parking lot this sensor belongs to
# ── Timing ────────────────────────────────────────────────────────────────────
POLL_SECONDS    = 2    # how often to sample the sensor
REQUEST_TIMEOUT = 10   # seconds before HTTP request times out


def setup_gpio() -> None:
    """Configure GPIO pins."""
    GPIO.cleanup()  # release any stale lock from a previous run
    GPIO.setmode(GPIO.BCM)
    GPIO.setup(HALL_SENSOR_PIN, GPIO.IN)
    log.info("GPIO initialised — using BCM pin %d", HALL_SENSOR_PIN)


def read_sensor() -> str:
    """
    Read the Hall Effect sensor and return the occupancy status string.

    Returns:
        "occupied"  if a vehicle is detected (sensor HIGH)
        "available" if no vehicle is detected (sensor LOW)
    """
    value = GPIO.input(HALL_SENSOR_PIN)
    if value == GPIO.HIGH:
        log.info("Car detected!")
        return "occupied"
    else:
        log.info("No car detected.")
        return "available"


def send_status_update(status: str) -> None:
    """
    POST the sensor status to the Uniview backend.

    Args:
        status: "occupied" or "available"
    """
    payload = {
        "nodeId": NODE_ID,
        "lotId":  LOT_ID,
        "status": status,
    }

    try:
        response = requests.post(
            SERVER_URL,
            json=payload,
            timeout=REQUEST_TIMEOUT,
        )
        log.info("Response code: %d", response.status_code)
        log.info("Response body: %s", response.text)
    except requests.exceptions.ConnectionError:
        log.error("POST failed — could not reach %s", SERVER_URL)
    except requests.exceptions.Timeout:
        log.error("POST failed — request timed out after %ds", REQUEST_TIMEOUT)
    except requests.exceptions.RequestException as exc:
        log.error("POST failed — %s", exc)


def cleanup_gpio() -> None:
    """Release GPIO resources."""
    GPIO.cleanup()
    log.info("GPIO cleaned up.")


def main() -> None:
    setup_gpio()

    last_status: str | None = None

    try:
        while True:
            status = read_sensor()

            if status != last_status:
                log.info("Status changed: %s -> %s", last_status, status)
                send_status_update(status)
                last_status = status

            time.sleep(POLL_SECONDS)

    except KeyboardInterrupt:
        log.info("Interrupted by user.")

    finally:
        cleanup_gpio()


if __name__ == "__main__":
    main()
