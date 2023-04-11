import * as fs from 'fs';
import * as path from 'path';
import { Configuration } from 'webpack';
import { TaskContext } from './types';
import { prepareBabelOptions } from './prepare-babel-options';
import { maybeLoadPackageJson } from './maybe-package-json-loader';
// tslint:disable-next-line:no-var-requires
const nodeExternals = require('webpack-node-externals');

function hasIndex(dir) {
  try {
    console.error(dir, fs.readdirSync(dir));
    for (const item of fs.readdirSync(dir)) {
      if (/^index\.[^.]+$/.test(item)) {
        return true;
      }
    }
  } catch (err) {
    // ignore
  }
  return false;
}

export function prepareWebpackConfig({
  packageJsonLoader,
  workDir,
  env,
  args,
}: TaskContext): Configuration {
  const babelOptions = prepareBabelOptions();
  // const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
  // tslint:disable-next-line:variable-name
  const MiniCssExtractPlugin = require('mini-css-extract-plugin');
  const extractCss = new MiniCssExtractPlugin({
    filename: 'assets/[name].css',
    chunkFilename: '[id].css',
  });
  const packageJson = maybeLoadPackageJson(workDir, packageJsonLoader);
  const postCssPlugins = [require('autoprefixer')];
  if (env.NODE_ENV === 'production') {
    postCssPlugins.push(
      require('cssnano')({
        preset: 'default',
      })
    );
  }
  const styleLoader = env.INLINE_STYLE
    ? require.resolve('style-loader')
    : MiniCssExtractPlugin.loader;
  const webpackConfig: Configuration = {
    context: workDir,
    entry: {
      main: [
        require.resolve('idempotent-babel-polyfill'),
        args.entryMain || hasIndex(path.join(workDir, 'src'))
          ? './src/index'
          : './index',
      ],
    },
    resolve: {
      extensions: ['.ts', '.tsx', '.js'],
    },
    mode: (env.NODE_ENV || 'development') as any,
    optimization: {
      minimize: env.NODE_ENV === 'production',
    },
    plugins: [
      //new BundleAnalyzerPlugin(),
      extractCss,
    ],
    module: {
      rules: [
        {
          test: /\.inline.*([jt])sx?$/,
          exclude: /(node_modules)/,
          use: {
            loader: require.resolve('raw-loader'),
          },
        },
        {
          test: /\.js$/,
          exclude: /(node_modules)/,
          use: {
            loader: require.resolve('babel-loader'),
            options: babelOptions,
          },
        },
        {
          test: /\.ts(x?)$/,
          exclude: /(node_modules)/,
          use: [
            {
              loader: 'swc-loader',
              options: {
                jsc: {
                  parser: {
                    syntax: 'typescript',
                  },
                },
              },
            },
          ],
        },
        {
          test: /\.less$/,
          use: [
            {
              loader: styleLoader,
            },
            {
              loader: require.resolve('css-loader'),
            },
            {
              loader: require.resolve('postcss-loader'),
              options: {
                plugins: postCssPlugins,
                sourceMap: env.POST_CSS_SOURCE_MAP === 'true',
              },
            },
            {
              loader: require.resolve('less-loader'),
            },
          ],
        },
        {
          test: /\.(scss|sass)$/,
          use: [
            {
              loader: styleLoader,
            },
            {
              loader: require.resolve('css-loader'),
            },
            {
              loader: require.resolve('postcss-loader'),
              options: {
                plugins: postCssPlugins,
                sourceMap: env.POST_CSS_SOURCE_MAP === 'true',
              },
            },
            {
              loader: require.resolve('fast-sass-loader'),
            },
          ],
        },
        {
          test: /\.(png|woff|woff2|eot|ttf|svg)$/,
          loader: require.resolve('url-loader'),
          options: {
            limit: 10000,
          },
        },
      ],
    },
    output: {
      library: packageJson.name,
      libraryTarget: 'umd',
      path: path.join(workDir, './target/dist/public'),
      filename: 'assets/[name].bundle.js',
    },
    externals: [
      (data, callback) => {
        if (/^@api\//.test(data.request)) {
          return callback(undefined, data.request);
        }
        callback();
      },
    ],
    devtool: env.NODE_ENV === 'production' ? false : 'source-map',
  };
  if (args.entry) {
    webpackConfig.entry = args.entry
      .split(',')
      .reduce((entries: any, entry: string) => {
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
      path: path.join(workDir, args.outputDir),
    };
  }
  if (args.outputFilename) {
    webpackConfig.output.filename = args.outputFilename;
  }
  return webpackConfig;
}
