#!/usr/bin/env bash

readlink_f() {
  echo $(python -c "import os, sys; print os.path.realpath('$1')")
}

SCRIPTPATH=$(readlink_f ${0} | xargs dirname)
DIST=./dist

rm -rf "${DIST}"

if [[ -f "tsconfig.json" ]]; then
    TSC=$(dirname $(dirname $(node -p "require.resolve('typescript')")))/bin/tsc
    "${TSC}" --pretty --project tsconfig.json
else
    IGNORE="src/**/*.test.js"
    cp "${SCRIPTPATH}/../config/babelrc.json" .babelrc
    ${SCRIPTPATH}/../node_modules/.bin/babel src \
        --out-dir "${DIST}" \
        --ignore "${IGNORE}"
    rm .babelrc
fi

MAIN=$(cat package.json | jq -r '.main' | sed 's|dist/||g')
cat package.json | jq '.main = "'"${MAIN}"'" | .module = "'"${MAIN}"'"' > "${DIST}/package.json"
