const express = require('express');
const http = require('http');
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

const server = http.createServer(app);

const webrtc = require('wrtc');

const { defineSockets } = require('./socket');
const broadcastStreams = [];

const iceServers = [
  // {
  //   urls: 'stun:stun.stunprotocol.org',
  // },
  {
    urls: 'turn:159.89.207.18:3478',
    username: 'iebuy',
    credential: 'Ypi7inHzPjtsYbZWCISB8thPqdY0cV0T',
  },
];

const io = defineSockets(server, broadcastStreams);

function handleTrackEvent({ transceiver, streams }, id) {
  const stream = streams[0];
  console.log('🚀 handleTrackEvent ~ e');

  //When other peer stop the camera or mic
  transceiver.receiver.track.onmute = () => {
    console.log('transceiver.receiver.track.onmute');

    // remoteVideo.current.srcObject.removeTrack(transceiver.receiver.track);
    // updateSrcObject(remoteVideo, undefined, setRemoteVideoTracksTxt);

    // console.log(remoteVideo.current.srcObject?.getTracks());
  };

  //when other peer replace track
  transceiver.receiver.track.onunmute = () => {
    if (!broadcastStreams[id]) {
      return;
    }

    console.log('transceiver.receiver.track.onunmute');

    stream.getTracks().forEach((track) => broadcastStreams[id].push(track));
  };
  if (stream) {
    broadcastStreams[id] = stream;
    console.log(stream.getTracks().map((track) => track.kind));
  }
}

app.post('/broadcast', async ({ body }, res) => {
  console.log(body.caller);
  const id = body.caller;
  console.log(`🚀  ${new Date().toLocaleString()} ~ broadcast`, id);

  const peer = new webrtc.RTCPeerConnection({
    iceServers,
  });

  broadcastStreams[id] = [];
  peer.ontrack = (e) => handleTrackEvent(e, id);

  const desc = new webrtc.RTCSessionDescription(body.sdp);
  await peer.setRemoteDescription(desc);
  console.log(`🚀  ${new Date().toLocaleString()} ~ broadcast`, desc);

  const answer = await peer.createAnswer();
  await peer.setLocalDescription(answer);
  const payload = {
    sdp: peer.localDescription,
  };

  res.json(payload);
});

app.post('/consumer', async ({ body }, res) => {
  console.log('want to consume', body.target);
  console.log('from', body.caller);

  const peer = new webrtc.RTCPeerConnection({
    iceServers,
  });

  const desc = new webrtc.RTCSessionDescription(body.sdp);

  await peer.setRemoteDescription(desc);

  broadcastStreams[body.target]
    .getTracks()
    .forEach((track) => peer.addTrack(track, broadcastStreams[body.target]));

  const answer = await peer.createAnswer();
  await peer.setLocalDescription(answer);

  const payload = {
    sdp: peer.localDescription,
    streams: broadcastStreams[body.target],
  };
  console.log(broadcastStreams[body.target].getTracks()[0]);

  res.json(payload);
});

server.listen(8000, () => console.log('server is running on port 8000'));
