// Require dependencies
const express = require('express');
const formidable = require('formidable');
const chokidar = require('chokidar');
const rsync = require('rsync');
const path = require('path');

// Set up Express app
const app = express();
const http = require('http').createServer(app);

// Set up Socket.IO server
const io = require('socket.io')(http);

// Set up static file serving
app.use(express.static('public'));

// Set up EJS view engine
app.set('view engine', 'ejs');

// Set up routes
app.get('/', (req, res) => {
  res.render('index');
});

// Set up file upload route
app.post('/upload', async (req, res) => {
  console.log(req);

  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify({ msg: "data" }));

  
});

// Set up Socket.IO server to handle client connections
io.on('connection', (socket) => {
  console.log(`Client ${socket.id} connected`);

  // Broadcast the updated file list to all connected clients
  // broadcastFilesList();

  // Handle client disconnections
  socket.on('disconnect', () => {
    console.log(`Client ${socket.id} disconnected`);
  });
});

// Watch for changes in the local folder and sync with the remote folder using rsync
const localPath = path.join(__dirname, '/public/uploads');
const remotePath = 'sicmundus@172.16.12.136:/home/sicmundus/MyProjects/SyncShareX/public/uploads';
const watcher = chokidar.watch(localPath);



function broadcastFilesList() {
  const rsyncProcess = new rsync()
    .flags(['--list-only'])
    .source(remotePath);
  
  // console.log("rsyncProcess = ", rsyncProcess);
  
  rsyncProcess.execute((err, stdout) => {
    if (err) {
      console.error(err);
      return;
    }

    console.log("stdout = ", stdout);
    const files = stdout.split('\n')
      .filter(line => line.startsWith('d') || line.startsWith('-'))
      .map(line => line.split(' ').pop());
    io.emit('files_list', files);
  });
}

watcher.on('all', (event, path) => {
  const rsyncProcess = new rsync()
    .flags(['-avz', '--delete'])
    .source(localPath)
    .destination(remotePath);

  rsyncProcess.execute(() => {
    console.log(`Local folder synced with remote folder: ${event} ${path}`);
    // Broadcast the updated file list to all connected clients
    // broadcastFilesList();
  });
});

// Start the server
const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});