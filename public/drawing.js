'use strict';

var drawing = {
  currentlyDrawing: false
};

drawing.initialize = function(socket, gameLogic) {
  var canvas = document.getElementsByClassName('whiteboard')[0];
  var colors = document.getElementsByClassName('color');
  var context = canvas.getContext('2d');
  var offsetX = $('.whiteboard').offset().left;
  var offsetY = $('.whiteboard').offset().top;

  var current = {
    color: 'black'
  };

  canvas.addEventListener('mousedown', onMouseDown, false);
  canvas.addEventListener('mouseup', onMouseUp, false);
  canvas.addEventListener('mouseout', onMouseUp, false);
  canvas.addEventListener('mousemove', throttle(onMouseMove, 10), false);
  
  //Touch support for mobile devices
  canvas.addEventListener('touchstart', onMouseDown, false);
  canvas.addEventListener('touchend', onMouseUp, false);
  canvas.addEventListener('touchcancel', onMouseUp, false);
  canvas.addEventListener('touchmove', throttle(onMouseMove, 10), false);

  for (var i = 0; i < colors.length; i++){
    colors[i].addEventListener('click', onColorUpdate, false);
  }

  $('.color').removeClass('highlight-color');
  $('.' + current.color).addClass('highlight-color');

  socket.on('drawing', onDrawingEvent);

  socket.on('clear canvas', onLoad);

  window.addEventListener('scroll', onScroll, false);
  window.addEventListener('resize', onResize, false);
  onLoad();


  function drawLine(x0, y0, x1, y1, color, emit){
    context.beginPath();
    if (color !== "eraser") {
      context.globalCompositeOperation="source-over";
      context.moveTo(x0, y0);
      context.lineTo(x1, y1);
      context.strokeStyle = color;
      context.lineWidth = 4;
      context.stroke();
      context.closePath();
    } else {
      context.globalCompositeOperation="destination-out";
      context.arc(x0, y0, 10, 0, Math.PI*2, false);
      context.fill();
    }

    if (!emit) { return; }
    var w = canvas.width;
    var h = canvas.height;

    socket.emit('drawing', {
      x0: x0 / w,
      y0: y0 / h,
      x1: x1 / w,
      y1: y1 / h,
      color: color
    });
  }

  function onMouseDown(e){
    if (gameLogic.youAreDrawing) {
      drawing.currentlyDrawing = true;
      current.x = e.clientX - offsetX;
      current.y = e.clientY - offsetY;
    }
  }

  function onMouseUp(e){
    if (!drawing.currentlyDrawing || !gameLogic.youAreDrawing) { return; }
    drawing.currentlyDrawing = false;
    var whereWeAreGoingX = e.clientX - offsetX;
    var whereWeAreGoingY = e.clientY - offsetY;
    if (whereWeAreGoingX == current.x && whereWeAreGoingY == current.y) {
      context.arc(current.x, current.y, 2, 0, Math.PI*2, false);
      context.fill();
    }
    drawLine(current.x, current.y, whereWeAreGoingX, whereWeAreGoingY, current.color, true);
  }

  function onMouseMove(e){
    if (!drawing.currentlyDrawing || !gameLogic.youAreDrawing) { return; }
    var whereWeAreGoingX = e.clientX - offsetX;
    var whereWeAreGoingY = e.clientY - offsetY;
    drawLine(current.x, current.y, whereWeAreGoingX, whereWeAreGoingY, current.color, true);
    current.x = e.clientX - offsetX;
    current.y = e.clientY - offsetY;
  }

  function onColorUpdate(e){
    current.color = e.target.className.split(' ')[1];
    if (current.color === "eraser") {
      $('.color').removeClass('highlight-color');
      $('.color.eraser').addClass('highlight-eraser');
      $('.drawing-area').addClass('eraser');
    } else {
      $('.color').removeClass('highlight-color');
      $('.color.eraser').removeClass('highlight-eraser');
      $('.' + current.color).addClass('highlight-color');
      $('.drawing-area').removeClass('eraser');
    }
  }

  // limit the number of events per second
  function throttle(callback, delay) {
    var previousCall = new Date().getTime();
    return function() {
      var time = new Date().getTime();

      if ((time - previousCall) >= delay) {
        previousCall = time;
        callback.apply(null, arguments);
      }
    };
  }

  function onDrawingEvent(data){
    var w = canvas.width;
    var h = canvas.height;
    drawLine(data.x0 * w, data.y0 * h, data.x1 * w, data.y1 * h, data.color);
  }

  function onLoad() {
    canvas.width = 640;
    canvas.height = 480;
  }

  function onResize() {
    offsetX = $('.whiteboard').offset().left;
    offsetY = $('.whiteboard').offset().top;
  }

  function onScroll() {
    offsetY = $('.whiteboard').offset().top - $(document).scrollTop();
  }
};
