#!/usr/bin/env bash

DIST="./dist"
rm -rf "${DIST}"
mkdir -p "${DIST}"
cp -Rv bin config src index.js index.d.ts package.json README.md "${DIST}/"
if [[ -f "${AUX_PREPARE_SCRIPT}" ]]; then
  "${AUX_PREPARE_SCRIPT}" "${DIST}/"
fi