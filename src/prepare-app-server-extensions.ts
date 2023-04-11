import * as path from 'path';
import * as fs from 'fs';
import chalk from 'chalk';
import { prepareWebpackDevServerExtension } from './prepare-webpack-devserver-extension';
import { TaskContext } from './types';

export function prepareAppServerExtensions(
  devServerExtension: boolean,
  withExtensions: any | any[],
  taskContext: TaskContext
) {
  const { workDir } = taskContext;
  const esm = require('esm')(module, { mode: 'all', cjs: true });

  const extensions: unknown[] = [
    [path.join(workDir, 'server.mock.js')],
    [
      path.join(workDir, 'server.js'),
      path.join(workDir, './target/dist/public/server.js'),
    ],
  ]
    .map((scripts) => {
      for (const script of scripts) {
        if (fs.existsSync(script)) {
          return script;
        }
      }
      return null;
    })
    .filter((script) => !!script)
    .map((script: unknown) => {
      taskContext.logger.info(
        'Applying server extension:',
        chalk.green(`${script}`)
      );
      const extension = esm(script);
      return extension.default ? extension.default : extension;
    });
  if (devServerExtension) {
    extensions.push(prepareWebpackDevServerExtension(taskContext));
  }
  if (withExtensions) {
    extensions.push(
      ...(Array.isArray(withExtensions)
        ? withExtensions
        : withExtensions
        ? [withExtensions]
        : [])
    );
  }
  return extensions;
}
