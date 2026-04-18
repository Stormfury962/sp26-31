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
HALL_SENSOR_PIN = 17  # BCM GPIO pin connected to the Hall Effect sensor

# ── Backend Configuration ──────────────────────────────────────────────────────
SERVER_URL = "http://your_app_endpoint/sensor/update"
NODE_ID    = "node-001"   # Unique ID for this sensor node
LOT_ID     = "lot-001"    # ID of the parking lot this sensor belongs to

# ── Timing ────────────────────────────────────────────────────────────────────
SLEEP_SECONDS = 3600  # 1 hour between readings
REQUEST_TIMEOUT = 10  # seconds before HTTP request times out


def setup_gpio() -> None:
    """Configure GPIO pins."""
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

    try:
        while True:
            status = read_sensor()
            send_status_update(status)

            log.info("Sleeping for %d seconds.", SLEEP_SECONDS)
            time.sleep(SLEEP_SECONDS)

    except KeyboardInterrupt:
        log.info("Interrupted by user.")

    finally:
        cleanup_gpio()


if __name__ == "__main__":
    main()
