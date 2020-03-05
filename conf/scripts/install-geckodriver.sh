#!/usr/bin/env bash

# download and install latest geckodriver for linux or mac.
# required for selenium to drive a firefox browser.

install_dir="/usr/local/bin"

[ -x "$(which geckodriver)" ] && (echo "geckodriver already exists"; exit)

json=$(curl -s https://api.github.com/repos/mozilla/geckodriver/releases/latest)

if [[ $(uname) == "Darwin" ]]; then
    url=$(echo "$json" | grep "browser_download_url" | grep macos | awk '{ print $2 }' | tr -d '"')
elif [[ $(uname) == "Linux" ]]; then
    url=$(echo "$json" | grep "browser_download_url" | grep linux64 | awk '{ print $2 }' | tr -d '"')
else
    echo "can't determine OS"
    exit 1
fi

echo "$url";
curl -s -L $url | tar -xz
chmod +x geckodriver
mv -f geckodriver "$install_dir"
echo "installed geckodriver binary in $install_dir"
geckodriver --version
