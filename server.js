const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

let waitingUser = null;

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('start-searching', () => {
    leaveChat(socket);

    if (waitingUser && waitingUser.id !== socket.id) {
      const roomName = `room_${socket.id}_${waitingUser.id}`;
      socket.join(roomName);
      waitingUser.join(roomName);

      io.to(roomName).emit('matched');
      waitingUser = null;
    } else {
      waitingUser = socket;
      socket.emit('waiting');
    }
  });

  socket.on('message', (data) => {
    socket.rooms.forEach((room) => {
      if (room !== socket.id) {
        socket.to(room).emit('message', data);
      }
    });
  });

  socket.on('typing', (isTyping) => {
    socket.rooms.forEach((room) => {
      if (room !== socket.id) {
        socket.to(room).emit('typing', isTyping);
      }
    });
  });

  socket.on('skip', () => {
    leaveChat(socket);
  });

  socket.on('disconnect', () => {
    if (waitingUser === socket) {
      waitingUser = null;
    }
    leaveChat(socket);
    console.log('User disconnected:', socket.id);
  });
});

function leaveChat(socket) {
  socket.rooms.forEach((room) => {
    if (room !== socket.id) {
      socket.to(room).emit('partner-disconnected');
      socket.leave(room);
    }
  });
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
