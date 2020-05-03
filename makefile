server:
	node server.js

# Auto-restart on code changes
# requires `npm install nodemon --global`
server-development:
	nodemon server.js

redis-start:
	docker run --rm -p 6379:6379 redis

##### Heroku

# Create a new app. with redis & mailgun addons
setup:
	heroku apps:create
	heroku addons:create heroku-redis:hobby-dev
	heroku addons:create mailgun:starter
	git push heroku master
	heroku open

deploy:
	git push heroku master

# Erase all data from the Heroku redis
reset:
	redis_url=$$(heroku config:get REDIS_URL); \
						password=$$(echo $$redis_url | sed 's/redis...h:\(.*\)@.*/\1/'); \
						host=$$(echo $$redis_url | sed 's/.*@\(.*\):.*/\1/'); \
						port=$$(echo $$redis_url | sed 's/.*:\(.*\)/\1/'); \
						redis-cli -h $$host -p $$port -a $$password flushall
	heroku restart
