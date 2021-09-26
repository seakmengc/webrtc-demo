const express = require('express');
const http = require('http');
const app = express();
const server = http.createServer(app);
const socket = require('socket.io');
const io = socket(server);

const rooms = {};

io.on('connection', (socket) => {
  socket.on('join room', (roomID) => {
    console.log(
      `🚀  ${new Date().toLocaleString()} ~ file: server.js ~ line 12 ~ socket.on ~ roomID`,
      roomID
    );
    if (rooms[roomID]) {
      rooms[roomID].push(socket.id);
    } else {
      rooms[roomID] = [socket.id];
    }
    const otherUser = rooms[roomID].find((id) => id !== socket.id);
    if (otherUser) {
      socket.emit('other user', otherUser);
      socket.to(otherUser).emit('user joined', socket.id);
    }
  });

  socket.on('offer', (payload) => {
    console.log(
      `🚀  ${new Date().toLocaleString()} ~ file: server.js ~ line 26 ~ offer ~ payload`,
      { ...payload, sdp: undefined }
    );

    io.to(payload.target).emit('offer', payload);
  });

  socket.on('answer', (payload) => {
    console.log(
      `🚀  ${new Date().toLocaleString()} ~ file: server.js ~ line 31 ~ answer ~ payload`,
      { ...payload, sdp: undefined }
    );
    io.to(payload.target).emit('answer', payload);
  });

  socket.on('ice-candidate', (incoming) => {
    console.log(
      `🚀  ${new Date().toLocaleString()} ~ file: server.js ~ line 36 ~ ice-candidate ~ incoming`,
      incoming
    );
    io.to(incoming.target).emit('ice-candidate', incoming.candidate);
  });

  socket.on('disconnect', function () {
    for (const roomId in rooms) {
      rooms[roomId] = rooms[roomId].filter(
        (socketId) => socketId !== socket.id
      );
    }
  });
});

server.listen(8000, () => console.log('server is running on port 8000'));
