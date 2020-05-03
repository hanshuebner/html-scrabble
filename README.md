# Online multiplayer Scrabble with HTML/JavaScript UI

This is a fork of https://github.com/hanshuebner/html-scrabble via
https://github.com/cfrerebeau/html-scrabble.

Please visit the original project for information about the project's history
and features.

The purpose of this fork is to enable easy hosting of this app. on Heroku.

The main difference from the original is to enable storing game data in Redis,
rather than in the filesystem, as the original project does. Filesystem storage
will not work on Heroku, hence this fork.

## Deploying to Heroku

You will need a heroku account, and the `heroku` cli tool.

* Run `heroku login`
* Clone this repository and cd into the directory
* Run `make setup`

This will create a new Heroku application with Redis (for storage) and mailgun
for sending email invitations. It will then deploy the application, and finally
open your web browser (if you're on OSX) to show the running app.

### Sending email invitations

In order to get invitation emails to work, you will need to configure the
mailgun addon for the Heroku application. However, it is possible to play
without those - you can visit the application root url to see a list of games
in progress, and click on your player name to join the game as that player.
