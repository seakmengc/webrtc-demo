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

  return (
    <div>
      <button onClick={create}>Create Room</button>
      <button onClick={joinGroupChat}>Join Group Chat</button>
    </div>
  );
};

export default CreateRoom;
