var express = require('express');
var app = express();
var http = require('http').createServer(app);
var io = require('socket.io')(http);
var _ = require('lodash');

app.use(express.static(__dirname + '/public'));

var wholeWordListFile = require(__dirname + '/data/wordlist.json');
var baseWordList = wholeWordListFile.baseWords;
var leagueChampsList = wholeWordListFile.leagueChamps;
var stateList = wholeWordListFile.states;
var currentDrawer;

var wordList = baseWordList.concat(leagueChampsList).concat(stateList);

// app.get('/', function(request, response) {
//   response.sendFile(__dirname + 'index.html');
// });

io.on('connection', function(socket) {
  console.log('User connected with Socket ID: ' + socket.id);

  socket.on('chat message', function(username, message) {
    console.log('Socket ID: ' + socket.id + ' is Username: ' + username + ' and sending message: ' + message);
    io.emit('chat message', username + ': ' + message);
  });

  socket.on('guess message', function(username, message, now) {
    console.log('Username: ' + username + ' is guessing: ' + message);
    io.emit('guess message', username, message, now);
  });

  socket.on('drawing', (data) => socket.broadcast.emit('drawing', data));
  socket.on('clear canvas', function() {
    io.emit('clear canvas');
  });

  // socket.on('skip word', function(newIndex) {
  //   socket.broadcast.emit('next word', newIndex);
  // });

  socket.on('start game', function() {
    console.log('Game starting...');
    var wordsToDraw = _.sampleSize(wordList, 10);
    console.log('Sending Wordlist: ' + wordsToDraw);
    console.log('To: ' + socket.id);
    currentDrawer = socket.id
    io.emit('clear guess list');
    io.emit('start new game');
    io.to(`${currentDrawer}`).emit('your turn', wordsToDraw);
    socket.broadcast.emit('current word', wordsToDraw[0]);
    // socket.broadcast.emit('wordlist', wordsToDraw);
  });

  socket.on('current word', function(currentWord) {
    socket.broadcast.emit('current word', currentWord);
  });

  socket.on('game win', function() {
    io.emit('game win');
  });

  socket.on('skip word', function() {
    io.emit('skip word');
  });

  socket.on('give up', function() {
    io.emit('give up');
  });

  socket.on('correct guess', function() {
    // socket.broadcast.emit('correct guess');
    io.to(`${currentDrawer}`).emit('correct guess');
    // io.emit('correct guess');
  });

  socket.on('highlight guess', function(id) {
    socket.broadcast.emit('highlight guess', id);
  });

  socket.on('disconnect', function() {
    console.log('User with Socket ID: ' + socket.id + ' disconnected');
  });
});

http.listen(9600, function() {
  console.log('listening on *:9600');
});
