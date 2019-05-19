var express = require('express'),
    fs      = require('fs'),
    _       = require('lodash'),
    favicon = require('serve-favicon')
    path    = require('path');
var app = express();
app.set('view engine', 'pug');
const pug = require('pug');
var http = require('http').createServer(app);
var io = require('socket.io')(http);

app.use(express.static(__dirname + '/public'));

app.use(favicon(path.join(__dirname, 'public', 'images', 'favicon.ico')));

var wordSuggestionFile = __dirname + '/data/wordSuggestions.txt';

var wholeWordListFile = require(__dirname + '/data/wordlist.json');
var wordListSelections = _.keys(wholeWordListFile);
var wordListOptions = _.map(wordListSelections, function(wordListName) {
  return {name: wordListName, listId: _.kebabCase(wordListName) + '-list'};
});
var wordListHTML = pug.renderFile('views/templates/word_list_option.pug', {
  wordListOptions: wordListOptions
});

var currentDrawer;
var gameInProgress = false;
var gameInterval;
var gameOptions = {};
var currentWordIndex;
var wordsToDraw;
var wordList;
var connectedPlayers = [];

var VERSION = require('./package.json').version;

function findPlayerInLobby(socketId) {
  return _.find(connectedPlayers, ['socketId', socketId]);
};

function emptySeatHTML(oldSeatId) {
  return pug.renderFile('views/templates/empty_seat.pug', {
    seatId: oldSeatId
  });
};

app.get('/', function(req, res) {
  res.render('index', {});
});

io.on('connection', function(socket) {
  socket.emit('version', VERSION);
  console.log(connectedPlayers);
  socket.emit('user list updated', connectedPlayers);
  socket.emit('word list options', wordListHTML);

  var seatedPlayers = function() {
    var seatedPlayersHTMLList = _.map(connectedPlayers, function(player) {
      var usericon = "&#x1F" + player.usericon;
      var truncatedUsername = _.truncate(player.username, {'length': 10});
      var seatHTML = pug.renderFile('views/templates/filled_seat.pug', {
        username: player.username,
        usericon: usericon,
        seatId: player.seatId,
        truncatedUsername: truncatedUsername,
        mySeat: false
      });

      return {seatId: player.seatId, seatHTML: seatHTML};
    });

    return seatedPlayersHTMLList;
  }

  socket.emit('seated player list', seatedPlayers());

  if (gameInProgress) {
    socket.emit('game in progress');
  }

  console.log('User connected with Socket ID: ' + socket.id);

  socket.on('user changed name', function(username, usericon) {
    var potentialPlayer = findPlayerInLobby(socket.id);
    if (potentialPlayer !== undefined) {
      var oldUsername = potentialPlayer.username;
      if (oldUsername !== username) {
        potentialPlayer.username = username;

        io.emit('user name change', oldUsername, username);
      }

      var oldUserIcon = potentialPlayer.usericon;
      if (oldUserIcon !== usericon) {
        potentialPlayer.usericon = usericon;
      }
    } else {
      connectedPlayers.push({
        socketId: socket.id,
        username: username,
        usericon: usericon
      });
    }

    io.emit('user list updated', connectedPlayers);
  });

  socket.on('user reconnected', function(username, usericon) {
    connectedPlayers.push({
      socketId: socket.id,
      username: username,
      usericon: usericon
    });

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
    var playerWhoStarted = _.find(connectedPlayers, ['socketId', socket.id]);
    io.emit('start new game', options.wordLists, playerWhoStarted.seatId);
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

  socket.on('word suggestion', function(wordSuggestion) {
    var modifiedWordSuggestion = '\"' + wordSuggestion + '\",\n';
    fs.appendFile(wordSuggestionFile, modifiedWordSuggestion, function(_error) {
      var suggester = _.find(connectedPlayers, function(player) {
        return player.socketId == socket.id;
      });
      console.log(wordSuggestion + ' was suggested by: ' + suggester.username);
    });
  });

  socket.on('sit down', function(username, usericon, seatId) {
    var player = _.find(connectedPlayers, ['socketId', socket.id])
    player.seatId = seatId;
    var usericon = "&#x1F" + usericon;
    var truncatedUsername = _.truncate(username, {'length': 10});
    var seatHTML = pug.renderFile('views/templates/filled_seat.pug', {
      username: username,
      usericon: usericon,
      seatId: seatId,
      truncatedUsername: truncatedUsername,
      mySeat: false
    });

    socket.broadcast.emit('sit down', username, usericon, seatId, seatHTML);

    var seatHTML = pug.renderFile('views/templates/filled_seat.pug', {
      username: username,
      usericon: usericon,
      seatId: seatId,
      truncatedUsername: truncatedUsername,
      mySeat: true
    });
    socket.emit('sit down', username, usericon, seatId, seatHTML);
  });

  socket.on('stand up', function(oldSeatId) {
    var player = _.find(connectedPlayers, ['socketId', socket.id])
    player.seatId = null;

    io.emit('stand up', oldSeatId, emptySeatHTML(oldSeatId));
  });

  socket.on('disconnect', function() {
    var disconnectedPlayers = _.remove(connectedPlayers, ['socketId', socket.id]);
    var disconnectedPlayer = disconnectedPlayers[0];

    if (! _.isNil(disconnectedPlayer)) {
      io.emit('stand up', disconnectedPlayer.seatId, emptySeatHTML(disconnectedPlayer.seatId));
    }

    io.emit('user list updated', connectedPlayers);

    if (gameInProgress && currentDrawer == socket.id) {
      gameInProgress = false;
      clearInterval(gameInterval);
      io.emit('disconnect give up');
    }

    console.log('User with Socket ID: ' + socket.id + ' disconnected');
  });
});

http.listen(9600, function() {
  console.log('listening on *:9600');
});
