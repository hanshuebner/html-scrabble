
var ui = 0;

$(document).ready(function() {
    var socket = io.connect('http://localhost');
    socket.on('news', function (data) {
        console.log(data);
        socket.emit('my other event', { my: 'data' });
    });

    ui = new UI();
});
