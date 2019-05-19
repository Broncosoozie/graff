var currentUser = {
  drawing: false,
  seated: false,

  sitDown: function(seatId, username, usericon) {
    currentUser.seated = true;
    currentUser.seatId = seatId;
    socket.emit('sit down', username, usericon, currentUser.seatId);
  },

  standUp: function(seatId) {
    currentUser.seated = false;
    currentUser.seatId = null;
    socket.emit('stand up', seatId);

    if (currentUser.drawing) {
      currentUser.drawing = false;
      socket.emit('give up');
    }
  },
};
