import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import * as webpack from 'webpack';
import * as appServer from '@github1/app-server';
import * as jest from 'jest';
import chalk from 'chalk';
import entryPoint from './entry-point';
import { TaskArgs, TaskLogger } from './types';
import processArgs from './process-args';

// intercept intellj jest run
const args = process.argv.slice(2);
if (
  args[0] !== 'test' &&
  args.filter((arg) => /jest-intellij-reporter/.test(arg)).length > 0
) {
  const child = require('child_process').execFile(
    __dirname + '/cli.js',
    ['test', ...args],
    {
      env: {
        ...process.env,
        NO_SERVER: 'true',
      },
    }
  );
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
  const args: TaskArgs = processArgs(process);
  const workDir = path.resolve(args.cwd) || process.cwd();
  const buildKey = Buffer.from(
    crypto.createHash('md5').update(workDir).digest('hex')
  )
    .toString('base64')
    .substring(0, 8);
  const buildCacheDir = path.join(
    '/tmp/build-tools/',
    path.basename(workDir),
    buildKey
  );
  fs.mkdirSync(buildCacheDir, { recursive: true });

  function prefixLog(prefix, ...args) {
    if (`${args[0]}`.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '').indexOf('[') !== 0) {
      args.unshift(prefix);
    }
    return args;
  }

  const taskLogger: TaskLogger = {
    info(...args) {
      console.error(...prefixLog(chalk.green('[info]'), ...args));
    },
    error(...args) {
      console.error(...prefixLog(chalk.red('[error]'), ...args));
    },
  };

  process.on('exit', function () {
    taskLogger.info(`cleaning ${buildCacheDir}`);
    fs.rmdirSync(buildCacheDir, { recursive: true });
  });

  process.on('SIGINT', function () {
    process.exit(1);
  });

  entryPoint({
    packageJsonLoader: (packageJson) => require(packageJson),
    logger: taskLogger,
    buildToolsDir: path.resolve(path.join(__dirname, '/../')),
    workDir,
    buildCacheDir,
    env: process.env,
    args,
    tools: {
      webpack,
      appServer,
      jest,
    },
  }).catch((err) => {
    taskLogger.error(err);
    process.exit(1);
  });
}
