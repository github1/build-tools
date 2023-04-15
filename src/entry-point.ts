// tslint:disable-next-line:no-implicit-dependencies
import { TaskContext, TaskError, TaskResult } from './types';
import { findServerFiles } from './find-server-files';
import { prepareWebpackConfig } from './prepare-webpack-config';
import { prepareWebpackServerConfig } from './prepare-webpack-server-config';
import { prepareAppServerExtensions } from './prepare-app-server-extensions';
import { runWebpack } from './run-webpack';
import { prepareOpenBrowserDevServerExtension } from './prepare-browser-open-devserver-extension';
import { runLint } from './run-lint';
import { runJest } from './run-jest';

// tslint:disable-next-line:no-default-export
export default async (taskContext: TaskContext): Promise<TaskResult> => {
  const { workDir, tools, args } = taskContext;

  async function runTask(task: string): Promise<TaskResult> {
    switch (task) {
      case 'build':
      case 'bundle': {
        const tasks = ['webpack'];
        // tslint:disable-next-line:non-literal-fs-path
        if (findServerFiles(workDir).length > 0) {
          tasks.push('webpack-server');
        }
        return Promise.all(
          tasks.map((task: string) => {
            return runTask(task);
          })
        );
      }
      case 'webpack-server': {
        return runWebpack(taskContext, prepareWebpackServerConfig);
      }
      case 'webpack': {
        return runWebpack(taskContext, prepareWebpackConfig);
      }
      case 'serve':
      case 'devserver': {
        const runDevServer = () => {
          tools.appServer(
            prepareAppServerExtensions(
              true,
              [prepareOpenBrowserDevServerExtension(taskContext)],
              taskContext
            ),
            args.port
          );
        };
        if (findServerFiles(workDir).length > 0) {
          await runWebpack(taskContext, prepareWebpackServerConfig);
        }
        runDevServer();
        break;
      }
      case 'lint': {
        await runLint(taskContext);
        break;
      }
      case 'run-script': {
        // tslint:disable-next-line:no-submodule-imports
        require('regenerator-runtime/runtime');
        // tslint:disable-next-line:non-literal-require
        try {
          require(args.script);
        } catch (err) {
          throw new TaskError(`failed to run ${args.script}`, err);
        }
        break;
      }
      case 'test': {
        return runJest(taskContext);
      }
      default:
        throw new TaskError(`unknown task ${task}`);
    }
    return {};
  }

  return runTask(args.positional[0]);
};
