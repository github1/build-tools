#!/usr/bin/env bash

readlink_f() {
  echo $(python -c "import os, sys; print os.path.realpath('$1')")
}

SCRIPTPATH=$(readlink_f ${0} | xargs dirname)
DIST=./dist

rm -rf "${DIST}"

if [[ -f "tsconfig.json" ]]; then
    TSC=$(dirname $(dirname $(node -p "require.resolve('typescript')")))/bin/tsc
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

MAIN=$(cat package.json | jq -r '.main' | sed 's|dist/||g' | sed 's|src/||g')
cat package.json | jq '.main = "es5/'"${MAIN}"'" | .module = "'"${MAIN}"'"' > "${DIST}/package.json"

if [[ -f "${AUX_PREPARE_SCRIPT}" ]]; then
  "${AUX_PREPARE_SCRIPT}" "${DIST}/"
fi
