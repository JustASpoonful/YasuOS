<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Simple PeerJS Chat</title>
  <style>
    body {
      background-color: #36393f;
      color: #dcddde;
      font-family: Arial, sans-serif;
      text-align: center;
      padding: 20px;
    }
    h1 {
      margin-bottom: 10px;
    }
    #myPeerId {
      font-weight: bold;
    }
    #chat {
      margin-top: 20px;
      display: none;
    }
    #messages {
      list-style: none;
      background-color: #2f3136;
      padding: 10px;
      height: 300px;
      overflow-y: auto;
      text-align: left;
      margin: 0 auto 10px;
      max-width: 600px;
    }
    #messages li {
      margin: 5px 0;
      padding: 5px;
      border-bottom: 1px solid #555;
    }
    input, button {
      padding: 10px;
      margin: 5px;
      border: none;
      outline: none;
    }
    input {
      width: 300px;
      background-color: #40444b;
      color: #dcddde;
    }
    button {
      background-color: #7289da;
      color: white;
      cursor: pointer;
    }
  </style>
</head>
<body>
  <h1>Simple PeerJS Chat</h1>
  <p>Copy your Peer ID, then give it to your friend, your friend will paste your peer id into the 'Enter Peer id to connect' text box, and you will have to do the same! Eneter your friends peer id into the text box.</p>
  <p>Your Peer ID: <span id="myPeerId">...</span></p>
  <input type="text" id="peerIdInput" placeholder="Enter peer ID to connect">
  <button id="connectBtn">Connect</button>

  <div id="chat">
    <ul id="messages"></ul>
    <input type="text" id="messageInput" placeholder="Type your message">
    <button id="sendBtn">Send</button>
  </div>

  <!-- Include PeerJS library from CDN -->
  <script src="https://unpkg.com/peerjs@1.4.7/dist/peerjs.min.js"></script>
  <script>
    // Create a new PeerJS peer using the default cloud server.
    const peer = new Peer();

    // DOM Elements
    const myPeerIdSpan = document.getElementById('myPeerId');
    const peerIdInput = document.getElementById('peerIdInput');
    const connectBtn = document.getElementById('connectBtn');
    const chatDiv = document.getElementById('chat');
    const messagesUl = document.getElementById('messages');
    const messageInput = document.getElementById('messageInput');
    const sendBtn = document.getElementById('sendBtn');

    let conn; // Will hold our connection

    // When the peer connection is ready, display your Peer ID.
    peer.on('open', id => {
      myPeerIdSpan.textContent = id;
    });

    // Listen for incoming connections.
    peer.on('connection', connection => {
      conn = connection;
      setupConnection();
    });

    // Connect to a peer when clicking the "Connect" button.
    connectBtn.addEventListener('click', () => {
      const remoteId = peerIdInput.value.trim();
      if (remoteId) {
        conn = peer.connect(remoteId);
        conn.on('open', setupConnection);
      }
    });

    // Setup connection event handlers.
    function setupConnection() {
      chatDiv.style.display = 'block';
      conn.on('data', data => {
        addMessage('Peer: ' + data);
      });
    }

    // Send a message when clicking "Send".
    sendBtn.addEventListener('click', () => {
      const msg = messageInput.value.trim();
      if (msg && conn && conn.open) {
        conn.send(msg);
        addMessage('You: ' + msg);
        messageInput.value = '';
      }
    });

    // Also send a message when pressing Enter in the message input.
    messageInput.addEventListener('keypress', event => {
      if (event.key === 'Enter') {
        sendBtn.click();
      }
    });

    // Helper function to display messages.
    function addMessage(message) {
      const li = document.createElement('li');
      li.textContent = message;
      messagesUl.appendChild(li);
      messagesUl.scrollTop = messagesUl.scrollHeight;
    }
  </script>
</body>
</html>
