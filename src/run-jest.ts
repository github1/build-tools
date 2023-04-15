import { TaskContext, TaskError, TaskResult } from './types';
import * as path from 'path';
import { Config as JestConfig } from '@jest/types';
import * as fs from 'fs';
import chalk from 'chalk';
import { prepareBabelOptions } from './prepare-babel-options';
import { Argv } from '@jest/types/build/Config';
import { prepareAppServerExtensions } from './prepare-app-server-extensions';
import getPort = require('get-port');

export async function runJest(taskContext: TaskContext): Promise<TaskResult> {
  const { buildCacheDir, workDir, args, tools } = taskContext;
  let taskResultDeferredPromiseResolve = null;
  const taskResultDeferredPromise = new Promise((resolve) => {
    taskResultDeferredPromiseResolve = resolve;
  });
  const jestRunExtension = (port?: number, testURL?: string) => ({
    onStart: () => {
      const jestTransform = path.join(buildCacheDir, 'jest-transform.js');
      let jestConfig: JestConfig.InitialOptions = {
        maxWorkers: 4,
        verbose: true,
        rootDir: workDir,
        testEnvironment: 'jsdom',
        testEnvironmentOptions: {
          url: testURL || 'http://localhost',
        },
        testRegex: '.*\\.test\\.(js|tsx?)$',
        globals: {},
        testPathIgnorePatterns: ['/node_modules/', '/dist/'],
        moduleFileExtensions: ['js', 'ts', 'tsx', 'json'],
        moduleDirectories: ['node_modules'],
        collectCoverageFrom: ['src/**/*.{js,jsx,ts,tsx}'],
        watchPathIgnorePatterns: ['dist', 'target'],
        moduleNameMapper: {
          '\\.(css|sass|scss)$': `${__dirname}/__mocks__/style-mock.js`,
        },
        modulePathIgnorePatterns: ['/node_modules/', '/dist/'],
        transform: {
          '^.+\\.js$': jestTransform,
          '^.+\\.tsx?$': require.resolve('ts-jest'),
        },
        transformIgnorePatterns: ['/node_modules/(?!@github1).+$'],
        setupFiles: [],
      };
      jestConfig.setupFiles = [require.resolve('./jest-helpers.js')];
      // tslint:disable-next-line:non-literal-fs-path
      if (fs.existsSync(path.join(workDir, 'jestSetup.js'))) {
        jestConfig.setupFiles.push('<rootDir>/jestSetup.js');
      }
      if (port !== undefined) {
        (jestConfig.globals as any).__JEST_MOCK_SERVER_PORT__ = port;
      }
      if (testURL !== undefined) {
        (jestConfig.globals as any).__JEST_MOCK_SERVER__ = testURL;
      }
      const jestConfiguratorFile = path.join(workDir, 'jest.config.js');
      // tslint:disable-next-line:non-literal-fs-path
      if (fs.existsSync(jestConfiguratorFile)) {
        // tslint:disable-next-line:non-literal-require
        const jestConfigurator = require(jestConfiguratorFile);
        taskContext.logger.info(
          chalk.blue('[test]'),
          chalk.black(`using ${jestConfiguratorFile}`)
        );
        if (typeof jestConfigurator === 'function') {
          jestConfig = jestConfigurator(jestConfig);
        } else {
          jestConfig = jestConfigurator;
        }
      }
      const jestConfigFile = path.join(buildCacheDir, 'jest-config.json');
      // tslint:disable-next-line:non-literal-fs-path
      const jestTransformTemplate = fs
        .readFileSync(path.join(__dirname, 'jest-transform.tpl'))
        .toString();
      const jestTransformContent = jestTransformTemplate
        .replace(/\$BABEL_CONFIG/, JSON.stringify(prepareBabelOptions()))
        .replace(/\$BABEL_JEST/, require.resolve('babel-jest'));
      // tslint:disable-next-line:non-literal-fs-path
      fs.writeFileSync(jestTransform, jestTransformContent);
      // tslint:disable-next-line:non-literal-fs-path
      fs.writeFileSync(jestConfigFile, JSON.stringify(jestConfig));
      const jestCLIArgs: Argv = {
        $0: '',
        _: [],
      };
      const validJestArgs: string[] = [
        'all',
        'automock',
        'bail',
        'cache',
        'cacheDirectory',
        'changedFilesWithAncestor',
        'changedSince',
        'ci',
        'clearCache',
        'clearMocks',
        'collectCoverage',
        'collectCoverageFrom',
        'collectCoverageOnlyFrom',
        'color',
        'colors',
        'config',
        'coverage',
        'coverageDirectory',
        'coveragePathIgnorePatterns',
        'coverageReporters',
        'coverageThreshold',
        'debug',
        'env',
        'expand',
        'findRelatedTests',
        'forceExit',
        'globals',
        'globalSetup',
        'globalTeardown',
        'haste',
        'init',
        'injectGlobals',
        'json',
        'lastCommit',
        'logHeapUsage',
        'maxWorkers',
        'moduleDirectories',
        'moduleFileExtensions',
        'moduleNameMapper',
        'modulePathIgnorePatterns',
        'modulePaths',
        'noStackTrace',
        'notify',
        'notifyMode',
        'onlyChanged',
        'onlyFailures',
        'outputFile',
        'preset',
        'projects',
        'prettierPath',
        'resetMocks',
        'resetModules',
        'resolver',
        'restoreMocks',
        'rootDir',
        'roots',
        'runInBand',
        'selectProjects',
        'setupFiles',
        'setupFilesAfterEnv',
        'showConfig',
        'silent',
        'snapshotSerializers',
        'testEnvironment',
        'testFailureExitCode',
        'testMatch',
        'testNamePattern',
        'testPathIgnorePatterns',
        'testPathPattern',
        'testRegex',
        'testResultsProcessor',
        'testRunner',
        'testSequencer',
        'testURL',
        'testTimeout',
        'timers',
        'transform',
        'transformIgnorePatterns',
        'unmockedModulePathPatterns',
        'updateSnapshot',
        'useStderr',
        'verbose',
        'version',
        'watch',
        'watchAll',
        'watchman',
        'watchPathIgnorePatterns',
      ];
      for (const validJestArg of validJestArgs) {
        if (args[validJestArg]) {
          jestCLIArgs[validJestArg] = args[validJestArg];
        }
      }
      if (jestCLIArgs.reporters && !Array.isArray(jestCLIArgs.reporters)) {
        jestCLIArgs.reporters = [jestCLIArgs.reporters];
      }
      jestCLIArgs.config = jestConfigFile;
      const testFileToRun = args.testFile || args.runTestsByPath;
      if (testFileToRun) {
        // run specific test file
        jestCLIArgs._ = [`${testFileToRun}`];
      }
      process.chdir(workDir);
      const jestResult = tools.jest.runCLI(jestCLIArgs, [workDir]);
      if (jestResult && jestResult.then) {
        const jestPromiseResult = (jestResult.then((res) => {
          if (res.results.numFailedTests > 0) {
            throw new TaskError(`${res.results.numFailedTests} failed tests`);
          }
        }));
        taskResultDeferredPromiseResolve(jestPromiseResult);
      } else {
        throw new TaskError('no jest results');
      }
    },
  });
  if (args.useServer || args.withServer) {
    await getPort().then((port: number) => {
      const testURL = `http://localhost:${port}/`;
      tools.appServer(
        prepareAppServerExtensions(
          args.webpackDevServer === undefined || args.webpackDevServer,
          jestRunExtension(port, testURL),
          taskContext
        ),
        port
      );
    });
  } else {
    jestRunExtension().onStart();
  }
  return taskResultDeferredPromise;
}
