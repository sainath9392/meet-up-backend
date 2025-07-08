import express from "express";
import http from "http";
import cors from "cors";
import { Server } from "socket.io";

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173", // Adjust for production
    methods: ["GET", "POST"],
  },
});

const rooms = {}; // { roomId: Set(socketIds) }

io.on("connection", (socket) => {
  console.log("🔌 Client connected:", socket.id);

  socket.on("join_room", (roomId) => {
    socket.join(roomId);
    console.log(`📥 ${socket.id} joined room ${roomId}`);

    if (!rooms[roomId]) {
      rooms[roomId] = new Set();
    }

    const peers = Array.from(rooms[roomId]);
    rooms[roomId].add(socket.id);

    const otherUser = peers[0]; // Only 1-to-1 room setup
    if (otherUser) {
      io.to(otherUser).emit("user_joined", socket.id);
    }
  });

  socket.on("sending_signal", ({ userToSignal, signal, from }) => {
    io.to(userToSignal).emit("user_joined_late", {
      signal,
      from,
    });
  });

  socket.on("returning_signal", ({ signal, to }) => {
    io.to(to).emit("receiving_returned_signal", {
      signal,
      from: socket.id,
    });
  });

  socket.on("send_caption", ({ roomId, caption }) => {
    socket.to(roomId).emit("receive_caption", caption);
  });

  socket.on("disconnecting", () => {
    for (const roomId of socket.rooms) {
      if (rooms[roomId]) {
        rooms[roomId].delete(socket.id);

        // Notify remaining peer (if any)
        for (const peerId of rooms[roomId]) {
          io.to(peerId).emit("user_left", socket.id);
        }

        // Cleanup
        if (rooms[roomId].size === 0) {
          delete rooms[roomId];
        }
      }
    }

    console.log("❌ Disconnected:", socket.id);
  });
});

server.listen(5000, () => {
  console.log("✅ Server running at http://localhost:5000");
});
