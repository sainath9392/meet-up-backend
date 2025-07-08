const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");

const app = express();
app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*", // or your frontend URL
    methods: ["GET", "POST"]
  }
});

io.on("connection", (socket) => {
  console.log("✅ New connection:", socket.id);

  // 🔑 Join a specific room
  socket.on("join_room", (roomId) => {
    socket.join(roomId);
    console.log(`User ${socket.id} joined room: ${roomId}`);
  });

  // 📤 Receive caption and broadcast to same room
  socket.on("send_caption", ({ roomId, caption }) => {
    socket.to(roomId).emit("receive_caption", caption);
  });

  socket.on("disconnect", () => {
    console.log("❌ Disconnected:", socket.id);
  });
});

server.listen(5000, () => {
  console.log("🚀 Server listening on http://localhost:5000");
});
