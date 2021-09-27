import React from 'react';
import { v1 as uuid } from 'uuid';

const CreateRoom = (props) => {
  function create() {
    const id = uuid();
    props.history.push(`/room/${id}`);
  }

  function joinGroupChat() {
    props.history.push('/group-chat');
  }

  function joinSFUGroupChat() {
    props.history.push('/sfu-group-chat');
  }

  return (
    <div>
      <button onClick={create}>Create Room</button>
      <button onClick={joinGroupChat}>Join Group Chat</button>
      <button onClick={joinSFUGroupChat}>Join SFU Group Chat</button>
    </div>
  );
};

export default CreateRoom;
