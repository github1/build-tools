#!/usr/bin/env bash

set -e

function verify() {
  echo "Verifying"
  npm run -s test
  npm run -s lint
}

function clean() {
  echo "Cleaning"
  mkdir -p target/dist/public
  rm -rf target/dist/public/*
  rm -rf target/dist/*.tar.gz
}

function installAppServer() {
  echo "Installing appServer"
  mkdir -p target/dist/public/app-server
  APP_SERVER_BASE=$(node -p 'const path = require("path"); path.dirname(path.dirname(require.resolve("@github1/app-server")));')
  if [[ ! -d "${APP_SERVER_BASE}" ]]; then
    APP_SERVER_BASE=../../packages/app-server
  fi
  cp -R "${APP_SERVER_BASE}/assets" target/dist/public/app-server/assets
  cp -R "${APP_SERVER_BASE}/bin" target/dist/public/app-server/bin
  cp -R "${APP_SERVER_BASE}/src" target/dist/public/app-server/src
  cp -R "${APP_SERVER_BASE}/templates" target/dist/public/app-server/templates
  cp "${APP_SERVER_BASE}/package.json" target/dist/public/app-server/package.json
  cd target/dist/public/app-server
  npm install --production --loglevel=verbose
  cd -
}

function bundle() {
  echo "Bundling"
  NODE_ENV=production ./node_modules/.bin/build-tools bundle
}

function installRuntimeDependencies() {
  echo "Installing runtime dependencies"
  STRIPPED_PACKAGE="$(head -n 3 package.json)$(sed -E 's/\"@(franklin|common).*//g' <(tail -n +3 package.json) | awk 'NF')"
  echo "${STRIPPED_PACKAGE}" > target/dist/public/package.json
  cd target/dist/public
  npm install --production --loglevel=verbose
  cd -
}

function copyAssets() {
  echo "Copying assets"
  if [[ -d assets/ ]]; then
    cp -R assets/ target/dist/public/assets/
  fi
}

function createArchive() {
  if [[ -z "${PACKAGE_NAME}" ]]; then
    PACKAGE_NAME=$(cat target/dist/public/package.json | jq -r .name | sed -E 's/@([a-z]+)\///g')
  fi
  if [[ -n "${PROJECT_VERSION}" ]]; then
    PACKAGE_NAME="${PACKAGE_NAME}-${PROJECT_VERSION}"
  fi
  ARCHIVE_NAME="target/dist/${PACKAGE_NAME}.tar.gz"
  echo "Creating archive ${ARCHIVE_NAME}"
  tar -czvf "${ARCHIVE_NAME}" -C target/dist/public .
  echo "Created archive ${ARCHIVE_NAME}"
}

echo "Packaging $(cat package.json | jq -r .name)"

verify
clean
installAppServer
bundle
installRuntimeDependencies
copyAssets
createArchive