
import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { io } from "socket.io-client";

import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
} from "@xyflow/react";

import { sensorStream, ruleEngine } from "./services/ruleEngine";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

import "@xyflow/react/dist/style.css";
import "./App.css";

const API_URL = "http://localhost:5000/api";
const SOCKET_URL = "http://localhost:5000";

// Workflow nodes
const initialNodes = [
  {
    id: "1",
    type: "input",
    position: { x: 100, y: 150 },
    data: { label: "Temperature Sensor" },
  },
  {
    id: "2",
    position: { x: 400, y: 150 },
    data: { label: "Moving Average Filter" },
  },
  {
    id: "3",
    type: "output",
    position: { x: 720, y: 150 },
    data: { label: "SMS Alert" },
  },
];

const initialEdges = [
  { id: "e1-2", source: "1", target: "2", animated: true },
  { id: "e2-3", source: "2", target: "3", animated: true },
];

function App() {
  const [page, setPage] = useState("dashboard");

  const [devices, setDevices] = useState([]);
  const [newDeviceName, setNewDeviceName] = useState("");
  const [deviceLoading, setDeviceLoading] = useState(false);
  const [deviceError, setDeviceError] = useState("");
  const [deviceMessage, setDeviceMessage] = useState("");

  const [temperature, setTemperature] = useState(75);
  const [humidity, setHumidity] = useState(45);
  const [isRunning, setIsRunning] = useState(false);

  const [readings, setReadings] = useState([]);
  const [alerts, setAlerts] = useState([]);

  const [nodes, setNodes, onNodesChange] =
    useNodesState(initialNodes);

  const [edges, setEdges, onEdgesChange] =
    useEdgesState(initialEdges);

  const [result, setResult] = useState(
    "Waiting for sensor data..."
  );

  // Prepare chart data
  const chartData = [...readings]
    .reverse()
    .map((reading) => ({
      time: reading.time,
      temperature: reading.temperature,
    }));

  // Load devices from MongoDB
  useEffect(() => {
    let isMounted = true;

    const loadDevices = async () => {
      setDeviceLoading(true);
      setDeviceError("");

      try {
        const response = await axios.get(`${API_URL}/devices`);

        if (isMounted) {
          setDevices(response.data.devices || []);
        }
      } catch (error) {
        if (isMounted) {
          setDeviceError(
            error.response?.data?.message ||
              "Could not load devices. Make sure the backend is running on port 5000."
          );
        }
      } finally {
        if (isMounted) {
          setDeviceLoading(false);
        }
      }
    };

    loadDevices();

    return () => {
      isMounted = false;
    };
  }, []);

  // Socket.IO connection for real-time device updates
  useEffect(() => {
    const socket = io(SOCKET_URL);

    socket.on("connect", () => {
      console.log(
        "Connected to NexusFlow backend:",
        socket.id
      );
    });

    socket.on("connect_error", (error) => {
      console.error(
        "Socket connection error:",
        error.message
      );
    });

    // Receive newly created devices
    socket.on("device:created", (device) => {
      setDevices((previous) => [
        device,
        ...previous.filter(
          (item) => item._id !== device._id
        ),
      ]);
    });

    // Receive updated devices
    socket.on("device:updated", (updatedDevice) => {
      setDevices((previous) =>
        previous.map((item) =>
          item._id === updatedDevice._id
            ? updatedDevice
            : item
        )
      );
    });

    // Receive deleted devices
    socket.on("device:deleted", ({ id }) => {
      setDevices((previous) =>
        previous.filter((device) => device._id !== id)
      );
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  // Add device to MongoDB
  const addDevice = async () => {
    const name = newDeviceName.trim();

    if (!name) {
      setDeviceError("Please enter a device name.");
      return;
    }

    setDeviceError("");
    setDeviceMessage("");

    try {
      const response = await axios.post(
        `${API_URL}/devices`,
        {
          name,
          type: "IoT Sensor",
          location: "New Location",
        }
      );

      const newDevice = response.data.device;

      setDevices((previous) => [
        newDevice,
        ...previous.filter(
          (item) => item._id !== newDevice._id
        ),
      ]);

      setNewDeviceName("");
      setDeviceMessage("Device added successfully.");
    } catch (error) {
      setDeviceError(
        error.response?.data?.message ||
          "Could not add the device."
      );
    }
  };

  // Update device status in MongoDB
  const toggleDeviceStatus = async (device) => {
    const nextStatus =
      device.status === "Online" ? "Offline" : "Online";

    setDeviceError("");
    setDeviceMessage("");

    try {
      const response = await axios.put(
        `${API_URL}/devices/${device._id}`,
        { status: nextStatus }
      );

      setDevices((previous) =>
        previous.map((item) =>
          item._id === device._id
            ? response.data.device
            : item
        )
      );

      setDeviceMessage(
        `${device.name} is now ${nextStatus}.`
      );
    } catch (error) {
      setDeviceError(
        error.response?.data?.message ||
          "Could not update device status."
      );
    }
  };

  // Delete device from MongoDB
  const deleteDevice = async (deviceId) => {
    setDeviceError("");
    setDeviceMessage("");

    try {
      await axios.delete(
        `${API_URL}/devices/${deviceId}`
      );

      setDevices((previous) =>
        previous.filter(
          (device) => device._id !== deviceId
        )
      );

      setDeviceMessage("Device removed successfully.");
    } catch (error) {
      setDeviceError(
        error.response?.data?.message ||
          "Could not remove the device."
      );
    }
  };

  // Subscribe to RxJS rule engine
  useEffect(() => {
    const subscription = ruleEngine.subscribe(
      (ruleResult) => {
        setResult(
          ruleResult.alert
            ? `WARNING: ${ruleResult.message} Average: ${ruleResult.average}°C`
            : `SUCCESS: ${ruleResult.message} Average: ${ruleResult.average}°C`
        );

        if (ruleResult.alert) {
          setAlerts((previous) =>
            [
              `High average temperature: ${ruleResult.average}°C`,
              ...previous,
            ].slice(0, 8)
          );
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // Connect workflow nodes
  const onConnect = useCallback(
    (connection) => {
      setEdges((oldEdges) =>
        addEdge(
          { ...connection, animated: true },
          oldEdges
        )
      );
    },
    [setEdges]
  );

  // Add workflow node
  const addNode = (label, type = "default") => {
    setNodes((oldNodes) => [
      ...oldNodes,
      {
        id: String(Date.now()),
        type,
        position: {
          x: 150 + Math.random() * 300,
          y: 300 + Math.random() * 150,
        },
        data: { label },
      },
    ]);
  };

  // Generate sensor readings
  const generateReading = useCallback(() => {
    const newTemperature = Math.floor(
      60 + Math.random() * 41
    );

    const newHumidity = Math.floor(
      30 + Math.random() * 51
    );

    setTemperature(newTemperature);
    setHumidity(newHumidity);

    const reading = {
      id: Date.now(),
      temperature: newTemperature,
      humidity: newHumidity,
      time: new Date().toLocaleTimeString(),
    };

    setReadings((previous) =>
      [reading, ...previous].slice(0, 8)
    );

    // Send temperature to RxJS
    sensorStream.next(newTemperature);
  }, []);

  // Automatically generate readings every 2 seconds
  useEffect(() => {
    if (!isRunning) return;

    const timer = setInterval(
      generateReading,
      2000
    );

    return () => clearInterval(timer);
  }, [isRunning, generateReading]);

  return (
    <div className="app">
      <aside className="sidebar">
        <h2>NexusFlow</h2>
        <p className="tagline">IoT Rule Engine</p>

        <div
          className={`menu ${
            page === "dashboard" ? "active" : ""
          }`}
          onClick={() => setPage("dashboard")}
        >
          Dashboard
        </div>

        <div
          className={`menu ${
            page === "workflow" ? "active" : ""
          }`}
          onClick={() => setPage("workflow")}
        >
          Workflows
        </div>

        <div
          className={`menu ${
            page === "telemetry" ? "active" : ""
          }`}
          onClick={() => setPage("telemetry")}
        >
          Telemetry
        </div>

        <div
          className={`menu ${
            page === "alerts" ? "active" : ""
          }`}
          onClick={() => setPage("alerts")}
        >
          Alerts
        </div>

        <div
          className={`menu ${
            page === "devices" ? "active" : ""
          }`}
          onClick={() => setPage("devices")}
        >
          Devices
        </div>
      </aside>

      <main className="main">

        {/* DASHBOARD */}
        {page === "dashboard" && (
          <>
            <header>
              <div>
                <h1>Dashboard</h1>
                <p>Monitor your IoT devices.</p>
              </div>

              <span className="status">
                System Online
              </span>
            </header>

            <section className="cards">
              <div className="card">
                <p>Total Devices</p>
                <h2>{devices.length}</h2>
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
              <h2>Live Temperature Chart</h2>

              {chartData.length === 0 ? (
                <p>
                  No sensor data yet. Start the sensor
                  to see the chart.
                </p>
              ) : (
                <ResponsiveContainer
                  width="100%"
                  height={300}
                >
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis domain={[50, 105]} />
                    <Tooltip />

                    <Line
                      type="monotone"
                      dataKey="temperature"
                      stroke="#2563eb"
                      strokeWidth={3}
                      dot={true}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </section>

            <section className="panel">
              <h2>Live Sensor Simulation</h2>

              <p>
                Start the sensor to generate automatic
                readings.
              </p>

              <div className="sensor-cards">
                <div className="sensor-box">
                  <span>Temperature</span>
                  <h2>{temperature}°C</h2>
                </div>

                <div className="sensor-box">
                  <span>Humidity</span>
                  <h2>{humidity}%</h2>
                </div>
              </div>

              <button
                onClick={() =>
                  setIsRunning(!isRunning)
                }
              >
                {isRunning
                  ? "Stop Sensor"
                  : "Start Sensor"}
              </button>

              <button
                onClick={generateReading}
                disabled={isRunning}
              >
                Generate Reading
              </button>

              <p className="hint">
                Rule: Average of the latest 5 readings
                greater than 80°C
              </p>

              <div className="result">
                {result}
              </div>
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
          </>
        )}

        {/* WORKFLOW */}
        {page === "workflow" && (
          <>
            <header>
              <div>
                <h1>Visual Workflow Builder</h1>
                <p>
                  Create your IoT automation pipeline.
                </p>
              </div>

              <span className="status">
                Editor Ready
              </span>
            </header>

            <section className="panel">
              <h2>Node Library</h2>

              <div className="node-buttons">
                <button
                  onClick={() =>
                    addNode("Temperature Sensor", "input")
                  }
                >
                  + Sensor
                </button>

                <button
                  onClick={() => addNode("Filter")}
                >
                  + Filter
                </button>

                <button
                  onClick={() =>
                    addNode("Alert", "output")
                  }
                >
                  + Alert
                </button>
              </div>
            </section>

            <section className="workflow-canvas">
              <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                fitView
              >
                <Background />
                <Controls />
                <MiniMap />
              </ReactFlow>
            </section>
          </>
        )}

        {/* TELEMETRY */}
        {page === "telemetry" && (
          <>
            <header>
              <div>
                <h1>Telemetry</h1>
                <p>Live IoT sensor readings.</p>
              </div>
            </header>

            <section className="panel">
              <h2>Latest Readings</h2>

              <p>Temperature: {temperature}°C</p>
              <p>Humidity: {humidity}%</p>

              <p>
                Sensor status:{" "}
                {isRunning ? "Running" : "Stopped"}
              </p>
            </section>

            <section className="panel">
              <h2>Reading History</h2>

              {readings.length === 0 ? (
                <p>
                  No readings yet. Start the sensor.
                </p>
              ) : (
                readings.map((reading) => (
                  <div
                    className="reading"
                    key={reading.id}
                  >
                    <strong>{reading.time}</strong>
                    {" | "}
                    Temperature: {reading.temperature}°C
                    {" | "}
                    Humidity: {reading.humidity}%
                  </div>
                ))
              )}
            </section>
          </>
        )}

        {/* ALERTS */}
        {page === "alerts" && (
          <>
            <header>
              <div>
                <h1>Alerts</h1>
                <p>Monitor temperature warnings.</p>
              </div>
            </header>

            <section className="panel">
              <h2>Alert History</h2>

              {alerts.length === 0 ? (
                <p>No alerts available.</p>
              ) : (
                alerts.map((alert, index) => (
                  <div className="alert" key={index}>
                    {alert}
                  </div>
                ))
              )}
            </section>
          </>
        )}

        {/* DEVICES */}
        {page === "devices" && (
          <>
            <header>
              <div>
                <h1>Device Management</h1>
                <p>
                  Manage your connected IoT devices.
                </p>
              </div>

              <span className="status">
                Device Center
              </span>
            </header>

            <section className="cards">
              <div className="card">
                <p>Total Devices</p>
                <h2>{devices.length}</h2>
              </div>

              <div className="card">
                <p>Online Devices</p>
                <h2>
                  {
                    devices.filter(
                      (d) => d.status === "Online"
                    ).length
                  }
                </h2>
              </div>

              <div className="card">
                <p>Offline Devices</p>
                <h2>
                  {
                    devices.filter(
                      (d) => d.status === "Offline"
                    ).length
                  }
                </h2>
              </div>
            </section>

            <section className="panel">
              <h2>Register New Device</h2>

              <input
                type="text"
                placeholder="Enter device name"
                value={newDeviceName}
                onChange={(e) =>
                  setNewDeviceName(e.target.value)
                }
              />

              <button
                onClick={addDevice}
                disabled={deviceLoading}
              >
                + Add Device
              </button>

              {deviceError && (
                <p className="alert">{deviceError}</p>
              )}

              {deviceMessage && (
                <p className="result">
                  {deviceMessage}
                </p>
              )}
            </section>

            <section className="panel">
              <h2>Registered Devices</h2>

              {deviceLoading && (
                <p>Loading devices from the backend...</p>
              )}

              {!deviceLoading &&
                devices.length === 0 &&
                !deviceError && (
                  <p>
                    No devices registered yet.
                    Add your first device above.
                  </p>
                )}

              {devices.map((device) => (
                <div
                  className="reading"
                  key={device._id}
                >
                  <strong>{device.name}</strong>

                  <p>{device.type}</p>

                  <p>
                    Location: {device.location}
                  </p>

                  <p>
                    Status:{" "}
                    <strong>
                      {device.status === "Online"
                        ? "Online"
                        : "Offline"}
                    </strong>
                  </p>

                  <button
                    onClick={() =>
                      toggleDeviceStatus(device)
                    }
                    disabled={deviceLoading}
                  >
                    Toggle Status
                  </button>

                  <button
                    onClick={() =>
                      deleteDevice(device._id)
                    }
                    disabled={deviceLoading}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </section>
          </>
        )}

      </main>
    </div>
  );
}

export default App;
