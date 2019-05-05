var soundHandler = {
  tada: new Audio('sounds/tada.flac'),
  gameOverSound: new Audio('sounds/gameOver.wav'),
  correctSound: new Audio('sounds/correct.wav'),
  skipSound: new Audio('sounds/skip.wav'),

  initializeAudio: function() {
    soundHandler.tadaVolume = cookieHandler.readCookie('tadaVolume') || 0.2;
    soundHandler.gameOverVolume = cookieHandler.readCookie('gameOverVolume') || 0.2;
    soundHandler.correctVolume = cookieHandler.readCookie('correctVolume') || 0.2;
    soundHandler.skipVolume = cookieHandler.readCookie('skipVolume') || 0.2;

    $('#game-win-sound').val(soundHandler.tadaVolume);
    $('#game-over-sound').val(soundHandler.gameOverVolume);
    $('#correct-sound').val(soundHandler.correctVolume);
    $('#skip-sound').val(soundHandler.skipVolume);

    soundHandler.adjustSoundVolumes();
  },

  adjustSoundVolumes: function() {
    cookieHandler.createCookie('tadaVolume', soundHandler.tadaVolume, 10);
    cookieHandler.createCookie('gameOverVolume', soundHandler.gameOverVolume, 10);
    cookieHandler.createCookie('correctVolume', soundHandler.correctVolume, 10);
    cookieHandler.createCookie('skipVolume', soundHandler.skipVolume, 10);

    soundHandler.tada.volume = soundHandler.tadaVolume;
    soundHandler.gameOverSound.volume = soundHandler.gameOverVolume;
    soundHandler.correctSound.volume = soundHandler.correctVolume;
    soundHandler.skipSound.volume = soundHandler.skipVolume;
  },

  muteAllSounds: function(e) {
    e.preventDefault();
    $('#game-win-sound').val("0");
    $('#game-over-sound').val("0");
    $('#correct-sound').val("0");
    $('#skip-sound').val("0");

    return false;
  },

  resetDefaultSoundOptions: function(e) {
    e.preventDefault();
    $('#game-win-sound').val("0.2");
    $('#game-over-sound').val("0.2");
    $('#correct-sound').val("0.2");
    $('#skip-sound').val("0.2");

    return false;
  },

  saveSoundOptions: function(e) {
    e.preventDefault();

    soundHandler.tadaVolume = $('#game-win-sound').val();
    soundHandler.gameOverVolume = $('#game-over-sound').val();
    soundHandler.correctVolume = $('#correct-sound').val();
    soundHandler.skipVolume = $('#skip-sound').val();
    soundHandler.adjustSoundVolumes();
  }
}
