# Online multiplayer Scrabble with HTML/JavaScript UI

## History

This repository contains the code for a multiplayer Scrabble game.  I
have written it because my wife and I got increasingly frustrated by
the sluggish Web 1.0 interface that http://thepixiepit.co.uk/
provides.  Coming up with something better was on my To-Do-List for
years, but I never found enough time to get a decent board UI
implemented, and The Pixie Pit served us well enough through those
years.

Much to my pleasure, I stumbled over
http://code.google.com/p/html-scrabble/ one day, which implemented the
interactive parts of a Scrabble board in a very nice manner.  The
implementation was lacking the game logic and server parts, though, so
I decided to fork the project and add the missing pieces.

Little of the original board code is left now, but I owe the original
author, Daniel Weck, lots of kudos for getting CSS and Drag&Drop under
control.  Without his work, I'd not be able to get the game to run.  I
also owe an apology for ripping his code apart and removing the
dictionary functionality, as we are playing without a dictionary and
want to keep it that way.

## Features

* Two to four players
* German, English and French letter sets
* Written in JavaScript, runs in browser
* Scalable user interface
* Desktop notification support
* Moderate sound effects
* Tile placement by clicking, drag&drop or keyboard entry
* Chat
* Standard Scrabble rules including "Challenge" with simple penalty
* No dictionary enforced
* Player online status display
* Participation in multiple games from one browser possible
* Uses node.js on the server
* No database required, no deployment complexities

## Limitations

* Human players only.  No computer players are available.
* No dictionary.  Any word can be entered.
* No security.  The server uses sufficiently long random numbers as keys for
  games and players to make guessing a key impossible.  The game and player
  keys are enough to join the game and make moves, though.
* Limited browser support.  We're using Chrome and Firefox and I am not
  testing on other browsers.
* Unlicensed.  "Scrabble" is a registered trademark by Hasbro and Spear, and
  the word is used in this program without permission.
* Bugs.  There are some minor (and maybe even some major) bugs which I have
  not come around to fix yet, and maybe never will.
* Ugly code.  I did not understand much of the original code when I started
  adding features, and did not refactor thoroughly in the course of action.
  There are several things in the code that I'd do differently now, but as
  the game works well enough as it is, I'm not doing it.  If you want to
  hack this code, expect a high WTF rate.
* Ugly UI.  Daniel's original work was very nice-looking, and my additions
  to the user interface can't compete with what he did.
* UI not translated.  The user interface is available in English, only.
* Simple database.  All game data is kept in memory and serialized to a JSON
  log using the node-dirty database system.  This works well, but has limited
  capacity and the database file grows without bounds.

As I am not planning to provide the game as a public service, but rather
run it for me and my friends to use, these limitations do not bother me.
If you look at the game, please consider that it is a game meant to be
played between friends, not an Internet service open to the general public.

## Future changes

I am open to patch submissions as long as the playability of the game
is preserved.  In particular, we want no dictionary matching, fast
next game creation, no passwords, keyboard operability.  I also want
zero-effort deployment (i.e. no mandatory dependency on a database
server).

It would be somewhat nice to grow the game into a public service, but
there is a lot of work left towards that goal, and I don't intend to
make such an effort given the uncertain licensing issues.  If you want
to deal with the legal aspects, let me know.

## Installing

The game uses node.js as server and depends on some npm packages.  It can
itself be installed using npm:

```
$ npm install html-scrabble
```

## Configuration

Settings can be be changed by the way of a configuration file which
must be named 'config.js' and placed in the main html-scrabble
directory.  The default configuration file is included as
[config-default.json](html-scrabble/blob/master/config-default.json). It
can be copied to config.js and then edited.

By default, the server starts on port 9093 and uses the smtp server
running on the local host to send out game invitation emails.  The
invitation emails contain the "localhost" in the URL, so they will
only work for a browser running on the same machine as the server.

As a minimum, the ```baseUrl``` and ```mailSender``` configuration
properties should be changed.  Furthermore, if you are not running an
SMTP server on your server, you need to set the
```mailTransportConfig``` appropriately.  Please refer to [nodemailer
documentation](http://documentup.com/andris9/nodemailer/#setting-up-a-transport-method)
for information on how to configure nodemailer.

### Protecting the game list

If you deploy your Scrabble server in the Internet, you may want to
protect your game list so that pranksters can't mess up your games.
You can do so by adding a ```gameListLogin``` property to your
configuration like so:

```
    "gameListLogin": {
        "username": "foo",
        "password": "bar"
    }
```

Note that this is meant as a light protective measure.  Do not use a
password that you use elsewhere.  Thank you for observing all safety
measures.

## Running

Once you're satisfied with the configuration, you can start the game
server using

```
$ npm start html-scrabble
```

Open your web browser on the configured game URL to create a new game.

If you have trouble getting the server to run, feel free to contact
me.  Be aware, though, that you will need a machine to run the server
on (I'm using my Mac, but FreeBSD or Linux will work as well) and have
some command line knowledge.  I cannot help you if you don't know your
way through the shell and development tools.

Enjoy,
Hans (hans.huebner@gmail.com)
