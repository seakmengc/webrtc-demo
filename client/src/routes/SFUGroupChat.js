import React, { useRef, useEffect, useState } from 'react';
import io from 'socket.io-client';
import { v1 as uuid } from 'uuid';
import styled from 'styled-components';
import Peer from 'simple-peer';
import axios from 'axios';

const StyledVideo = styled.video`
  height: 40%;
  width: 50%;
`;

const Video = (props) => {
  const ref = useRef();
  const [txt, setTxt] = useState('');

  useEffect(() => {
    // props.peer.on('stream', (stream) => {
    //   console.log('on stream');
    //   ref.current.srcObject = stream;
    // });

    props.peer.ontrack = ({ transceiver, streams }) => {
      console.log(
        `🚀  ${new Date().toLocaleString()} ~ useEffect ~ streams`,
        streams[0].getTracks(),
        transceiver
      );

      ref.current.srcObject = streams[0];

      console.log(
        'on track',
        ref.current.srcObject
          .getTracks()
          .filter((track) => track.readyState === 'live')
          .filter((track) => !track.muted)
          .filter((track) => track.enabled)
          .map((track) => track.kind)
          .join(', ')
      );
      setTxt(
        ref.current.srcObject
          .getTracks()
          .map((track) => track.kind)
          .join(', ')
      );
    };
  }, []);

  return (
    <span>
      <StyledVideo playsInline autoPlay ref={ref} />
      <p>{txt}</p>
    </span>
  );
};

export default (props) => {
  const localStream = useRef();
  const localVideo = useRef();

  //socket
  const localSocket = useRef();

  //peer
  const remotePeers = useRef([]);

  let [peerSockets, setPeerSockets] = useState([]);

  let [enabledAudio, setEnabledAudio] = useState(true);
  let [enabledVideo, setEnabledVideo] = useState(true);

  const verbose = false;

  const iceServers = [
    {
      urls: 'stun:stun.stunprotocol.org',
    },
  ];

  useEffect(() => {
    setStreamingDevice({ audio: enabledAudio, video: enabledVideo }).then(
      () => {
        localSocket.current = io('http://127.0.0.1:8000');

        localSocket.current.on('connect', async () => {
          console.log('on connect', localSocket.current.id);
          await broadcastStreams(
            localSocket.current.id,
            localVideo.current.srcObject
          );

          localSocket.current.emit('sfu group chat');
        });

        localSocket.current.on('other user', (payloads) => {
          console.log(
            `🚀  ${new Date().toLocaleString()} ~ on other user`,
            payloads
          );

          const peers = [];
          payloads.forEach((payload) => {
            const peer = handlePayload(payload);

            peers.push(peer);
          });

          setPeerSockets(peers);
        });

        localSocket.current.on('user joined', (payload) => {
          console.log(
            `🚀  ${new Date().toLocaleString()} ~ on user joined`,
            payload
          );

          const peer = handlePayload(payload);
          setPeerSockets((peers) => [...peers, peer]);
        });

        localSocket.current.on('left', (socketId) => {
          console.log(
            `🚀  ${new Date().toLocaleString()} ~ localSocket.current.on ~ left`,
            socketId
          );

          const item = remotePeers.current.find((p) => p.id === socketId);

          if (item) {
            item.peer.close();

            remotePeers.current = remotePeers.current.filter(
              (p) => p.id !== socketId
            );

            setPeerSockets(peerSockets.filter((id) => id !== socketId));
          }
        });
      }
    );

    return function () {
      localSocket.current.disconnect();
    };
  }, []);

  async function setStreamingDevice(configs = { audio: true, video: true }) {
    return navigator.mediaDevices
      .getUserMedia({ audio: true, video: true })
      .then((stream) => {
        if (verbose) {
          console.log(
            '🚀 ~ file: Room.js ~ line 16 ~ .then ~ stream',
            stream,
            stream.getTracks()
          );
        }

        if (!configs.audio) {
          stream.getAudioTracks()[0].stop();
        }

        if (!configs.video) {
          stream.getVideoTracks()[0].stop();
        }

        // updateSrcObject(localVideo, stream, setLocalVideoTracksTxt);
        localVideo.current.srcObject = stream;

        localStream.current = stream;
      });
  }

  async function broadcastStreams(socketId, stream, afterBroadcastCB) {
    const peer = new RTCPeerConnection({
      iceServers,
    });

    peer.onnegotiationneeded = () =>
      handleNegotiationNeededEvent(true, peer, socketId);

    stream.getTracks().forEach((track) => peer.addTrack(track, stream));

    peer.addTransceiver('video', { direction: 'sendonly' });
    peer.addTransceiver('audio', { direction: 'sendonly' });

    return peer;
  }

  function createPeer(mySocketId, toReceiverVideoSocketId) {
    const peer = new RTCPeerConnection({
      iceServers,
    });

    peer.onnegotiationneeded = () =>
      handleNegotiationNeededEvent(
        false,
        peer,
        mySocketId,
        toReceiverVideoSocketId
      );

    // localStream.current
    //   .getTracks()
    //   .forEach((track) => peer.addTrack(track, localStream.current));

    peer.addTransceiver('video', { direction: 'recvonly' });
    peer.addTransceiver('audio', { direction: 'recvonly' });

    return peer;
  }

  async function handleNegotiationNeededEvent(
    isBroadcaster,
    peer,
    mySocketId,
    toReceiverVideoSocketId
  ) {
    console.log('handleNegotiationNeededEvent');
    const offer = await peer.createOffer();
    await peer.setLocalDescription(offer);

    const payload = isBroadcaster
      ? {
          caller: mySocketId,
          sdp: peer.localDescription,
        }
      : {
          sdp: peer.localDescription,
          caller: mySocketId,
          target: toReceiverVideoSocketId,
        };

    const { data } = await axios.post(
      isBroadcaster ? '/broadcast' : '/consumer',
      payload
    );

    const desc = new RTCSessionDescription(data.sdp);
    peer.setRemoteDescription(desc).catch((e) => console.log(e));
  }

  function handleTrackEvent(e) {
    console.log('on track peer');
    document.getElementById('video').srcObject = e.streams[0];
  }

  function handlePayload(payload) {
    console.log(
      `🚀  ${new Date().toLocaleString()} ~ handlePayload ~ payload`,
      payload
    );
    const peer = createPeer(localSocket.current.id, payload.id);

    remotePeers.current.push({ id: payload.id, peer });

    return peer;
  }

  return (
    <div>
      <div>
        <button
          style={{ margin: 10 }}
          onClick={() => {
            props.history.replace(`/room/${uuid()}`);
            props.history.go(0);
          }}
        >
          Back
        </button>
        {/* <button onClick={toggleAudio} style={{ margin: 10 }}>
          {enabledAudio ? 'Mute' : 'Unmute'} audio
        </button>
        <button onClick={toggleVideo} style={{ margin: 10 }}>
          {enabledVideo ? 'Mute' : 'Unmute'} video
        </button> */}
      </div>

      <div>
        <div>
          <StyledVideo muted ref={localVideo} autoPlay playsInline />
        </div>
        <div>
          {peerSockets.map((peer, index) => {
            return <Video key={index} peer={peer} />;
          })}
        </div>
      </div>
    </div>
  );
};
