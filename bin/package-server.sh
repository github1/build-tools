#!/usr/bin/env bash

set -e

function verify() {
  npm run -s test
}

function clean() {
  mkdir -p target/dist/public
  rm -rf target/dist/public/*
  rm target/dist/*.tar.gz
}

function installAppServer() {
  mkdir -p target/dist/public/app-server
  cp -R ../../packages/app-server/assets target/dist/public/app-server/assets
  cp -R ../../packages/app-server/bin target/dist/public/app-server/bin
  cp -R ../../packages/app-server/src target/dist/public/app-server/src
  cp -R ../../packages/app-server/templates target/dist/public/app-server/templates
  cp ../../packages/app-server/package.json target/dist/public/app-server/package.json
  cd target/dist/public/app-server
  npm install --production
  cd -
}

function bundle() {
  NODE_ENV=production ./node_modules/.bin/build-tools bundle
}

function installRuntimeDependencies() {
  STRIPPED_PACKAGE="$(head -n 3 package.json)$(sed 's/\"@common.*//g' <(tail -n +3 package.json) | awk 'NF')"
  echo "${STRIPPED_PACKAGE}" > target/dist/public/package.json
  cd target/dist/public
  npm install
  cd -
}

function copyAssets() {
  cp -R assets/ target/dist/public/assets/
}

function createArchive() {
  ARCHIVE_NAME="target/dist/$(cat target/dist/public/package.json | jq -r .name | sed -E 's/@([a-z]+)\///g').tar.gz"
  tar -czvf "${ARCHIVE_NAME}" -C target/dist/public .
}

echo "Packaging $(cat target/dist/public/package.json | jq -r .name)"

verify
clean
installAppServer
bundle
installRuntimeDependencies
copyAssets
createArchive