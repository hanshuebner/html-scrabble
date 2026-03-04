CREATE TABLE "game_players" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"game_id" uuid NOT NULL,
	"user_id" uuid,
	"player_index" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"key" varchar(32) NOT NULL,
	"score" integer DEFAULT 0 NOT NULL,
	"rack" jsonb NOT NULL,
	"tally_score" integer
);
--> statement-breakpoint
CREATE TABLE "games" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" varchar(32) NOT NULL,
	"language" varchar(32) NOT NULL,
	"board_state" jsonb NOT NULL,
	"letter_bag" jsonb NOT NULL,
	"whos_turn" integer,
	"passes" integer DEFAULT 0 NOT NULL,
	"previous_move" jsonb,
	"end_message" jsonb,
	"next_game_key" varchar(32),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "games_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "head_to_head" (
	"user_id" uuid NOT NULL,
	"opponent_id" uuid NOT NULL,
	"wins" integer DEFAULT 0 NOT NULL,
	"losses" integer DEFAULT 0 NOT NULL,
	"draws" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "head_to_head_user_id_opponent_id_pk" PRIMARY KEY("user_id","opponent_id")
);
--> statement-breakpoint
CREATE TABLE "turns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"game_id" uuid NOT NULL,
	"turn_number" integer NOT NULL,
	"player_index" integer NOT NULL,
	"type" varchar(32) NOT NULL,
	"score" integer DEFAULT 0 NOT NULL,
	"move_data" jsonb,
	"timestamp" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_stats" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"games_played" integer DEFAULT 0 NOT NULL,
	"games_won" integer DEFAULT 0 NOT NULL,
	"total_score" integer DEFAULT 0 NOT NULL,
	"highest_score" integer DEFAULT 0 NOT NULL,
	"highest_word_score" integer DEFAULT 0 NOT NULL,
	"highest_word" varchar(255),
	"average_score" integer DEFAULT 0 NOT NULL,
	"total_tiles_placed" integer DEFAULT 0 NOT NULL,
	"bingo_count" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"name" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "game_players" ADD CONSTRAINT "game_players_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_players" ADD CONSTRAINT "game_players_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "head_to_head" ADD CONSTRAINT "head_to_head_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "head_to_head" ADD CONSTRAINT "head_to_head_opponent_id_users_id_fk" FOREIGN KEY ("opponent_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "turns" ADD CONSTRAINT "turns_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_stats" ADD CONSTRAINT "user_stats_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "game_players_game_id_idx" ON "game_players" USING btree ("game_id");--> statement-breakpoint
CREATE INDEX "games_key_idx" ON "games" USING btree ("key");--> statement-breakpoint
CREATE INDEX "turns_game_id_idx" ON "turns" USING btree ("game_id");