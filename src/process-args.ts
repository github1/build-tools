// tslint:disable-next-line:no-default-export
import { TaskArgs } from './types';

function evaluateValue(value: string) {
  return typeof value === 'undefined' ? true : value;
}

function camelize(str): string {
  return str
    .replace(/^\w|[A-Z]|\b\w/g, function (word, index) {
      return index === 0 ? word.toLowerCase() : word.toUpperCase();
    })
    .replace(/\s+/g, '')
    .replace(/-|_+/g, '');
}

function processArgs(process: NodeJS.Process): TaskArgs {
  const processArgs = process.argv.slice(1);
  while (!/^[a-z_\-]+$/gi.test(processArgs[0]) && processArgs.length > 0) {
    processArgs.shift();
  }
  const taskArgs: TaskArgs = {
    positional: [],
  };
  for (let i = 0; i < processArgs.length; i++) {
    const part = processArgs[i];
    if (/^-/.test(part)) {
      let key;
      let value;
      if (part.includes('=')) {
        key = part.split('=')[0];
        value = part.split('=')[1];
      } else {
        key = part;
        if (i + 1 < processArgs.length && !/^-/.test(processArgs[i + 1])) {
          value = processArgs[++i];
        }
      }
      key = camelize(key.replace(/^-+/g, ''));
      value = evaluateValue(value);
      if (taskArgs[key]) {
        taskArgs[key] = [
          ...(Array.isArray(taskArgs[key]) ? taskArgs[key] : [taskArgs[key]]),
          value,
        ];
      } else {
        taskArgs[key] = value;
      }
    } else {
      taskArgs.positional.push(part);
    }
  }
  return taskArgs;
}

export default processArgs;
