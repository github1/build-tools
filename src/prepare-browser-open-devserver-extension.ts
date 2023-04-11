import { TaskContext } from './types';
import * as open from 'open';

export function prepareOpenBrowserDevServerExtension(taskContext: TaskContext) {
  return {
    onStart: (context: { port: number }) => {
      const shouldOpen = taskContext.args.open === true;
      if (shouldOpen) {
        const serverUrl = `http://localhost:${context.port}`;
        open(serverUrl, { app: ['google chrome'] }).catch(() => {
          // ignore
        });
      }
    },
  };
}
