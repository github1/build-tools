import * as path from 'path';
import { Configuration } from 'webpack';
import { findServerFiles } from './find-server-files';
import { TaskContext } from './types';
import { prepareBabelOptions } from './prepare-babel-options';
import { maybeLoadPackageJson } from './maybe-package-json-loader';

export function prepareWebpackServerConfig({
  packageJsonLoader,
  env,
  workDir,
}: TaskContext): Configuration {
  const babelOptions = prepareBabelOptions();
  const packageJson = maybeLoadPackageJson(workDir, packageJsonLoader);
  const config: Configuration = {
    context: workDir,
    target: 'node',
    entry: {
      server: './server',
    },
    resolve: {
      extensions: ['.ts', '.tsx', '.js'],
    },
    mode: (env.NODE_ENV || 'development') as any,
    optimization: {
      minimize: false,
    },
    module: {
      rules: [
        {
          test: /\.jsx?$/,
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
          test: /\.scss$/,
          use: {
            loader: require.resolve('null-loader'),
          },
        },
      ],
    },
    output: {
      library: packageJson.name,
      libraryTarget: 'umd',
      path: path.join(workDir, './target/dist/public'),
      filename: '[name].js',
    },
  };
  config.entry = findServerFiles(workDir).reduce((entry: any, file: string) => {
    entry[file.replace(/\.[^.]+$/, '')] = `./${file}`;
    return entry;
  }, {});
  return config;
}
