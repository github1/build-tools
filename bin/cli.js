#!/usr/bin/env node

const fs = require('fs');
require(fs.existsSync(`${__dirname}/../dist`)
  ? '../dist/src/cli-core'
  : '../src/cli-core');
