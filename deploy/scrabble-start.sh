#!/bin/sh
exec /usr/bin/su -m scrabble -c "/usr/local/bin/node /opt/scrabble/packages/server/dist/index.js"
