import React, { useRef, useEffect, useState } from 'react';
import io from 'socket.io-client';
import { v1 as uuid } from 'uuid';
import styled from 'styled-components';
import Peer from 'simple-peer';

const StyledVideo = styled.video`
  height: 40%;
  width: 50%;
`;

const Video = (props) => {
  const ref = useRef();

  useEffect(() => {
    props.peer.on('stream', (stream) => {
      ref.current.srcObject = stream;
    });
  }, []);

  return <StyledVideo playsInline autoPlay ref={ref} />;
};

export default (props) => {
  const localStream = useRef();
  const localVideo = useRef();

  const [localVideoTracksTxt, setLocalVideoTracksTxt] = useState('Loading...');
  const [remoteVideoTracksTxt, setRemoteVideoTracksTxt] =
    useState('Loading...');

  //socket
  const localSocket = useRef();

  //peer
  const remotePeers = useRef([]);

  let [peerSockets, setPeerSockets] = useState([]);

  let [enabledAudio, setEnabledAudio] = useState(true);
  let [enabledVideo, setEnabledVideo] = useState(true);

  const verbose = false;

  useEffect(() => {
    setStreamingDevice({ audio: enabledAudio, video: enabledVideo }).then(
      () => {
        localSocket.current = io.connect('http://127.0.0.1:8000');
        localSocket.current.emit('group chat');

        localSocket.current.on('other user', (socketIds) => {
          console.log(
            `🚀  ${new Date().toLocaleString()} ~ localSocket.current.on ~ socketIds`,
            socketIds
          );

          const peers = [];
          socketIds.forEach((socketId) => {
            const peer = createPeer(
              socketId,
              localSocket.current.id,
              localStream.current
            );

            remotePeers.current.push({ id: socketId, peer });
            peers.push(peer);
          });

          setPeerSockets(peers);

          console.log({
            rPL: remotePeers.current,
            peers,
          });
        });

        localSocket.current.on('offer', (payload) => {
          console.log(
            `🚀  ${new Date().toLocaleString()} ~ localSocket.current.on ~ received offer`,
            payload
          );

          const peer = addPeer(
            payload.sdp,
            payload.caller,
            localStream.current
          );

          remotePeers.current.push({ id: payload.caller, peer });

          setPeerSockets((peerSockets) => [...peerSockets, peer]);
        });

        localSocket.current.on('answer', (payload) => {
          console.log(
            `🚀  ${new Date().toLocaleString()} ~ localSocket.current.on ~ received answer`,
            payload
          );

          const item = remotePeers.current.find((p) => p.id === payload.caller);
          console.log(
            `🚀  ${new Date().toLocaleString()} ~ localSocket.current.on ~ remotePeers`,
            remotePeers
          );

          if (item) {
            item.peer.signal(payload.sdp);
          }
        });

        localSocket.current.on('left', (socketId) => {
          console.log(
            `🚀  ${new Date().toLocaleString()} ~ localSocket.current.on ~ left`,
            socketId
          );

          const item = remotePeers.current.find((p) => p.id === socketId);

          if (item) {
            item.peer.destroy();

            remotePeers.current = remotePeers.current.filter(
              (p) => p.id !== socketId
            );

            setPeerSockets(peerSockets.filter((id) => id !== socketId));
          }
        });
      }
    );

    return function () {
      localSocket.current.leave();
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

  function createPeer(socketId, callerId, stream) {
    const peer = new Peer({
      initiator: true,
      trickle: false,
      stream,
    });

    peer.on('signal', (signal) => {
      const payload = {
        target: socketId,
        caller: callerId,
        sdp: signal,
      };
      console.log('emit offer');

      localSocket.current.emit('offer', payload);
    });

    return peer;
  }

  function addPeer(incomingSignal, callerID, stream) {
    const peer = new Peer({
      initiator: false,
      trickle: false,
      stream,
    });

    peer.on('signal', (signal) => {
      const payload = {
        target: callerID,
        caller: localSocket.current.id,
        sdp: signal,
      };
      console.log('emit answer');
      localSocket.current.emit('answer', payload);
    });

    peer.signal(incomingSignal);

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
