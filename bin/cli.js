#!/usr/bin/env node

const fs = require('fs');

function logFiles(dir) {
  try {
    console.log('files in', dir);
    const files = fs.readdirSync(dir);
    // files object contains all files names
    // log them on console
    files.forEach(file => {
      console.log(file);
    });
  } catch (err) {
    console.log(err);
  }
}

logFiles('.');
logFiles(__dirname);
logFiles(__dirname + "/../");

let entry = require(fs.existsSync(`${__dirname}/../dist`) ? '../dist/src/entry-point' : '../src/entry-point');
if (entry.default) {
  entry = entry.default;
}
const webpack = require('webpack');
const appServer = require('@github1/app-server');
const jest = require('jest');

// intercept intellj jest run
const args = process.argv.slice(2);
if (args[0] !== 'test' && args.filter(arg => /jest-intellij-reporter/.test(arg)).length > 0) {
  const child = require('child_process').execFile(__dirname + '/cli.js', ['test', ...args], {
    env: {
      ...process.env,
      NO_SERVER: 'true'
    }
  });
  child.stdout.on('data', (data) => {
    console.log(data.toString());
  });
  child.stderr.on('data', (data) => {
    console.error(data.toString());
  });
  child.on('exit', (status) => {
    process.exit(status);
  });
} else {
  entry({
    webpack,
    appServer,
    jest
  }, (packageJSON) => require(packageJSON), process, (status) => {
    process.exit(status);
  });
}
