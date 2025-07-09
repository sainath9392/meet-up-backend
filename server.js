import express from "express";
import http from "http";
import cors from "cors";
import { Server } from "socket.io";

const app = express();
app.use(cors({
  origin: "http://localhost:5173",
  methods: ["GET", "POST"],
  credentials: true
}));
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
  },
});

const rooms = {};

io.on("connection", (socket) => {
  console.log("🔌 Client connected:", socket.id);

  socket.on("join_room", (roomId) => {
    socket.join(roomId);
    if (!rooms[roomId]) rooms[roomId] = new Set();
    const peers = Array.from(rooms[roomId]);

    if (peers.length === 0) {
      rooms[roomId].add(socket.id);
      socket.emit("init_role", { initiator: true, peerId: null }); // <--- add peerId: null
    } else {
      const otherUser = peers[0];
      rooms[roomId].add(socket.id);
      socket.emit("init_role", { initiator: false, peerId: otherUser });
      io.to(otherUser).emit("user_joined", socket.id);
    }
  });

  // ✅ ADD THIS:
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

        for (const peerId of rooms[roomId]) {
          io.to(peerId).emit("user_left", socket.id);
        }

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
