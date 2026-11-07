
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST", "PUT", "DELETE"]
  }
});

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;

// WebSocket connection
io.on("connection", (socket) => {
  console.log("Frontend connected:", socket.id);

  socket.on("disconnect", () => {
    console.log("Frontend disconnected:", socket.id);
  });
});

// Device database model
const deviceSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    default: "IoT Sensor"
  },
  location: {
    type: String,
    default: "Unknown"
  },
  status: {
    type: String,
    enum: ["Online", "Offline"],
    default: "Online"
  }
}, { timestamps: true });

const Device = mongoose.model("Device", deviceSchema);

// Home route
app.get("/", (req, res) => {
  res.send("NexusFlow Backend is running!");
});

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "NexusFlow server is running"
  });
});

// Get devices
app.get("/api/devices", async (req, res) => {
  try {
    const devices = await Device.find().sort({ createdAt: -1 });

    res.json({
      success: true,
      count: devices.length,
      devices
    });
  } catch (error) {
    console.error("GET DEVICES ERROR:", error);
    res.status(500).json({
      success: false,
      message: "Could not retrieve devices"
    });
  }
});

// Add device
app.post("/api/devices", async (req, res) => {
  try {
    const { name, type, location } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Device name is required"
      });
    }

    const device = await Device.create({
      name,
      type,
      location
    });

    io.emit("device:created", device);

    res.status(201).json({
      success: true,
      device
    });
  } catch (error) {
    console.error("ADD DEVICE ERROR:", error);
    res.status(500).json({
      success: false,
      message: "Could not add device"
    });
  }
});

// Update device
app.put("/api/devices/:id", async (req, res) => {
  try {
    const { status } = req.body;

    if (!["Online", "Offline"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid device status"
      });
    }

    const device = await Device.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true }
    );

    if (!device) {
      return res.status(404).json({
        success: false,
        message: "Device not found"
      });
    }

    io.emit("device:updated", device);

    res.json({
      success: true,
      device
    });
  } catch (error) {
    console.error("UPDATE DEVICE ERROR:", error);
    res.status(400).json({
      success: false,
      message: "Could not update device"
    });
  }
});

// Delete device
app.delete("/api/devices/:id", async (req, res) => {
  try {
    const device = await Device.findByIdAndDelete(req.params.id);

    if (!device) {
      return res.status(404).json({
        success: false,
        message: "Device not found"
      });
    }

    io.emit("device:deleted", {
      id: req.params.id
    });

    res.json({
      success: true,
      message: "Device deleted successfully"
    });
  } catch (error) {
    console.error("DELETE DEVICE ERROR:", error);
    res.status(400).json({
      success: false,
      message: "Could not delete device"
    });
  }
});

// Connect MongoDB and start HTTP + WebSocket server
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB connected successfully!");

    server.listen(PORT, () => {
      console.log(`NexusFlow backend running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error("MongoDB connection failed:", error.message);
  });
