import * as express from 'express';
import { prepareWebpackConfig } from './prepare-webpack-config';
import { TaskContext } from './types';
import { HotModuleReplacementPlugin } from 'webpack';

export function prepareWebpackDevServerExtension(taskContext: TaskContext) {
  return {
    onSetup: (app: express.Application, context: { port: number }) => {
      if (taskContext.args.webpack === false || taskContext.env.NO_WEBPACK) {
        return;
      }
      const serverUrl = `http://localhost:${context.port}`;
      const webpackDevMiddleware = require('webpack-dev-middleware');
      const webpackHotMiddleware = require('webpack-hot-middleware');
      const webpackConfig = prepareWebpackConfig(taskContext);
      webpackConfig.output.publicPath = `http://localhost:${context.port}/`;
      webpackConfig.entry['main'].unshift(
        `webpack-hot-middleware/client?path=${serverUrl}/__webpack_hmr&reload=true&timeout=20000&__webpack_public_path=http://webpack:${context.port}`
      );
      webpackConfig.plugins.unshift(new HotModuleReplacementPlugin());
      const compiler = taskContext.tools.webpack(webpackConfig);
      app.use(
        webpackDevMiddleware(compiler, {
          publicPath: webpackConfig.output.publicPath,
        })
      );
      app.use(webpackHotMiddleware(compiler));
    },
  };
}
