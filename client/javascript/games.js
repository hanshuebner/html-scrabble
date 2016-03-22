$(document).ready(function() {
    var table = $("table");
    table.append(addCreateGameLink());
    table.append(populateGamesList());
});

function populateGamesList() {
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
}

function addCreateGameLink() {
    return TD(null,
        A({ href: "/make-game.html" },
            "Create new game"));
}
