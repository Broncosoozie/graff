var optionsHandler = {
  initializeGameOptions: function() {
    var timeOption = cookieHandler.readCookie('time-option') || '120';
    var wordCountOption = cookieHandler.readCookie('word-count-option') || '10';
    var wordListString = cookieHandler.readCookie('word-list-options');

    $('#time-option').val(timeOption);
    $('#word-count-option').val(wordCountOption);

    if (wordListString === undefined) {
      optionsHandler.selectDefaultWordLists();
    } else {
      var wordListArray = wordListString.split(',');
      _.each(wordListArray, function(wordList) {
        $('#' + _.kebabCase(wordList) + '-list').prop('checked', true);
      });
    }
  },

  resetDefaultOptions: function(e) {
    e.preventDefault();
    $('#time-option').val('120');
    $('#word-count-option').val('10');
    optionsHandler.selectDefaultWordLists();

    return false;
  },

  selectDefaultWordLists: function() {
    _.each($('#word-list-option input'), function(checkbox) {
      $(checkbox).prop('checked', true);
    });
  },

  saveGameOptions: function(e) {
    e.preventDefault();

    cookieHandler.createCookie('time-option', $('#time-option').val(), 10);
    cookieHandler.createCookie('word-count-option', $('#word-count-option').val(), 10);
    var wordListString = _.map($('#word-list-option input:checked'), function(wordList) {
      return $(wordList).val();
    });
    wordListString = wordListString.join(',');
    cookieHandler.createCookie('word-list-options', wordListString, 10);
  },

  uncheckAllWordLists: function() {
    _.each($('#word-list-option input'), function(checkbox) {
      $(checkbox).prop('checked', false);
    });
  }
}
