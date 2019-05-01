'use strict';

$(function () {
  var socket = io();
  var wordList = [];
  var currentWord;
  var gameLogic = {youAreDrawing: false};

  drawing.initialize(socket, gameLogic);
  $('#skip').attr("disabled", true);

  function correctGuess(guess, actual) {
    var regex = new RegExp(".*" + actual + ".*", "i", "g");
    return guess.match(regex) !== null;
  };

  function resetBoard() {
    $('#start-game').attr("disabled", false);
    $('#skip').attr("disabled", true);
    gameLogic.youAreDrawing = false;
    currentWord = null;
    $('.word').text("");
    socket.emit('clear canvas');
  };

  $('#name-set').submit(function(e) {
    e.preventDefault();
    socket.emit('name change', $('#name').val());
    return false;
  });

  $('#clear').click(function(e) {
    e.preventDefault();
    socket.emit('clear canvas');
    return false;
  });

  $('#skip').click(function(e) {
    var currentIndex = _.findIndex(wordList, function(word) {
      return word == $('.word').text();
    });
    var newIndex;
    if (currentIndex == (wordList.length - 1)) {
      newIndex = 0;
    } else {
      newIndex = currentIndex + 1;
    }
    $('.word').text(wordList[newIndex]);

    console.log("Skipping! New word: " + wordList[newIndex]);

    socket.emit('skip word');
    socket.emit('clear canvas');
    // socket.emit('skip word', newIndex);
    socket.emit('current word', wordList[newIndex]);
    currentWord = wordList[newIndex]; // Doesn't matter for drawer, they shouldnt' guess anyway, but they do need to see what is correct
    return false;
  });

  $('#start-game').click(function(e) {
    socket.emit('start game');
    return false;
  });

  $('#give-up').click(function(e) {
    socket.emit('give up');
    return false;
  });

  $('#main-chat').submit(function(e) {
    e.preventDefault();
    var username = $('#name').val();
    var message = $('#m').val();
    socket.emit('chat message', username, message);
    $('#m').val('');
    return false;
  });

  $('#guess-form').submit(function(e) {
    e.preventDefault();
    if (!gameLogic.youAreDrawing) {
      var username = $('#name').val();
      var guess = $('#guess-m').val();
      socket.emit('guess message', username, guess, $.now());
    }
    $('#guess-m').val('');
    return false;
  });

  socket.on('your turn', function(wordsToDraw) {
    console.log('your turn!');
    console.log(wordsToDraw);
    wordList = wordsToDraw;
    currentWord = wordList[0];
    // socket.emit('current word', currentWord);
    $('.word').text(wordList[0]);
    gameLogic.youAreDrawing = true;
    $('#skip').attr('disabled', false);
  });

  socket.on('start new game', function() {
    $("div#game-start").fadeIn(300).delay(1500).fadeOut(400);
    $('#start-game').attr("disabled", true);
    if (!gameLogic.youAreDrawing) {
      $('#skip').attr("disabled", true);
    }
  });

  socket.on('give up', function() {
    resetBoard();

    $("div#game-over").fadeIn(300).delay(2000).fadeOut(400);
  });

  socket.on('clear guess list', function() {
    $('#guess-messages').empty();
  });

  socket.on('chat message', function(message) {
    $('#messages').append($('<li>').text(message));
  });

  socket.on('guess message', function(username, message, now) {
    var fullMessage = username + ": " + message;
    var listItem;

    if (correctGuess(message, currentWord)) {
      listItem = $('<li class="correct">').text(fullMessage);
      listItem.attr('id', now);
      $("div#correct-guess").text("Word was: " + currentWord + ", correct!");
      $("div#correct-guess").fadeIn(300).delay(500).fadeOut(400);
      if (gameLogic.youAreDrawing) {
        socket.emit('correct guess', currentWord);
      }
    } else {
      listItem = $('<li>').text(fullMessage);
      listItem.attr('id', now);
      listItem.click(function() {
        if (gameLogic.youAreDrawing) {
          socket.emit('highlight guess', listItem.attr('id'));
          $('#' + listItem.attr('id')).toggleClass('highlight');
        }
      });
    }

    $('#guess-messages').append(listItem);
    $('#guess-box').animate({ scrollTop: $('#guess-messages').prop("scrollHeight") }, 500);
  });

  socket.on('current word', function(newWord) {
    currentWord = newWord;
  });

  socket.on('highlight guess', function(id) {
    $('#' + id).toggleClass('highlight');
  });

  socket.on('game win', function() {
    resetBoard();

    $("div#game-win").fadeIn(300).delay(3000).fadeOut(400);
  });

  socket.on('correct guess', function() {
    var currentIndex = _.findIndex(wordList, function(word) {
      return word == $('.word').text();
    });
    var newIndex;
    if (currentIndex == (wordList.length - 1)) {
      newIndex = 0;
    } else {
      newIndex = currentIndex;
    }

    _.pullAt(wordList, currentIndex);

    if (wordList.length == 0) {
      socket.emit('game win');
    } else {
      console.log('Correct! New word: ' + wordList[newIndex]);
      $('.word').text(wordList[newIndex]);
      socket.emit('clear canvas');
      socket.emit('current word', wordList[newIndex]);
      currentWord = wordList[newIndex];
    }
    return false;
  });

  socket.on('skip word', function() {
    $("div#skip-word").text("Word skipped!");
    $("div#skip-word").fadeIn(300).delay(500).fadeOut(400);
  });
});
