#!/usr/bin/env bash

set -e

function verify() {
  if [[ "${TEST}" != "false" && "${skip_tests}" != "true"  ]] && [[ "${skip_tests}" != "false" ]]; then
    echo "Verifying"
    npm run -s test
    npm run -s lint
  else
    echo "Skipping verification"
  fi
}

function clean() {
  echo "Cleaning"
  rm -rf ./target/dist
  mkdir -p ./target/dist
}

function install_app_server() {
  echo "Installing appServer"
  mkdir -p ./target/dist/public/app-server
  app_server_base_dir=$(node -p 'const path = require("path"); path.dirname(path.dirname(require.resolve("@github1/app-server")));')
  if [[ ! -d "${app_server_base_dir}" ]]; then
    app_server_base_dir=../../packages/app-server
  fi
  cp -R "${app_server_base_dir}/assets/" ./target/dist/public/app-server/assets/
  cp -R "${app_server_base_dir}/bin/" ./target/dist/public/app-server/bin/
  cp -R "${app_server_base_dir}/src/" ./target/dist/public/app-server/src/
  cp -R "${app_server_base_dir}/templates/" ./target/dist/public/app-server/templates/
  cp "${app_server_base_dir}/package.json" ./target/dist/public/app-server/package.json
  cd ./target/dist/public/app-server
  npm install --production --no-bin-links --loglevel=verbose
  cd -
}

function bundle() {
  echo "Bundling"
  NODE_ENV=production ./node_modules/.bin/build-tools bundle
}

function install_runtime_dependencies() {
  echo "Installing runtime dependencies"
  STRIPPED_PACKAGE="$(cat package.json | jq 'del(.devDependencies)' | jq '. | delpaths([paths|select(.[1]|tostring|test("@franklin.*"))])')"
  echo "${STRIPPED_PACKAGE}" > ./target/dist/public/package.json
  cd ./target/dist/public
  npm install --production --no-bin-links --loglevel=verbose
  cd -
}

function copy_assets() {
  echo "Copying assets"
  if [[ -d ./assets/ ]]; then
    cp -R --no-target-directory ./assets/ ./target/dist/public/assets
  fi
  if [[ -d ./mockData/ ]]; then
    cp -R ./mockData/ ./target/dist/public/mockData
  fi
}

function create_archive() {
  if [[ -z "${package_name}" ]]; then
    package_name=$(cat ./target/dist/public/package.json | jq -r .name | sed -E 's/@([a-z]+)\///g')
  fi
  if [[ -n "${PROJECT_VERSION}" ]]; then
    package_name="${package_name}-${PROJECT_VERSION}"
    echo ${PROJECT_VERSION} > ./target/dist/public/version.txt
  fi
  archive_name="./target/dist/${package_name}.tar.gz"
  echo "Creating archive ${archive_name}"
  tar -czvf "${archive_name}" -C ./target/dist/public .
  echo "Created archive ${archive_name}"
}

echo "Packaging $(cat package.json | jq -r .name)"

verify
clean
install_app_server
bundle
install_runtime_dependencies
copy_assets
create_archive