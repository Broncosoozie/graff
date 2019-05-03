'use strict';

$(function () {
  var socket = io();
  var wordList = [];
  var currentWord;
  var gameLogic = {youAreDrawing: false};

  drawing.initialize(socket, gameLogic);
  $('#skip').attr("disabled", true);
  $('#clear').attr("disabled", true);
  $('#give-up').attr("disabled", true);

  $('#name-modal').modal();
  $('#name-modal').on('hide.bs.modal', function(e) {
    if ($('#name-modal-input').val() !== "") {
      $('#name').val($('#name-modal-input').val());
      $('#current-username').text($('#name-modal-input').val());
    } else {
      $('#name').val("Unknown");
      $('#current-username').text("Unknown");
    }
  });

  function correctGuess(guess, actual) {
    var regex = new RegExp(".*" + actual + ".*", "i", "g");
    return guess.match(regex) !== null;
  };

  function resetBoard() {
    $('#start-game').attr("disabled", false);
    $('#skip').attr("disabled", true);
    $('#clear').attr("disabled", true);
    $('#give-up').attr("disabled", true);
    gameLogic.youAreDrawing = false;
    currentWord = null;
    $('.word').text("");
    $('#timer').text("");
    $('#word-count-left').text("");
    socket.emit('clear canvas');
  };

  function getWordListSelections() {
    var wordListSelections = _.map($('#word-list-option input:checked'), function(wordListInput) {
      return $(wordListInput).val();
    });

    return wordListSelections;
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
    socket.emit('current word', wordList[newIndex]);
    currentWord = wordList[newIndex]; // Doesn't matter for drawer, they shouldnt' guess anyway, but they do need to see what is correct
    return false;
  });

  $('#start-game').click(function(e) {
    var wordLists = getWordListSelections();

    if (_.isEmpty(wordLists)) {
      $("div#no-wordlist-selected").fadeIn(300).delay(3000).fadeOut(400);
      return false;
    }

    var gameOptions = {
      timeOption: $('#time-option').val(),
      wordCountOption: $('#word-count-option').val(),
      wordLists: getWordListSelections()
    }

    socket.emit('start game', gameOptions);
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

  $('#reset-default-options').click(function(e) {
    e.preventDefault();
    $('#time-option').val('120');
    $('#word-count-option').val('10');
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
    $('#clear').attr('disabled', false);
    $('#give-up').attr('disabled', false);
  });

  socket.on('start new game', function() {
    $("div#game-start").fadeIn(300).delay(1500).fadeOut(400);
    $('#start-game').attr("disabled", true);
    if (!gameLogic.youAreDrawing) {
      $('#skip').attr("disabled", true);
      $('#clear').attr("disabled", true);
      $('#give-up').attr("disabled", true);
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
      $("#correct-guess").text("Word was: " + currentWord + ", correct!");
      $("#correct-guess-box").fadeIn(300).delay(500).fadeOut(400);
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

  socket.on('current timer', function(timeLeft) {
    var minutes = Math.floor(timeLeft / 60);
    var seconds = _.padStart(timeLeft - (minutes * 60), 2, '0');
    var currentTimeLeft = minutes + ":" + seconds;
    $("#timer").text(currentTimeLeft);
  });

  socket.on('current word index', function(wordIndex, wordListLength) {
    $("#word-count-left").text("Word " + wordIndex + "/" + wordListLength);
  });

  socket.on('time out', function(wordFailedOn) {
    resetBoard();

    $("div#time-out").text("Time's up! Word was: " + wordFailedOn);
    $("div#time-out").fadeIn(300).delay(3000).fadeOut(400);
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
    $("div#skip-word").fadeIn(300).delay(500).fadeOut(400);
  });

  socket.on('game in progress', function() {
    $('#start-game').attr("disabled", true);
  });

  socket.on('word list selections', function(wordListSelections) {
    _.each(wordListSelections, function(wordList) {
      var input = $('<input class="custom-control-input"></input>');
      input.attr('value', wordList);
      input.attr('id', wordList + '-list');
      input.attr('type', 'checkbox');
      input.attr('checked', true);
      var label = $('<label class="custom-control-label word-list-label">' + wordList + '</label>');
      label.attr('for', wordList + '-list');
      var checkBox = $('<div class="custom-control custom-checkbox"></div>').append(input).append(label);

      $('#word-list-option').append(checkBox);
    });
  });
});
