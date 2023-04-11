import { Configuration, Stats } from 'webpack';
import {TaskContext, TaskError, TaskResult} from './types';

export function runWebpack(
  taskContext: TaskContext,
  webpackConfigPreparer: (taskContext: TaskContext) => Configuration
): Promise<TaskResult> {
  const webpackConfig = webpackConfigPreparer(taskContext);
  return new Promise<TaskResult>((resolve, reject) => {
    taskContext.tools.webpack(webpackConfig, (err: Error, stats: Stats) => {
      if (stats) {
        taskContext.logger.info(stats.toString({
          colors: true,
        }));
      }
      if (err) {
        reject(new TaskError(err));
      } else if (stats.hasErrors()) {
        reject(new TaskError('webpack failed'));
      } else {
        resolve({});
      }
    });
  });
}
