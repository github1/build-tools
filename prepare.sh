#!/usr/bin/env bash

DIST="./dist"
cp -Rv bin config index.js index.d.ts package.json README.md "${DIST}/"
cp -Rv src/__mocks__ "${DIST}/src/__mocks__"
cp -v src/jest-helpers.js "${DIST}/src/"
cp -v src/jest-transform.tpl "${DIST}/src/"
chmod +x "${DIST}/bin/cli.js"
if [[ -f "${AUX_PREPARE_SCRIPT}" ]]; then
  "${AUX_PREPARE_SCRIPT}" "${DIST}/"
fi