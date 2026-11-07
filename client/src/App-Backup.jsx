
import { useState } from "react";
import "./App.css";

function App() {
  const [temperature, setTemperature] = useState(75);
  const [alerts, setAlerts] = useState([]);

  const checkTemperature = () => {
    if (temperature > 80) {
      setAlerts((previous) => [
        `High temperature detected: ${temperature}°C`,
        ...previous,
      ]);
    } else {
      setAlerts((previous) => [
        `Temperature normal: ${temperature}°C`,
        ...previous,
      ]);
    }
  };

  return (
    <div className="app">
      <aside className="sidebar">
        <h2>⚡ NexusFlow</h2>
        <p className="tagline">IoT Rule Engine</p>

        <div className="menu active">Dashboard</div>
        <div className="menu">Workflows</div>
        <div className="menu">Telemetry</div>
        <div className="menu">Alerts</div>
      </aside>

      <main className="main">
        <header>
          <div>
            <h1>Dashboard</h1>
            <p>Monitor your IoT devices in real time.</p>
          </div>
          <span className="status">● System Online</span>
        </header>

        <section className="cards">
          <div className="card">
            <p>Total Devices</p>
            <h2>01</h2>
          </div>

          <div className="card">
            <p>Temperature</p>
            <h2>{temperature}°C</h2>
          </div>

          <div className="card">
            <p>Total Alerts</p>
            <h2>{alerts.length}</h2>
          </div>
        </section>

        <section className="panel">
          <h2>Sensor Simulation</h2>
          <p>Adjust the turbine temperature and test the rule engine.</p>

          <input
            type="range"
            min="0"
            max="120"
            value={temperature}
            onChange={(e) => setTemperature(Number(e.target.value))}
          />

          <h2>{temperature}°C</h2>

          <button onClick={checkTemperature}>
            Check Temperature
          </button>

          <p className="hint">
            Alert rule: Temperature greater than 80°C
          </p>
        </section>

        <section className="panel">
          <h2>Recent Alerts</h2>

          {alerts.length === 0 ? (
            <p>No alerts generated yet.</p>
          ) : (
            alerts.map((alert, index) => (
              <div className="alert" key={index}>
                {alert}
              </div>
            ))
          )}
        </section>
      </main>
    </div>
  );
}

export default App;
