#!/usr/bin/env bash

readlink_f() {
  echo $(python -c "import os, sys; print(os.path.realpath('$1'))")
}

SCRIPTPATH=$(readlink_f ${0} | xargs dirname)

function log() {
  >&2 echo "$PROJECT_NAME - $@"
}

function clean() {
  log "clean"
  rm -rf "${DIST}"
}

function transpile() {
  log "transpile"
  if [[ "${PROJECT_TYPE}" == 'ts' ]]; then
      TSDIR=$(dirname $(dirname $(node -p "require.resolve('typescript')")))
      log "using typescript version $(cat "${TSDIR}/package.json" | jq -r .version) from ${TSDIR}"
      TSC="${TSDIR}/bin/tsc"
      "${TSC}" --pretty --project tsconfig.json --outDir "${DIST}"
      "${TSC}" --pretty --project tsconfig.json --module "commonjs" --outDir "${DIST}/es5"
  else
      IGNORE="src/**/*.test.js"
      cp "${SCRIPTPATH}/../config/babelrc.json" .babelrc
      ${SCRIPTPATH}/../node_modules/.bin/babel src \
          --out-dir "${DIST}" \
          --ignore "${IGNORE}"
      sed -i '' 's|false|"commonjs"|g' .babelrc
      ${SCRIPTPATH}/../node_modules/.bin/babel src \
          --out-dir "${DIST}/es5" \
          --ignore "${IGNORE}"
      rm .babelrc
  fi
}

function prepareDist() {
  log "prepare dist"

  local l_MAIN=$(cat package.json | jq -r ".main" | sed 's|dist/||g' | sed 's|src/||g' | sed 's/\.ts$/.js/g')
  if [[ -z "${VAL}" ]] || [[ "${VAL}" == 'null' ]]; then
    l_MAIN="index.js"
  fi
  PACKAGE_JSON=$(echo "${PACKAGE_JSON}" | jq '.main = "es5/'"${l_MAIN}"'" | .module = "'"${l_MAIN}"'"')
  if [[ "${PROJECT_TYPE}" == 'ts' ]]; then
    local l_TYPES=$(echo "${l_MAIN}" | sed 's/\.js$/.d.ts/g')
    PACKAGE_JSON=$(echo "${PACKAGE_JSON}" | jq '.types = "'"${l_TYPES}"'"')
  fi

  log "writing package.json"
  echo "${PACKAGE_JSON}" > "${DIST}/package.json"

  if [[ -d "./bin" ]]; then
    cp -R ./bin "${DIST}/bin"
  fi
}

function main() {
  DIST=./dist
  PACKAGE_JSON=$(cat package.json)
  PROJECT_NAME=$(echo "${PACKAGE_JSON}" | jq -r .name)
  PROJECT_TYPE=js
  if [[ -f "tsconfig.json" ]]; then
    PROJECT_TYPE=ts
  fi
  clean
  transpile
  prepareDist
  if [[ -f "${AUX_PREPARE_SCRIPT}" ]]; then
    log "running AUX_PREPARE_SCRIPT ${AUX_PREPARE_SCRIPT}"
    "${AUX_PREPARE_SCRIPT}" "${DIST}/"
  fi
}

main