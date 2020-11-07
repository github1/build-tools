/**
 * Parses argv to object
 * @param {NodeJS.Process} process
 * @returns {any}
 */
module.exports = function (process) {
  let task;
  let prevFlag;
  /** @type {(Array<string>)} */
  let processArgs = process.argv.slice(0);
  processArgs.shift();
  const booleanMap = {
    'true': true,
    'false': false
  };
  while (true) {
    if (/^-/.test(processArgs[0]) || processArgs.length === 0) {
      break;
    } else {
      task = processArgs.shift();
    }
  }
  return processArgs.reduce((args, arg) => {
    if (/^-/.test(arg)) {
      prevFlag = toCamel(arg.replace(/^[-]+/, ''));
      args[prevFlag] = true;
    } else if (prevFlag) {
      const argStr = `${arg}`.toLowerCase();
      if (booleanMap.hasOwnProperty(argStr)) {
        arg = booleanMap[argStr];
      }
      args[prevFlag] = arg;
    }
    return args;
  }, {
    task: task
  });
};

/**
 * Converts string to camel case
 * @param {string} s
 * @returns {string}
 */
function toCamel(s) {
  return s.replace(/([-_][a-z])/ig, ($1) => {
    return $1.toUpperCase()
      .replace('-', '')
      .replace('_', '');
  });
}
