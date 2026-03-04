ALTER TABLE "game_players" DROP CONSTRAINT "game_players_game_id_games_id_fk";
--> statement-breakpoint
ALTER TABLE "turns" DROP CONSTRAINT "turns_game_id_games_id_fk";
--> statement-breakpoint
ALTER TABLE "game_players" ADD CONSTRAINT "game_players_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "turns" ADD CONSTRAINT "turns_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;