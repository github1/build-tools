import * as path from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';
import chalk from 'chalk';
import {sync as mkdirpsync} from 'mkdirp';
import * as rimraf from 'rimraf';
import * as getPort from 'get-port';
import * as open from 'open';
import * as webpack from 'webpack';
import * as express from 'express';
// tslint:disable-next-line:no-implicit-dependencies
import { runCLI } from '@jest/core';
// tslint:disable-next-line:no-implicit-dependencies
import { Config as JestConfig } from '@jest/types';
// tslint:disable-next-line:no-implicit-dependencies
import { AggregatedResult as JestAggregatedResult } from '@jest/test-result';
import processArgs from './process-args';
// tslint:disable-next-line:no-var-requires
const nodeExternals = require('webpack-node-externals');

export interface BuildTools {
  webpack : typeof webpack;
  jest : { runCLI: typeof runCLI };
  appServer : any;
}

export type ExitHandler = (status? : number) => void;

export interface TaskResult {
  handler? : ExitHandler;
}

// tslint:disable-next-line:no-default-export
export default (tools : BuildTools,
                  packageJsonLoader : (pkg : string) => any,
                  process : NodeJS.Process,
                  outerExit : ExitHandler) => {
  return new Promise((resolve : (value? : TaskResult) => void) => {

    const workDir = process.cwd();
    const args = processArgs(process);
    const buildKey = Buffer.from(crypto
      .createHash('md5')
      .update(workDir)
      .digest('hex'))
      .toString('base64')
      .substring(0, 8);
    const buildCacheDir = path.join('/tmp/build-tools/', path.basename(workDir), buildKey);
    mkdirpsync(buildCacheDir);

    // exit in the context of the promise
    const exit = (status : number) => {
      rimraf(buildCacheDir, () => '');
      resolve({
        handler: () => outerExit(status)
      });
    };

    // do not terminate the process
    const keepRunning = resolve;

    const resolveBabelModules = (entry : any | string[]) => {
      if (Array.isArray(entry)) {
        entry[0] = require.resolve(entry[0]);
        return entry;
      }
      return require.resolve(entry);
    };

    const babelOptions = {
      presets: [
        'babel-preset-env',
        'babel-preset-stage-3',
        'babel-preset-react'
      ].map(resolveBabelModules),
      plugins: [
        'babel-plugin-closure-elimination',
        'babel-plugin-transform-remove-strict-mode',
        ['babel-plugin-inline-import', {
          extensions: [
            '.inline.test.js'
          ]
        }]
      ].map(resolveBabelModules)
    };

    require('ignore-styles')
      .default(['.less', '.scss', '.css']);
    // tslint:disable-next-line:no-submodule-imports
    require('babel-core/register')(babelOptions);

    /**
     * Prepares the webpack config.
     */
    const prepareWebpackConfig = () : webpack.Configuration => {
      // const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
      // tslint:disable-next-line:variable-name
      const MiniCssExtractPlugin = require('mini-css-extract-plugin');
      const extractCss = new MiniCssExtractPlugin({
        filename: 'assets/[name].css',
        chunkFilename: '[id].css'
      });
      const packageJson = packageJsonLoader(path.join(workDir, 'package.json'));
      const postCssPlugins = [require('autoprefixer')];
      if (process.env.NODE_ENV === 'production') {
        postCssPlugins.push(require('cssnano')({
          preset: 'default'
        }));
      }
      const styleLoader = process.env.INLINE_STYLE ? require.resolve('style-loader') : MiniCssExtractPlugin.loader;
      const webpackConfig : webpack.Configuration = {
        context: workDir,
        entry: {
          main: [
            require.resolve('idempotent-babel-polyfill'),
            './src/index']
        },
        resolve: {
          extensions: ['.ts', '.tsx', '.js']
        },
        mode: (process.env.NODE_ENV || 'development') as any,
        optimization: {
          minimize: process.env.NODE_ENV === 'production'
        },
        plugins: [
          //new BundleAnalyzerPlugin(),
          extractCss
        ],
        module: {
          rules: [{
            test: /\.inline.*([jt])sx?$/,
            exclude: /(node_modules)/,
            use: {
              loader: require.resolve('raw-loader')
            }
          }, {
            test: /\.js$/,
            exclude: /(node_modules)/,
            use: {
              loader: require.resolve('babel-loader'),
              options: babelOptions
            }
          }, {
            test: /\.ts(x?)$/,
            exclude: /(node_modules)/,
            use: [{
              loader: require.resolve('babel-loader'),
              options: babelOptions
            }, {
              loader: 'ts-loader'
            }]
          }, {
            test: /\.less$/,
            use: [{
              loader: styleLoader
            }, {
              loader: require.resolve('css-loader')
            }, {
              loader: require.resolve('postcss-loader'),
              options: {
                plugins: postCssPlugins
              }
            }, {
              loader: require.resolve('less-loader')
            }]
          }, {
            test: /\.(scss|sass)$/,
            use: [{
              loader: styleLoader
            }, {
              loader: require.resolve('css-loader')
            }, {
              loader: require.resolve('postcss-loader'),
              options: {
                plugins: postCssPlugins
              }
            }, {
              loader: require.resolve('resolve-url-loader'),
              options: {engine: 'rework'}
            }, {
              loader: require.resolve('sass-loader'),
              options: {sourceMap: process.env.SASS_SOURCE_MAP !== 'false'}
            }]
          },
            {
              test: /\.(png|woff|woff2|eot|ttf|svg)$/,
              loader: require.resolve('url-loader'),
              options: {
                limit: 10000
              }
            }]
        },
        output: {
          library: packageJson.name,
          libraryTarget: 'umd',
          path: path.join(workDir, './target/dist/public'),
          filename: 'assets/[name].bundle.js'
        },
        externals: [
          (context : any, request : any, callback : webpack.ExternalsFunctionCallback) => {
            if (/^@api\//.test(request)) {
              return callback(undefined, request);
            }
            callback();
          }
        ],
        devtool: (process.env.NODE_ENV === 'production' ? false : 'source-map') as webpack.Options.Devtool
      };
      if (args.entry) {
        webpackConfig.entry = args.entry.split(',')
          .reduce((entries : any, entry : string) => {
            const name = entry.split(':')[0];
            const path = entry.split(':')[1];
            if (name.trim().length > 0) {
              entries[name] = path;
            }
            return entries;
          }, {});
      }
      if (args.nodeExternals) {
        if (Array.isArray(webpackConfig.externals)) {
          webpackConfig.externals.unshift(nodeExternals());
        }
      }
      if (args.outputDir) {
        webpackConfig.output = {
          path: path.join(workDir, args.outputDir)
        };
      }
      if (args.outputFilename) {
        webpackConfig.output.filename = args.outputFilename;
      }
      return webpackConfig;
    };

    /**
     * Prepares the webpack config for server code.
     */
    const prepareWebpackConfigServer = () : webpack.Configuration => {
      const packageJson = packageJsonLoader(path.join(workDir, 'package.json'));
      const config : webpack.Configuration = {
        context: workDir,
        target: 'node',
        entry: {
          server: './server.js'
        },
        mode: (process.env.NODE_ENV || 'development') as any,
        optimization: {
          minimize: false
        },
        module: {
          rules: [{
            test: /\.jsx?$/,
            exclude: /(node_modules)/,
            use: {
              loader: require.resolve('babel-loader'),
              options: babelOptions
            }
          }, {
            test: /\.(less|scss)$/,
            use: {
              loader: require.resolve('null-loader')
            }
          }]
        },
        output: {
          library: packageJson.name,
          libraryTarget: 'umd',
          path: path.join(workDir, './target/dist/public'),
          filename: '[name].js'
        }
      };
      // tslint:disable-next-line:non-literal-fs-path
      config.entry = fs.readdirSync(workDir)
        .filter((file : string) => /^server\..*js$/.test(file))
        .reduce((entry : any, file : string) => {
          entry[file.replace(/\.[^.]+$/, '')] = `./${file}`;
          return entry;
        }, {});
      return config;
    };

    /**
     * Runs webpack build.
     */
    const runWebpack = (prepareWebpackConfig : () => webpack.Configuration, exitHandler? : ExitHandler) => {
      const exitToUse : ExitHandler = exitHandler || exit;
      const webpackConfig = prepareWebpackConfig();
      tools.webpack(webpackConfig, (err : Error, stats : webpack.Stats) => {
        console.log(stats.toString({
          colors: true
        }));
        if (err || stats.hasErrors()) {
          exitToUse(1);
        } else {
          exitToUse(0);
        }
      });
    };

    /**
     * Prepare webpackDevServerExtension
     */
    const prepareWebpackDevServerExtension = () => {
      return {
        onSetup: (app : express.Application, context : { port : number }) => {
          if (process.env.NO_WEBPACK) {
            return;
          }
          const serverUrl = `http://localhost:${context.port}`;
          const webpackDevMiddleware = require('webpack-dev-middleware');
          const webpackHotMiddleware = require('webpack-hot-middleware');
          const webpackConfig = prepareWebpackConfig();
          webpackConfig.output.publicPath = `http://localhost:${context.port}/`;
          ((webpackConfig.entry as webpack.Entry).main as string[]).unshift(`webpack-hot-middleware/client?path=${serverUrl}/__webpack_hmr&reload=true&timeout=20000&__webpack_public_path=http://webpack:${context.port}`);
          webpackConfig.plugins.unshift(new tools.webpack.HotModuleReplacementPlugin());
          const compiler = tools.webpack(webpackConfig);
          app.use(webpackDevMiddleware(compiler, {
            publicPath: webpackConfig.output.publicPath
          }));
          app.use(webpackHotMiddleware(compiler));
        }
      };
    };

    /**
     * Prepare openBrowserDevServerExtension
     */
    const prepareOpenBrowserDevServerExtension = () => {
      return {
        onStart: (context : { port : number }) => {
          const shouldOpen = args.open === undefined || args.open === true;
          if (shouldOpen) {
            const serverUrl = `http://localhost:${context.port}`;
            open(serverUrl, {app: ['google chrome']})
              .catch(() => {
                // ignore
              });
          }
        }
      };
    };

    /**
     * Prepare appServerExtensions
     */
    const prepareAppServerExtensions = (opts : {
      devServerExtension? : boolean;
      withExtensions? : any | any[];
    } = {}) => {
      const esm = require('esm')(module, {mode: 'all', cjs: true});
      let common = [
        path.join(workDir, 'server.mock.js'),
        path.join(workDir, 'server.js')]
        // tslint:disable-next-line:non-literal-fs-path
        .filter((script : string) => fs.existsSync(script))
        .map((script : string) => {
          console.log(`${chalk.blue('[build-tools]')}Applying server extension:\n\t${chalk.green(script)}`);
          const extension = esm(script);
          return extension.default ? extension.default : extension;
        });
      if (opts.devServerExtension !== false) {
        common.push(prepareWebpackDevServerExtension());
      }
      if (opts.withExtensions) {
        if (Array.isArray(opts.withExtensions)) {
          common = common.concat(opts.withExtensions);
        } else {
          common.push(opts.withExtensions);
        }
      }
      return common;
    };

    /**
     * Executes the specified build task.
     */
    const runTask = (task : string, exitToUse : ExitHandler) => {
      switch (task) {
        case 'build':
        case 'bundle': {
          const tasks = ['webpack'];
          // tslint:disable-next-line:non-literal-fs-path
          if (fs.existsSync(path.join(workDir, 'server.js'))) {
            tasks.push('webpack-server');
          }
          Promise.all(tasks.map((task : string) => {
            return new Promise((resolve : ExitHandler) => {
              runTask(task, resolve);
            });
          }))
            .then((statuses : number[]) => exit(Math.max(...statuses)));
          break;
        }
        case 'webpack-server': {
          runWebpack(prepareWebpackConfigServer, exitToUse);
          break;
        }
        case 'webpack': {
          runWebpack(prepareWebpackConfig, exitToUse);
          break;
        }
        case 'devserver': {
          tools.appServer(
            prepareAppServerExtensions({
              withExtensions: prepareOpenBrowserDevServerExtension()
            })
          );
          keepRunning();
          break;
        }
        case 'lint': {
          const CLIEngine = require('eslint').CLIEngine;
          const cli = new CLIEngine({
            baseConfig: {
              extends: [
                'eslint:recommended',
                'plugin:react/recommended'
              ],
              settings: {
                react: {
                  version: '16.0'
                }
              }
            },
            envs: ['node', 'browser', 'es6'],
            fix: true,
            useEslintrc: false,
            parser: 'babel-eslint',
            parserOptions: {
              ecmaVersion: 6,
              sourceType: 'module',
              ecmaFeatures: {
                jsx: true,
                arrowFunctions: true
              }
            },
            plugins: ['react'],
            rules: {
              'react/display-name': 0,
              'react/prop-types': 0
            },
            ignorePattern: 'src/**/*.test.js'
          });
          const report = cli.executeOnFiles(['src/']);
          report.results.forEach((file : any) => {
            if (file.messages.length > 0) {
              console.log(`${chalk.magenta('[eslint]')} ${chalk.black(file.filePath)}`);
              file.messages.forEach((message : any) => {
                const chalkColor = ['green', 'orange', 'red'][message.severity];
                // tslint:disable-next-line:prefer-template
                console.log(`  ${message.ruleId
                  ? `[${chalk[chalkColor](message.ruleId)}] `
                  : ''}${message.message} ${chalk.blue(`(line: ${message.line}, column: ${message.column})`)}`);
              });
            }
          });
          exitToUse(parseInt(report.errorCount, 10) + parseInt(report.warningCount, 10) > 0 ? 1 : 0);
          break;
        }
        case 'run-script': {
          // tslint:disable-next-line:no-submodule-imports
          require('regenerator-runtime/runtime');
          // tslint:disable-next-line:non-literal-require
          require(args.script);
          break;
        }
        case 'test': {
          const jestRunExtension = (port? : number, testURL? : string) => ({
            onStart: () => {
              const jestTransform = path.join(buildCacheDir, 'jest-transform.js');
              let jestConfig : JestConfig.InitialOptions = {
                maxWorkers: 4,
                verbose: true,
                rootDir: workDir,
                testEnvironment: 'jsdom',
                testURL: 'http://localhost',
                testRegex: '.*\\.test\\.(js|tsx?)$',
                globals: {},
                testPathIgnorePatterns: ['/node_modules/', '/dist/'],
                moduleFileExtensions: ['js', 'ts', 'tsx', 'json'],
                moduleDirectories: ['node_modules'],
                collectCoverageFrom: ['src/**/*.{js,jsx,ts,tsx}'],
                watchPathIgnorePatterns: ['dist', 'target'],
                moduleNameMapper: {
                  '\\.(css|less|sass|scss)$': `${__dirname}/__mocks__/style-mock.js`
                },
                modulePathIgnorePatterns: ['/node_modules/', '/dist/'],
                transform: {
                  '^.+\\.js$': jestTransform,
                  '^.+\\.tsx?$': 'ts-jest'
                },
                transformIgnorePatterns: [
                  '/node_modules/(?!@github1).+$',
                  '.*react\-githubish.*',
                  '.*react\-portal.*'
                ],
                setupFiles: []
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
                jestConfig.testURL = testURL;
                (jestConfig.globals as any).__JEST_MOCK_SERVER__ = testURL;
              }
              const jestConfiguratorFile = path.join(workDir, 'jest.config.js');
              // tslint:disable-next-line:non-literal-fs-path
              if (fs.existsSync(jestConfiguratorFile)) {
                // tslint:disable-next-line:non-literal-require
                const jestConfigurator = require(jestConfiguratorFile);
                console.log(chalk.blue('[build-tools] ') + chalk.black(`Using ${jestConfiguratorFile}`));
                if (typeof jestConfigurator === 'function') {
                  jestConfig = jestConfigurator(jestConfig);
                } else {
                  jestConfig = jestConfigurator;
                }
              }
              const jestConfigFile = path.join(buildCacheDir, 'jest-config.json');
              // tslint:disable-next-line:non-literal-fs-path
              const jestTransformTemplate = fs.readFileSync(path.join(__dirname, 'jest-transform.tpl'))
                .toString();
              const jestTransformContent = jestTransformTemplate
                .replace(/\$BABEL_CONFIG/, JSON.stringify(babelOptions))
                .replace(/\$BABEL_JEST/, require.resolve('babel-jest'));
              // tslint:disable-next-line:non-literal-fs-path
              fs.writeFileSync(jestTransform, jestTransformContent);
              // tslint:disable-next-line:non-literal-fs-path
              fs.writeFileSync(jestConfigFile, JSON.stringify(jestConfig));
              const jestCLIArgs = {...args};
              delete jestCLIArgs.task;
              if (jestCLIArgs.reporters && !Array.isArray(jestCLIArgs.reporters)) {
                jestCLIArgs.reporters = [jestCLIArgs.reporters];
              }
              jestCLIArgs.config = jestConfigFile;
              const testFileToRun = jestCLIArgs.testFile || jestCLIArgs.runTestsByPath;
              if (testFileToRun) {
                // run specific test file
                jestCLIArgs._ = [testFileToRun];
              }
              const jestResult = tools.jest
                .runCLI(jestCLIArgs as any, [workDir]);
              if (jestResult && jestResult.then) {
                jestResult.then((res : {results: JestAggregatedResult}) => {
                  if (res.results && res.results.numFailedTests > 0) {
                    exit(1);
                  } else {
                    exit(0);
                  }
                });
              }
            }
          });
          if (process.env.NO_SERVER) {
            jestRunExtension()
              .onStart();
          } else {
            getPort()
              .then((port : number) => {
                const testURL = `http://localhost:${port}/`;
                tools.appServer(
                  prepareAppServerExtensions({
                    devServerExtension: args.webpackDevServer === undefined || args.webpackDevServer,
                    withExtensions: jestRunExtension(port, testURL)
                  })
                  , port);
              });
          }
          break;
        }
        default:
          console.log(chalk.red(`ERROR: Unknown task ${task}`));
          exitToUse(1);
      }
    };
    runTask(args.task, exit);
  })
    .then((result : TaskResult) => {
      if (result && result.handler) {
        result.handler();
      }
    })
    .catch((err : Error) => {
      let status = 1;
      if (typeof err !== 'number') {
        console.log(err);
      } else {
        status = err;
      }
      outerExit(status);
    });
};
