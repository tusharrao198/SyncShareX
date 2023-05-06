const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const { spawn } = require('child_process');


app.post('/upload', (req, res) => {
  const fileId = generateId(); // generate a unique ID for the file
  const filePath = `/path/to/uploads/${fileId}`; // set the file path
  const rsyncArgs = ['-avz', req.file.path, filePath]; // set the rsync arguments

  const rsyncProcess = spawn('rsync', rsyncArgs); // spawn a new rsync process

  rsyncProcess.on('close', (code) => {
    if (code === 0) {
      io.emit('fileAdded', fileId); // send a real-time update to all connected clients
      res.send('File uploaded successfully.');
    } else {
      res.status(500).send('Error uploading file.');
    }
  });
});

app.get('/download/:id', (req, res) => {
  const fileId = req.params.id;
  const filePath = `/path/to/uploads/${fileId}`; // set the file path
  res.download(filePath); // send the file to the client for download
});

io.on('connection', (socket) => {
  console.log('A user connected');
  const files = getSharedFiles(); // get a list of shared files from the server
  socket.emit('filesList', files); // send the list of shared files to the connected client

  socket.on('downloadFile', (fileId) => {
    const downloadUrl = `/download/${fileId}`; // set the download URL
    socket.emit('fileDownloadUrl', downloadUrl); // send the download URL to the connected client
  });

  // handle disconnection
  socket.on('disconnect', () => {
    console.log('A user disconnected');
  });
});


function getSharedFiles() {
  const files = fs.readdirSync('/path/to/uploads'); // get a list of files in the uploads directory
  return files.map((file) => {
    return {
      id: file,
      name: file,
      size: getFileSize(`/path/to/uploads/${file}`),
      type: getFileType(`/path/to/uploads/${file}`),
    };
  });
}


function getFileSize(filePath) {
  const stats = fs.statSync(filePath);
  const fileSizeInBytes = stats.size;
  return formatBytes(fileSizeInBytes);
}

function getFileType(filePath) {
  return mime.getType(filePath);
}

function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}
