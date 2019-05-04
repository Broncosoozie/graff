var express = require('express');
var app = express();
var http = require('http').createServer(app);
var io = require('socket.io')(http);
var _ = require('lodash');

app.use(express.static(__dirname + '/public'));

var wholeWordListFile = require(__dirname + '/data/wordlist.json');
var wordListSelections = _.keys(wholeWordListFile);
var currentDrawer;
var gameInProgress = false;
var gameInterval;
var gameOptions = {};
var currentWordIndex;
var wordsToDraw;
var wordList;
var connectedPlayers = [];

var VERSION = "0.0.6";


function findPlayerInLobby(socketId) {
  return _.find(connectedPlayers, ['socketId', socketId]);
};

io.on('connection', function(socket) {
  socket.emit('version', VERSION);
  socket.emit('user list updated', connectedPlayers);
  socket.emit('word list selections', wordListSelections);

  if (gameInProgress) {
    socket.emit('game in progress');
  }

  console.log('User connected with Socket ID: ' + socket.id);

  socket.on('user changed name', function(username, suppressMessage) {
    var potentialPlayer = findPlayerInLobby(socket.id);
    if (potentialPlayer !== undefined) {
      var oldUsername = potentialPlayer.username;
      potentialPlayer.username = username;

      io.emit('user name change', oldUsername, username, suppressMessage);
    } else {
      connectedPlayers.push({
        socketId: socket.id,
        username: username
      });
    }

    io.emit('user list updated', connectedPlayers);
  });

  socket.on('guess message', function(username, message, now) {
    console.log('Username: ' + username + ' is guessing: ' + message);
    io.emit('guess message', username, message, now);
  });

  socket.on('chat message', function(username, message, now) {
    console.log('Username: ' + username + ' is chatting: ' + message);
    io.emit('chat message', username, message, now);
  });

  socket.on('drawing', (data) => socket.broadcast.emit('drawing', data));

  socket.on('clear canvas', function() {
    io.emit('clear canvas');
  });

  socket.on('start game', function(options) {
    console.log('Game starting...');
    console.log(options);

    gameOptions = options;
    currentWordIndex = 0;

    wordList = [];

    _.each(options.wordLists, function(wordListSelection) {
      wordList = wordList.concat(wholeWordListFile[wordListSelection]);
    });

    wordsToDraw = _.sampleSize(wordList, parseInt(options.wordCountOption));
    gameInProgress = true;
    currentDrawer = socket.id

    console.log('Sending Wordlist: ' + wordsToDraw);
    console.log('To: ' + socket.id);

    io.emit('clear guess list');
    io.emit('start new game', options.wordLists);
    io.to(`${currentDrawer}`).emit('your turn', wordsToDraw);
    socket.broadcast.emit('current word', wordsToDraw[0]);
    io.emit('current word index', 1, gameOptions.wordCountOption);

    var timer = parseInt(options.timeOption);
    io.emit('current timer', timer);
    if (timer !== 0) {
      gameInterval = setInterval(function() {
        timer--;
        io.emit('current timer', timer);
        if (timer === 0) {
          io.emit('time out', wordsToDraw[currentWordIndex]);
          gameInProgress = false;
          clearInterval(gameInterval);
        }
      }, 1000);
    }
  });

  socket.on('current word', function(currentWord) {
    currentWordIndex = _.findIndex(wordsToDraw, function(word) {
      return word === currentWord;
    });
    io.emit('current word index', currentWordIndex + 1, gameOptions.wordCountOption);
    socket.broadcast.emit('current word', currentWord);
  });

  socket.on('game win', function() {
    gameInProgress = false;
    clearInterval(gameInterval);
    io.emit('game win');
  });

  socket.on('skip word', function() {
    io.emit('skip word');
  });

  socket.on('give up', function() {
    gameInProgress = false;
    clearInterval(gameInterval);
    io.emit('give up');
  });

  socket.on('correct guess', function() {
    currentWordIndex++;
    io.emit('current word index', currentWordIndex, gameOptions.wordCountOption);
    io.to(`${currentDrawer}`).emit('correct guess');
  });

  socket.on('highlight guess', function(id) {
    socket.broadcast.emit('highlight guess', id);
  });

  socket.on('disconnect', function() {
    _.remove(connectedPlayers, function(player) {
      return player.socketId == socket.id;
    });

    io.emit('user list updated', connectedPlayers);

    console.log('User with Socket ID: ' + socket.id + ' disconnected');
  });
});

http.listen(9600, function() {
  console.log('listening on *:9600');
});
