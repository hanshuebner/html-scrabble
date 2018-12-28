#!/bin/sh

jq 2>/dev/null -r '.val | {players: ( .endMessage.players )} | [ .players[] | ( .name, .score ) ] | @csv' data.db \
	| perl -ne '@_ = split(/,/); if ($_[1] > $_[3]) { print "$_[0]\n" } else { print "$_[2]\n"; }' \
	| sort \
	| uniq -c
