$(document).ready(function() {
    var gameNumber = 1;
    $.getJSON('/games', function(data) {
        $('table').append(data.map(function(game) {
            return TR(null,
                      TD(null, gameNumber++),
                      game.players.map(function(player) {
                          return TD(null,
                                    A({ href: '/game/' + game.key + '/' + player.key },
                                      player.name))
                      }))
        }));
    });
});
