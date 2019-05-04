'use strict';

$(function () {
  var socket = io();
  var wordList = [];
  var currentWord;
  var gameLogic = {youAreDrawing: false};
  var tada = new Audio('sounds/tada.flac');
  var gameOverSound = new Audio('sounds/gameOver.wav');
  var correctSound = new Audio('sounds/correct.wav');
  var skipSound = new Audio('sounds/skip.wav');

  var tadaVolume = 0.2;
  var gameOverVolume = 0.2;
  var correctVolume = 0.2;
  var skipVolume = 0.2;

  adjustSoundVolumes();

  drawing.initialize(socket, gameLogic);

  $('#skip').attr("disabled", true);
  $('#clear').attr("disabled", true);
  $('#give-up').attr("disabled", true);
  $('#give-up').hide();

  $('#name-modal').modal();
  $('#name-modal').on('hide.bs.modal', function(e) {
    if ($('#name-modal-input').val() === "") {
      $('#name-modal-input').val("Unknown");
    }
    $('#current-username').text($('#name-modal-input').val());
    socket.emit('user changed name', $('#name-modal-input').val());
  });

  function adjustSoundVolumes() {
    tada.volume = tadaVolume;
    gameOverSound.volume = gameOverVolume;
    correctSound.volume = correctVolume;
    skipSound.volume = skipVolume;
  };

  function correctGuess(guess, actual) {
    var actualModified = actual.replace(/[\s\'\.\-]+/, '');
    var guessModified = guess.replace(/[\s\'\.\-]+/, '');
    var regex = new RegExp(".*" + actualModified + ".*", "i", "g");
    return guessModified.match(regex) !== null;
  };

  function flashMessage(elementId, delay) {
    $(elementId).fadeIn(300).delay(delay).fadeOut(400);
  };

  function resetBoard() {
    $('#start-game').attr("disabled", false);
    $('#start-game').show();
    $('#skip').attr("disabled", true);
    $('#clear').attr("disabled", true);
    $('#chat-m').attr("disabled", false);
    $('#chat-m').attr("placeholder", "Talk to the room!");
    $('#guess-m').attr("disabled", false);
    $('#guess-m').attr("placeholder", "Enter your guess");
    $('#guess-button').attr("disabled", false);
    $('#chat-button').attr("disabled", false);
    $('#give-up').attr("disabled", true);
    $('#give-up').hide();
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
      flashMessage('#no-wordlist-selected', 3000);
      return false;
    }

    var gameOptions = {
      timeOption: $('#time-option').val(),
      wordCountOption: $('#word-count-option').val(),
      wordLists: getWordListSelections()
    }

    $('#start-game').hide();
    $('#give-up').show();
    $('#chat-m').attr('disabled', true);
    $('#chat-button').attr('disabled', true);
    $('#chat-m').attr('placeholder', "You can't talk while you're drawing!");
    $('#guess-m').attr('disabled', true);
    $('#guess-m').attr('placeholder', "You can't guess your own drawings!");
    $('#guess-button').attr('disabled', true);

    socket.emit('start game', gameOptions);
    return false;
  });

  $('#give-up').click(function(e) {
    socket.emit('give up');
    return false;
  });

  $('#guess-form').submit(function(e) {
    e.preventDefault();
    if (!gameLogic.youAreDrawing) {
      var username = $('#name-modal-input').val();
      var guess = $('#guess-m').val();
      socket.emit('guess message', username, guess, $.now());
    }
    $('#guess-m').val('');
    return false;
  });

  $('#message-form').submit(function(e) {
    e.preventDefault();
    var username = $('#name-modal-input').val();
    var message = $('#chat-m').val();

    socket.emit('chat message', username, message, $.now());
    $('#chat-m').val('');
    return false;
  });

  $('#reset-default-options').click(function(e) {
    e.preventDefault();
    $('#time-option').val('120');
    $('#word-count-option').val('10');
    _.each($('#word-list-option input'), function(checkbox) {
      $(checkbox).prop('checked', true);
    });

    return false;
  });
  
  $('#mute-all-sounds').click(function(e) {
    e.preventDefault();
    $('#game-win-sound').val("0");
    $('#game-over-sound').val("0");
    $('#correct-sound').val("0");
    $('#skip-sound').val("0");

    return false;
  });

  $('#reset-default-sound-options').click(function(e) {
    e.preventDefault();
    $('#game-win-sound').val("0.2");
    $('#game-over-sound').val("0.2");
    $('#correct-sound').val("0.2");
    $('#skip-sound').val("0.2");

    return false;
  });

  $('#save-sound-options').click(function(e) {
    e.preventDefault();

    tadaVolume = $('#game-win-sound').val();
    gameOverVolume = $('#game-over-sound').val();
    correctVolume = $('#correct-sound').val();
    skipVolume = $('#skip-sound').val();
    adjustSoundVolumes();
  });

  socket.on('your turn', function(wordsToDraw) {
    console.log('your turn!');
    console.log(wordsToDraw);
    wordList = wordsToDraw;
    currentWord = wordList[0];
    $('.word').text(wordList[0]);
    gameLogic.youAreDrawing = true;
    $('#skip').attr('disabled', false);
    $('#clear').attr('disabled', false);
    $('#give-up').attr('disabled', false);
  });

  socket.on('start new game', function() {
    flashMessage('#game-start', 1500);
    $('#start-game').hide();
    $('#give-up').show();
    $('#start-game').attr("disabled", true);
    if (!gameLogic.youAreDrawing) {
      $('#skip').attr("disabled", true);
      $('#clear').attr("disabled", true);
      $('#give-up').attr("disabled", true);
    }
  });

  socket.on('give up', function() {
    resetBoard();

    gameOverSound.play();
    flashMessage('#game-over', 2000);
  });

  socket.on('clear guess list', function() {
    $('#guess-messages').empty();
  });

  socket.on('guess message', function(username, message, now) {
    var fullMessage = username + ": " + message;
    var listItem;

    if (correctGuess(message, currentWord)) {
      correctSound.play();
      listItem = $('<li class="correct">').text(fullMessage);
      listItem.attr('id', now);
      $("#correct-guess").text("Word was: " + currentWord + ", correct!");
      flashMessage('#correct-guess-box', 500);
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
    $('#guess-box').animate({ scrollTop: $('#guess-messages').prop("scrollHeight") }, 200);
  });

  socket.on('chat message', function(username, message, now) {
    var fullMessage = username + ": " + message;

    var listItem = $('<li>').text(fullMessage);
    listItem.attr('id', now);

    $('#chat-messages').append(listItem);
    $('#chat-box').animate({ scrollTop: $('#chat-messages').prop("scrollHeight") }, 200);
  });

  socket.on('user list updated', function(userList) {
    $('#user-list').empty();

    _.each(userList, function(user) {
      $('#user-list').append($('<li>').text(user.username));
    });
  });

  socket.on('user name change', function(oldUsername, newUsername) {
    var fullMessage = 'SYSTEM: ' + oldUsername + ' has changed their name to ' + newUsername;
    var listItem = $('<li>').text(fullMessage);
    listItem.attr('id', $.now);
    listItem.addClass('text-white bg-info');

    $('#chat-messages').append(listItem);
    $('#chat-box').animate({ scrollTop: $('#chat-messages').prop("scrollHeight") }, 200);
  });

  socket.on('current word', function(newWord) {
    currentWord = newWord;
  });

  socket.on('highlight guess', function(id) {
    $('#' + id).toggleClass('highlight');
  });

  socket.on('game win', function() {
    resetBoard();

    tada.play();
    flashMessage('#game-win', 3000);
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

    gameOverSound.play();
    $("div#time-out").text("Time's up! Word was: " + wordFailedOn);
    flashMessage('#time-out', 3000);
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
    skipSound.play();
    flashMessage('#skip-word', 500);
  });

  socket.on('game in progress', function() {
    $('#start-game').attr("disabled", true);
  });

  socket.on('word list selections', function(wordListSelections) {
    $('#word-list-option').empty();
    $('#word-list-option').append($('<label>Choose Word Lists</label>'));

    _.each(wordListSelections, function(wordList) {
      var input = $('<input class="custom-control-input"></input>');
      input.attr('value', wordList);
      input.attr('id', wordList + '-list');
      input.attr('type', 'checkbox');
      input.prop('checked', true);
      var label = $('<label class="custom-control-label word-list-label">' + wordList + '</label>');
      label.attr('for', wordList + '-list');
      var checkBox = $('<div class="custom-control custom-checkbox"></div>').append(input).append(label);

      $('#word-list-option').append(checkBox);
    });
  });
});
