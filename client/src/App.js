import React from 'react';
import { BrowserRouter, Route, Switch } from 'react-router-dom';
import CreateRoom from './routes/CreateRoom';
import Room from './routes/Room';
import './App.css';
import GroupChat from './routes/GroupChat';
import SFUGroupChat from './routes/SFUGroupChat';

function App() {
  return (
    <div className='App'>
      <BrowserRouter>
        <Switch>
          <Route path='/' exact component={CreateRoom} />
          <Route path='/room/:roomID' component={Room} />
          <Route path='/group-chat' component={GroupChat} />
          <Route path='/sfu-group-chat' component={SFUGroupChat} />
        </Switch>
      </BrowserRouter>
    </div>
  );
}

export default App;
