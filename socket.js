const socket = require('socket.io');
const { createOfferFor } = require('./webrtc_utils');

const rooms = {};

exports.defineSockets = (server, broadcastStreams, peers) => {
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
        socket.emit('other user', otherUser);
        socket.to(otherUser).emit('user joined', socket.id);
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

    socket.on('sfu group chat', async () => {
      const roomId = 'sfu-group-chat';
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
      console.log(
        `🚀  ${new Date().toLocaleString()} ~ socket.on ~ socketIdsFiltered`,
        socketIdsFiltered
      );
      console.log('on group', broadcastStreams);
      socket.emit(
        'other user',
        socketIdsFiltered.map((socketId) => {
          return {
            id: socketId,
          };
        })
      );

      socket.to(socketIdsFiltered).emit('user joined', {
        id: socket.id,
      });

      // socket.emit(
      //   'other user',
      //   await Promise.all(
      //     socketIdsFiltered
      //       .filter((socketId) => broadcastStreams[socketId] !== undefined)
      //       .map((socketId) => {
      //         return new Promise(async (resolve, reject) => {
      //           const offer = await createOfferFor(
      //             broadcastStreams[socketId],
      //             peers,
      //             socketId
      //           );
      //           resolve({
      //             id: socketId,
      //             sdp: offer.localDescription,
      //           });
      //         });
      //       })
      //   )
      // );

      // if (!broadcastStreams[socket.id]) {
      //   return;
      // }

      // const offer = await createOfferFor(
      //   broadcastStreams[socket.id],
      //   peers,
      //   socket.id
      // );
      // socket.to(socketIdsFiltered).emit('user joined', {
      //   id: socket.id,
      //   sdp: offer.localDescription,
      // });
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

      delete broadcastStreams[socket.id];
    });
  });

  return io;
};
