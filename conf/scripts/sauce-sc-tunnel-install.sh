#!/usr/bin/env bash

wget https://saucelabs.com/downloads/sc-4.5.4-osx.zip -O /tmp/sc-osx.zip
unzip /tmp/sc-osx.zip

cp sc-4.5.4-osx/bin/sc /usr/local/bin/
rm sc-osx.zip
rm -rf sc-*

# example : sc -u $SAUCE_USERNAME -k $SAUCE_ACCESS_KEY
# sc -u $SAUCE_USERNAME -k $SAUCE_ACCESS_KEY --se-port 7777
