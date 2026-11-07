# NexusFlow
### Visual IoT Telemetry and Rule Engine using MERN Stack

NexusFlow is a web-based IoT monitoring dashboard designed to manage devices, monitor sensor telemetry, visualize data, and generate alerts based on predefined rules.

## Features

- **Device Management:** Add, view, update, and delete IoT devices.
- **Dashboard:** View device information and monitoring data.
- **Real-Time Communication:** Uses Socket.IO for device event updates.
- **Telemetry Processing:** Uses RxJS to process sensor readings.
- **Rule Engine:** Evaluates sensor readings and generates alerts when configured conditions are met.
- **Data Visualization:** Displays monitoring information through charts and workflow views.
- **Database Integration:** Stores device information in MongoDB.

## Technologies Used

- Frontend: React.js, Vite
- Backend: Node.js, Express.js
- Database: MongoDB
- Real-Time Communication: Socket.IO
- Reactive Programming: RxJS
- Visualization: Recharts, React Flow
- API Communication: Axios

## Project Structure

```text
NexusFlow/
├── client/
│   ├── src/
│   └── package.json
├── server/
│   ├── server.js
│   └── package.json
├── .gitignore
└── README.md
```

## Installation and Setup

### 1. Clone the repository

```bash
git clone https://github.com/priya3922/NexusFlow.git
cd NexusFlow
```

### 2. Install frontend dependencies

```bash
cd client
npm install
```

### 3. Install backend dependencies

Open another terminal:

```bash
cd server
npm install
```

### 4. Configure environment variables

Create a `.env` file inside the `server` folder:

```env
MONGO_URI=your_mongodb_connection_string
PORT=5000
```

Use your own MongoDB connection string. Never upload your `.env` file.

### 5. Run the backend

From the `server` folder, use the start command defined in `server/package.json`.

### 6. Run the frontend

From the `client` folder:

```bash
npm run dev
```

Open the local URL displayed by Vite in your browser.

## GitHub Repository

https://github.com/priya3922/NexusFlow

## Project Purpose

NexusFlow demonstrates how IoT device data can be managed, processed, visualized, and monitored through a web-based application using the MERN stack and real-time technologies.