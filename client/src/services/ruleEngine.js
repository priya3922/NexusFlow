
import { Subject } from "rxjs";
import { bufferCount, map } from "rxjs/operators";

// Create sensor data stream
export const sensorStream = new Subject();

// Create rule engine
export const ruleEngine = sensorStream.pipe(
  bufferCount(5,1),
  map((readings) => {
    const average =
      readings.reduce((total, value) => total + value, 0) /
      readings.length;

    return {
      readings,
      average: Number(average.toFixed(2)),
      alert: average > 80,
      message:
        average > 80
          ? "High temperature detected!"
          : "Temperature is normal.",
    };
  })
);
