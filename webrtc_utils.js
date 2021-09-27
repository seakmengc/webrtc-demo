const webrtc = require('wrtc');

const iceServers = [
  {
    urls: 'stun:stun.stunprotocol.org',
  },
];

exports.createOfferFor = async (stream) => {
  const peer = new webrtc.RTCPeerConnection({
    iceServers,
  });

  stream.getTracks().forEach((track) => peer.addTrack(track, stream));

  const offer = await peer.createOffer();
  await peer.setLocalDescription(offer);

  return peer;
};
