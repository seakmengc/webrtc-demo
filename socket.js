const socket = require('socket.io');

const rooms = {};

exports.defineSockets = (server) => {
  const io = socket(server);
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
        socket.emit('other user', rooms[roomID]);
        socket.to(rooms[roomID]).emit('user joined', socket.id);
      }
    });

    socket.on('group chat', () => {
      const roomId = 'group-chat';
      console.log(
        `🚀  ${new Date().toLocaleString()} ~ file: server.js ~ line 12 ~ socket.on ~ roomId`,
        roomId
      );
      if (rooms[roomId]) {
        rooms[roomId].push(socket.id);
      } else {
        rooms[roomId] = [socket.id];
      }

      const socketIdsFiltered = rooms[roomId].filter((id) => id !== socket.id);

      socket.emit('other user', socketIdsFiltered);

      socket.to(socketIdsFiltered).emit('user joined', socket.id);
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
      console.log('disconnect', socket.id);
      for (const roomId in rooms) {
        const ind = rooms[roomId].indexOf(socket.id);

        if (ind !== -1) {
          rooms[roomId] = rooms[roomId].filter(
            (socketId) => socketId !== socket.id
          );

          console.log('emit left');
          io.to(rooms[roomId]).emit('left', socket.id);
        }
      }
    });
  });
};
