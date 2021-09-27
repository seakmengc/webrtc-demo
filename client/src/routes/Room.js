import React, { useRef, useEffect, useState } from 'react';
import io from 'socket.io-client';
import { v1 as uuid } from 'uuid';

export default (props) => {
  const localStream = useRef();

  const localVideo = useRef();
  const remoteVideo = useRef();
  const [localVideoTracksTxt, setLocalVideoTracksTxt] = useState('Loading...');
  const [remoteVideoTracksTxt, setRemoteVideoTracksTxt] =
    useState('Loading...');

  //socket
  const localSocket = useRef();

  //peer
  const peerRef = useRef();

  let [otherUser, setOtherUser] = useState();
  let [caller, setCaller] = useState();

  let [enabledAudio, setEnabledAudio] = useState(true);
  let [enabledVideo, setEnabledVideo] = useState(false);
  // let [inCallingWith, setInCallingWith] = useState('');
  const inCallingWith = useRef('');

  const verbose = true;

  function setInCallingWith(val) {
    if (verbose) {
      console.log(
        `🚀  ${new Date().toLocaleString()} ~ setInCallingWith ~ val`,
        val
      );
    }
    inCallingWith.current = val;
    if (verbose) {
      console.log(
        `🚀  ${new Date().toLocaleString()} ~ setInCallingWith ~ inCallingWith`,
        inCallingWith.current
      );
    }
  }

  useEffect(() => {
    setStreamingDevice({ audio: enabledAudio, video: enabledVideo }).then(
      () => {
        localSocket.current = io.connect('http://127.0.0.1:8000');
        localSocket.current.emit('join room', props.match.params.roomID);

        localSocket.current.on('other user', (userId) => {
          setOtherUser(userId);
        });

        localSocket.current.on('user joined', (userId) => {
          setOtherUser(userId);
        });

        localSocket.current.on('offer', handleReceiveCall);

        localSocket.current.on('answer', handleAnswer);

        localSocket.current.on('ice-candidate', handleNewICECandidateMsg);
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

        updateSrcObject(localVideo, stream, setLocalVideoTracksTxt);

        localStream.current = stream;
      });
  }

  function handleReceiveCall(incoming) {
    if (inCallingWith.current === incoming.caller) {
      console.log(
        `🚀  ${new Date().toLocaleString()} ~ handleReceiveCall ~ answerWithoutPromptAfterUpdateTrack`
      );

      remoteVideo.current.srcObject = undefined;
      updateSrcObject(remoteVideo, undefined, setRemoteVideoTracksTxt);

      acceptCall(incoming);

      return;
    }

    if (verbose) {
      console.log(
        `🚀  ${new Date().toLocaleString()} ~ handleReceiveCall ~ incoming`,
        incoming
      );
    }
    setCaller(incoming);
  }

  function acceptCall(callerInfo) {
    if (verbose) {
      console.log(
        `🚀  ${new Date().toLocaleString()} ~ acceptCall ~ callerInfo`,
        callerInfo
      );
    }
    peerRef.current = createPeer(callerInfo.caller);

    const desc = new RTCSessionDescription(callerInfo.sdp);
    peerRef.current
      .setRemoteDescription(desc)
      .then(() => {
        localStream.current
          .getTracks()
          .forEach((track) =>
            peerRef.current.addTrack(track, localStream.current)
          );
      })
      .then(() => {
        return peerRef.current.createAnswer();
      })
      .then((answer) => {
        return peerRef.current.setLocalDescription(answer);
      })
      .then(() => {
        const payload = {
          target: callerInfo.caller,
          caller: localSocket.current.id,
          sdp: peerRef.current.localDescription,
        };

        localSocket.current.emit('answer', payload);

        setCaller(undefined);
        setInCallingWith(callerInfo.caller);
      });
  }

  function handleTrackEvent({ transceiver, streams }) {
    const stream = streams[0];
    console.log('🚀 handleTrackEvent ~ e');
    console.log({
      transceiver,
      streams,
      stream: stream.getTracks(),
      receivers: peerRef.current.getReceivers(),
      events: transceiver.receiver.track,
    });
    // updateSrcObject(remoteVideo, stream, setRemoteVideoTracksTxt);

    stream.onremovestream = () => console.log('stream.onremovestream');
    stream.onaddtrack = () => console.log('stream.onaddtrack');
    stream.onremovetrack = () => console.log('stream.onremovetrack');

    //When other peer stop the camera or mic
    transceiver.receiver.track.onmute = () => {
      console.log(
        'transceiver.receiver.track.onmute',
        transceiver.receiver.track,
        remoteVideo.current.srcObject?.getTracks()
      );

      // remoteVideo.current.srcObject.removeTrack(transceiver.receiver.track);
      // updateSrcObject(remoteVideo, undefined, setRemoteVideoTracksTxt);

      // console.log(remoteVideo.current.srcObject?.getTracks());
    };
    transceiver.receiver.track.onended = () =>
      console.log('transceiver.receiver.track.onended');

    //when other peer replace track
    transceiver.receiver.track.onunmute = () => {
      if (!remoteVideo.current.srcObject) {
        remoteVideo.current.srcObject = stream;
        return;
      }

      console.log(
        'transceiver.receiver.track.onunmute',
        stream.getTracks(),
        remoteVideo.current.srcObject?.getVideoTracks()[0],
        remoteVideo.current.srcObject?.getTracks()
      );

      stream
        .getTracks()
        .forEach((track) => remoteVideo.current.srcObject.addTrack(track));

      updateSrcObject(remoteVideo, undefined, setRemoteVideoTracksTxt);
    };
  }

  function handleNewICECandidateMsg(incoming) {
    if (verbose) {
      console.log('🚀 ~ handleNewICECandidateMsg ~ incoming', incoming);
    }
    if (!incoming.candidate) {
      console.error('Error ice candidate');
    }

    if (!peerRef.current) {
      console.error('Error no peer con yet!');
      return;
    }

    const candidate = new RTCIceCandidate(incoming);

    peerRef.current.addIceCandidate(candidate).catch((e) => console.log(e));
  }

  function handleAnswer(message) {
    if (verbose) {
      console.log(
        `🚀  ${new Date().toLocaleString()} ~ handleAnswer ~ message`,
        message
      );
    }
    const desc = new RTCSessionDescription(message.sdp);
    console.log({ desc });

    peerRef.current
      .setRemoteDescription(desc)
      .then(() => setInCallingWith(message.caller))
      .catch((e) => console.log(e));
  }

  function updateSrcObject(videoRef, stream, setTxtStateCallback) {
    if (stream) {
      videoRef.current.srcObject = stream;
    }
    if (videoRef.current.srcObject) {
      setTxtStateCallback(
        videoRef.current.srcObject
          .getTracks()
          .filter((track) => track.readyState === 'live')
          .map((track) => track.kind)
          .join(', ')
      );
    } else {
      setTxtStateCallback('');
    }
  }

  function callOtherUser(callUserId) {
    if (verbose) {
      console.log(
        `🚀  ${new Date().toLocaleString()} ~ file: Room.js ~ line 80 ~ callOtherUser ~ callUserId`,
        callUserId
      );
    }

    peerRef.current = createPeer(callUserId);
    console.log('Before add track');
    addTracksToWebRTC(peerRef.current);
    console.log('After add track');

    // console.log(peerRef.current);
    // console.log(peerRef.current.getLocalStreams()[0].getTracks());
    // console.log(peerRef.current.getRemoteStreams());
  }

  function createPeer(userId) {
    const peer = new RTCPeerConnection({
      iceServers: [
        {
          urls: 'stun:stun.stunprotocol.org',
        },
        {
          urls: 'turn:iebuy-api.app:3478',
          username: 'raymond',
          credential: 'password',
        },
      ],
    });

    peer.onicecandidate = handleICECandidateEvent;
    peer.oniceconnectionstatechange = () => {
      console.log('oniceconnectionstatechange');
    };
    peer.ontrack = handleTrackEvent;

    //Fire a bit later when add track
    peer.onnegotiationneeded = () => handleNegotiationNeededEvent(userId);

    return peer;
  }

  function handleICECandidateEvent(e) {
    if (verbose) {
      console.log(
        `🚀  ${new Date().toLocaleString()} ~ handleICECandidateEvent ~ e`,
        e
      );
    }

    if (e.candidate) {
      const payload = {
        target: otherUser,
        candidate: e.candidate,
      };

      localSocket.current.emit('ice-candidate', payload);
    }
  }

  function handleNegotiationNeededEvent(userId) {
    console.log('🚀 ~ handleNegotiationNeededEvent ~ userId', userId);

    peerRef.current
      .createOffer()
      .then((offer) => {
        return peerRef.current.setLocalDescription(offer);
      })
      .then(() => {
        const payload = {
          target: userId,
          caller: localSocket.current.id,
          sdp: peerRef.current.localDescription,
        };

        localSocket.current.emit('offer', payload);
      })
      .catch((e) => console.log(e));
  }

  function toggleAudio() {
    // enabledAudio = !enabledAudio;
    // setEnabledAudio(enabledAudio)
    // localStream.current.remove
  }

  async function toggleVideo() {
    enabledVideo = !enabledVideo;
    setEnabledVideo(enabledVideo);

    if (!enabledVideo) {
      //fire onmute event on remote peer
      localStream.current.getVideoTracks()[0].stop();
    } else {
      console.log({
        abc: remoteVideo.current.srcObject?.getVideoTracks()[0],
        local: localStream.current.getVideoTracks()[0],
      });
      await setStreamingDevice({ audio: enabledAudio, video: enabledVideo });
      console.log({
        abc: remoteVideo.current.srcObject?.getVideoTracks()[0],
        local: localStream.current.getVideoTracks()[0],
      });
    }

    if (!peerRef.current) {
      return;
    }

    console.log({ enabledVideo });
    if (!enabledVideo) {
      console.log({
        senders: peerRef.current.getSenders(),
        receivers: peerRef.current.getReceivers(),
        tracks: peerRef.current.getTransceivers(),
        sender: peerRef.current
          .getSenders()
          .find((sender) => sender.track?.kind === 'video'),
      });
      // peerRef.current.removeTrack(
      //   peerRef.current
      //     .getSenders()
      //     .find((sender) => sender.track?.kind === 'video')
      // );
      // console.log({
      //   senders: peerRef.current.getSenders().length,
      //   tracks: peerRef.current.getTransceivers().length,
      // });
    } else {
      console.log({
        tracks: localStream.current.getTracks(),
        video: localStream.current.getVideoTracks()[0],
        peer: peerRef.current,
        senders: peerRef.current.getSenders(),
        receivers: peerRef.current.getReceivers(),
        transceivers: peerRef.current.getTransceivers(),
      });

      const tracks = localStream.current.getTracks();
      peerRef.current.getSenders().forEach((sender) => {
        const newTrack = tracks.find(
          (track) => track.kind === sender.track?.kind
        );
        if (newTrack) {
          sender.replaceTrack(newTrack);
        }
      });

      // console.log({
      //   senders: peerRef.current.getSenders(),
      //   transceivers: peerRef.current.getTransceivers(),
      // });
    }

    console.log({
      peerRef: peerRef.current,
      getLocalStreams: peerRef.current.getLocalStreams(),
      getSenders: peerRef.current.getSenders(),
      getStats: peerRef.current.getStats(),
    });
  }

  function addTracksToWebRTC(localWebRtc) {
    localStream.current
      .getTracks()
      .forEach((track) => localWebRtc.addTrack(track, localStream.current));
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
        <button onClick={toggleAudio} style={{ margin: 10 }}>
          {enabledAudio ? 'Mute' : 'Unmute'} audio
        </button>
        <button onClick={toggleVideo} style={{ margin: 10 }}>
          {enabledVideo ? 'Mute' : 'Unmute'} video
        </button>
        {otherUser && (
          <button
            onClick={(_) => callOtherUser(otherUser)}
            style={{ margin: 10 }}
          >
            Call {otherUser}
          </button>
        )}
      </div>

      {caller && (
        <div>
          <button onClick={(e) => acceptCall(caller)} style={{ margin: 10 }}>
            Receiving call from {caller.caller}
          </button>
        </div>
      )}

      <div>
        <video muted autoPlay ref={localVideo} width='200' defa />
        <p style={{ margin: 0 }}>{localVideoTracksTxt}</p>
      </div>
      <div>
        <video
          autoPlay
          ref={remoteVideo}
          width='400'
          height='400'
          poster='https://img.flaticon.com/icons/png/512/120/120614.png?size=1200x630f&pad=10,10,10,10&ext=png&bg=FFFFFFFF'
        />
        <p style={{ margin: 0 }}>{remoteVideoTracksTxt}</p>
      </div>
    </div>
  );
};
