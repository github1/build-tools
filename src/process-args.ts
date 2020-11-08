// tslint:disable-next-line:no-default-export
export default function (process : NodeJS.Process) {
  let task;
  let prevFlag;
  const processArgs = process.argv.slice(1);
  const booleanMap = {
    true: true,
    false: false
  };
  while (!/^[a-z_\-]+$/ig.test(processArgs[0])) {
    processArgs.shift();
  }
  task = processArgs.shift();
  return processArgs.reduce((args : { [key : string] : any }, arg : string) => {
    if (/^-/.test(arg)) {
      prevFlag = toCamel(arg.replace(/^[-]+/, ''));
      if (arg.indexOf('=') > -1) {
        const name = toCamel(arg.split('=')[0]
          .replace(/^[-]+/, ''));
        args[name] = arg.split('=')[1];
      } else {
        args[prevFlag] = true;
      }
    } else if (prevFlag) {
      const argStr = `${arg}`.toLowerCase();
      args[prevFlag] = booleanMap.hasOwnProperty(argStr) ? booleanMap[argStr] : arg;
      prevFlag = undefined;
    }
    return args;
  }, {
    task: task
  });
}

function toCamel(s : string) {
  return s.replace(/([-_][a-z])/ig, ($1 : string) => {
    return $1.toUpperCase()
      .replace('-', '')
      .replace('_', '');
  });
}
