#!/usr/bin/env bash

## start selenium

PORT=${1:-4444}

CURRENT_FOLDER=`pwd | grep -o '[^/]*$'`

if [ "$CURRENT_FOLDER" == "setup" ]; then
	echo "execute script from project root"
	exit
fi

[ ! -d "node_modules" ] && npm install

if [ ! -f "node_modules/.bin/selenium-standalone" ]; then
	npm install selenium-standalone
fi

./node_modules/.bin/selenium-standalone install --version=3.9.1 --drivers.chrome.version=2.45

SELENIUM_JAR="$(pwd)/node_modules/selenium-standalone/.selenium/selenium-server/3.9.1-server.jar"
GECKO="$(pwd)/node_modules/selenium-standalone/.selenium/geckodriver/0.23.0-x64-geckodriver"
CHROME_DRIVER="$(pwd)/node_modules/selenium-standalone/.selenium/chromedriver/2.45-x64-chromedriver"

{

	java -Dwebdriver.chrome.driver="$CHROME_DRIVER" \
     	-Dwebdriver.gecko.driver="$GECKO" \
     	-jar "$SELENIUM_JAR" &

} > /dev/null 2>&1

ps aux | grep "node_modules/selenium-standalone"
echo
echo "Selenium running on port $PORT"
