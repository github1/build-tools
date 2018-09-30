#!/usr/bin/env node

const entry = require('../src/entry-point');
const webpack = require('webpack');
const appServer = require('@common/app-server');
const jest = require('jest-cli');

entry({
    webpack: webpack,
    appServer: appServer,
    jest: jest
}, (packageJSON) => require(packageJSON), process, (status) => {
    process.exit(status);
});

