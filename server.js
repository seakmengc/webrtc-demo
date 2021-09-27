const express = require('express');
const http = require('http');
const app = express();
const server = http.createServer(app);

const webrtc = require('wrtc');

const { defineSockets } = require('./socket');

defineSockets(server);

// const iceServers = [
//   {
//     urls: 'stun:stun.stunprotocol.org',
//   },
// ];

// app.post('/consumer', async ({ body }, res) => {
//   const peer = new webrtc.RTCPeerConnection({
//     iceServers,
//   });
//   const desc = new webrtc.RTCSessionDescription(body.sdp);
//   await peer.setRemoteDescription(desc);
//   senderStream
//     .getTracks()
//     .forEach((track) => peer.addTrack(track, senderStream));
//   const answer = await peer.createAnswer();
//   await peer.setLocalDescription(answer);
//   const payload = {
//     sdp: peer.localDescription,
//   };

//   res.json(payload);
// });

// app.post('/broadcast', async ({ body }, res) => {
//   const peer = new webrtc.RTCPeerConnection({
//     iceServers,
//   });

//   peer.ontrack = (e) => handleTrackEvent(e, peer);

//   const desc = new webrtc.RTCSessionDescription(body.sdp);
//   await peer.setRemoteDescription(desc);
//   const answer = await peer.createAnswer();
//   await peer.setLocalDescription(answer);
//   const payload = {
//     sdp: peer.localDescription,
//   };

//   res.json(payload);
// });

server.listen(8000, () => console.log('server is running on port 8000'));
