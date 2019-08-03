const fs = require('fs');
const cjsDist = {};
const Module = require('module');
const originalRequire = Module.prototype.require;
/**
 * Detect packages which have an es5 dist dir
 * and rewrite the require statement to use it.
 */
Module.prototype.require = function () {
    let name = arguments[0];
    if (cjsDist[name]) {
        name = cjsDist[name];
    } else if (name.indexOf('@') > -1) {
        try {
            const filename = require.resolve(name).split('/');
            while (filename.slice(filename.lastIndexOf('node_modules') + 1).length > 2) {
                filename.pop();
            }
            filename.push('es5');
            if (fs.existsSync(filename.join('/'))) {
                const parts = name.split('/');
                parts.splice(2, 0, 'es5');
                cjsDist[name] = parts.join('/');
                name = cjsDist[name];
            }
        } catch (err) {
        }
    }
    return originalRequire.apply(this, [name]);
};