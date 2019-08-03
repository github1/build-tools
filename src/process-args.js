module.exports = process => {
    var task;
    var prevFlag;
    var processArgs = process.argv.slice(0);
    processArgs.shift();
    while(true) {
        if (/^-/.test(processArgs[0]) || processArgs.length == 0) {
            break;
        } else {
            task = processArgs.shift();
        }
    }
    return processArgs.reduce((args, arg) => {
        if (/^-/.test(arg)) {
            prevFlag = arg.replace(/^[-]+/, '');
            args[prevFlag] = true;
        } else if (prevFlag) {
            args[prevFlag] = arg;
        }
        return args;
    }, {
        task: task
    });
};
