const path = require('path');
const fs = require('fs');
const chalk = require('chalk');
const crypto = require('crypto');
const mkdirp = require('mkdirp');
const rimraf = require('rimraf');
const getPort = require('get-port');
const processArgs = require('./process-args');
const open = require('open');
const nodeExternals = require('webpack-node-externals');

module.exports = (tools, packageJsonLoader, process, outerExit) => {
    return new Promise(resolve => {

        const workDir = process.cwd();
        const args = processArgs(process);
        const buildKey = new Buffer(crypto
            .createHash('md5')
            .update(workDir)
            .digest('hex'))
            .toString('base64')
            .substring(0, 8);
        const buildCacheDir = path.join('/tmp/build-tools/', path.basename(workDir), buildKey);
        mkdirp.sync(buildCacheDir);

        // exit in the context of the promise
        const exit = status => {
            rimraf(buildCacheDir, () => '');
            resolve({
                handler: () => outerExit(status)
            });
        };

        const exitOnFailure = status => {
            if (status === 0) {
                return;
            }
            exit(status);
        };

        // do not terminate the process
        const keepRunning = () => resolve();

        const webpack = tools.webpack;
        const appServer = tools.appServer;
        const jest = tools.jest;

        const resolveBabelModules = entry => {
            if (Array.isArray(entry)) {
                entry[0] = require.resolve(entry[0]);
            } else {
                entry = require.resolve(entry);
            }
            return entry;
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

        require('ignore-styles').default(['.less']);
        require('babel-core/register')(babelOptions);

        /**
         * Prepares the webpack config.
         */
        const prepareWebpackConfig = () => {
            const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
            const MiniCssExtractPlugin = require('mini-css-extract-plugin');
            const extractLess = new MiniCssExtractPlugin({
                filename: "assets/[name].css",
                chunkFilename: "[id].css"
            });
            const packageJson = packageJsonLoader(path.join(workDir, 'package.json'));
            const postCssPlugins = [require('autoprefixer')];
            if (process.env.NODE_ENV === 'production') {
                postCssPlugins.push(require('cssnano')({
                    preset: 'default'
                }));
            }
            const webpackConfig = {
                context: workDir,
                entry: {
                    main: [
                        require.resolve('idempotent-babel-polyfill'),
                        './src/index.js']
                },
                mode: process.env.NODE_ENV || 'development',
                optimization: {
                    minimize: process.env.NODE_ENV === 'production'
                },
                plugins: [
                    new BundleAnalyzerPlugin(),
                    extractLess
                ],
                module: {
                    rules: [{
                        test: /\.inline.*jsx?$/,
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
                        test: /\.less$/,
                        use: [{
                            loader: MiniCssExtractPlugin.loader
                        }, {
                            loader: require.resolve('css-loader')
                        }, {
                            loader: require.resolve('less-loader')
                        }, {
                            loader: require.resolve('postcss-loader'),
                            options: {
                                plugins: postCssPlugins
                            }
                        }]
                    }, {
                        test: /\.(scss|sass)$/,
                        use: [{
                            loader: require.resolve('style-loader')
                        }, {
                            loader: require.resolve('css-loader')
                        }, {
                            loader: require.resolve('postcss-loader'),
                            options: {
                                plugins: postCssPlugins
                            }
                        }, {
                            loader: require.resolve('resolve-url-loader'),
                            options: { engine: 'rework' }
                        }, {
                            loader: require.resolve('sass-loader'),
                            options: { sourceMap: true }
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
                    function (context, request, callback) {
                        if (/^@api\//.test(request)) {
                            return callback(null, request);
                        }
                        callback();
                    }
                ],
                devtool: process.env.NODE_ENV === 'production' ? false : 'source-map'
            };
            if (args.entry) {
                webpackConfig.entry = args.entry.split(',').reduce((entries, entry) => {
                    const name = entry.split(':')[0];
                    const path =  entry.split(':')[1];
                    if (name.trim().length > 0) {
                        entries[name] = path;
                    }
                    return entries;
                }, {});
            }
            if (args.nodeExternals) {
                webpackConfig.externals.unshift(nodeExternals())
            }
            if (args.outputDir) {
                webpackConfig.output = {};
                webpackConfig.output.path = path.join(workDir, args.outputDir);
            }
            if (args.outputFilename) {
                webpackConfig.output.filename = args.outputFilename;
            }
            return webpackConfig;
        };

        /**
         * Prepares the webpack config for server code.
         */
        const prepareWebpackConfigServer = () => {
            const packageJson = packageJsonLoader(path.join(workDir, 'package.json'));
            return {
                context: workDir,
                target: 'node',
                entry: {
                    server: './server.js'
                },
                mode: process.env.NODE_ENV || 'development',
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
        };

        /**
         * Runs webpack build.
         */
        const runWebpack = (prepareWebpackConfig, exitToUse) => {
            exitToUse = exitToUse || exit;
            const webpackConfig = prepareWebpackConfig(webpack, workDir, packageJsonLoader, process);
            webpack(webpackConfig, (err, stats) => {
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
                onSetup: (app, context) => {
                    if (process.env.NO_WEBPACK) {
                        return;
                    }
                    const serverUrl = `http://localhost:${context.port}`;
                    const webpackDevMiddleware = require('webpack-dev-middleware');
                    const webpackHotMiddleware = require('webpack-hot-middleware');
                    const webpackConfig = prepareWebpackConfig();
                    webpackConfig.output.publicPath = `http://localhost:${context.port}/`;
                    webpackConfig.entry.main.unshift(`webpack-hot-middleware/client?path=${serverUrl}/__webpack_hmr&reload=true&timeout=20000&__webpack_public_path=http://webpack:${context.port}`);
                    webpackConfig.plugins.unshift(new webpack.HotModuleReplacementPlugin());
                    const compiler = webpack(webpackConfig);
                    app.use(webpackDevMiddleware(compiler, {
                        publicPath: webpackConfig.output.publicPath
                    }));
                    app.use(webpackHotMiddleware(compiler));
                    open(serverUrl, { app: ['google chrome'] })
                        .catch(err => {
                        // ignore
                    });
                }
            };
        };

        /**
         * Executes the specified build task.
         */
        const runTask = (task, exitToUse) => {
            switch (task) {
                case 'build':
                case 'bundle': {
                    const tasks = ['webpack'];
                    if (fs.existsSync(path.join(workDir, 'server.js'))) {
                        tasks.push('webpack-server');
                    }
                    Promise.all(tasks.map(task => {
                        return new Promise((resolve) => {
                            runTask(task, (status) => {
                                resolve(status);
                            });
                        });
                    })).then((statuses) => {
                        exit(Math.max(...statuses));
                    });
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
                    appServer([
                        path.join(workDir, 'server.js'),
                        path.join(workDir, 'server.mock.js'),
                        prepareWebpackDevServerExtension()
                    ]);
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
                            "react/display-name": 0,
                            "react/prop-types": 0
                        },
                        ignorePattern: 'src/**/*.test.js'
                    });
                    const report = cli.executeOnFiles(['src/']);
                    report.results.forEach(file => {
                        if (file.messages.length > 0) {
                            console.log(chalk.magenta('[eslint]') + ' ' + chalk.black(file.filePath));
                            file.messages.forEach(message => {
                                const chalkColor = ['green', 'orange', 'red'][message.severity];
                                console.log('  ' + (message.ruleId ? '[' + chalk[chalkColor](message.ruleId) + '] ' : '') + message.message + ' ' + chalk.blue('(line: ' + message.line + ', column: ' + message.column + ')'));
                            });
                        }
                    });
                    exitToUse(report.errorCount + report.warningCount > 0 ? 1 : 0);
                    break;
                }
                case 'test':
                {
                    const jestRunExtension = (port, testURL) => ({
                        onStart: () => {
                            const jestTransform = path.join(buildCacheDir, 'jest-transform.js');
                            const jestConfig = {
                                verbose: true,
                                rootDir: workDir,
                                testEnvironment: 'jsdom',
                                testURL: 'http://localhost',
                                testRegex: '.*\\.test\\.(js|ts)$',
                                globals: {},
                                moduleFileExtensions: ['js', 'ts', 'json'],
                                moduleDirectories: ['node_modules'],
                                collectCoverageFrom: ['src/**/*.{js,jsx,ts,tsx}'],
                                watchPathIgnorePatterns: ['dist', 'target'],
                                moduleNameMapper: {
                                    "\\.(css|less|sass|scss)$": __dirname + '/__mocks__/style-mock.js'
                                },
                                transform: {
                                    "^.+\\.js$": jestTransform,
                                    "^.+\\.ts$": 'ts-jest'
                                }
                            };
                            jestConfig.setupFiles = [require.resolve('./jest-helpers.js')];
                            if (fs.existsSync(path.join(workDir, 'jestSetup.js'))) {
                                jestConfig.setupFiles.push('<rootDir>/jestSetup.js');
                            }
                            if (port !== undefined) {
                                jestConfig.globals.__JEST_MOCK_SERVER_PORT__ = port;
                            }
                            if (testURL !== undefined) {
                                jestConfig.testURL = testURL;
                                jestConfig.globals.__JEST_MOCK_SERVER__ = testURL;
                            }
                            const jestConfigFile = path.join(buildCacheDir, 'jest-config.json');
                            const jestTransformTemplate = fs.readFileSync(path.join(__dirname, 'jest-transform.tpl')).toString();
                            const jestTransformContent = jestTransformTemplate
                                .replace(/\$BABEL_CONFIG/, JSON.stringify(babelOptions))
                                .replace(/\$BABEL_JEST/, require.resolve('babel-jest'));
                            fs.writeFileSync(jestTransform, jestTransformContent);
                            fs.writeFileSync(jestConfigFile, JSON.stringify(jestConfig));
                            const jestCLIArgs = args;
                            jestCLIArgs.config = jestConfigFile;
                            const jestResult = jest.runCLI(jestCLIArgs, [workDir]);
                            if (jestResult && jestResult.then) {
                                jestResult.then(res => {
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
                        jestRunExtension().onStart();
                    } else {
                        getPort().then(port => {
                            const testURL = `http://localhost:${port}/`;
                            appServer([
                                path.join(workDir, 'server.mock.js'),
                                path.join(workDir, 'server.js'),
                                prepareWebpackDevServerExtension(),
                                jestRunExtension(port, testURL)
                            ], port);
                        });
                    }
                    break;
                }
            }
        };

        runTask(args.task, exit);

    }).then(result => {
        if (result && result.handler) {
            result.handler();
        }
    }).catch(err => {
        let status = 1;
        if (typeof err !== 'number') {
            console.log(err);
        } else {
            status = err;
        }
        outerExit(status);
    });
};
