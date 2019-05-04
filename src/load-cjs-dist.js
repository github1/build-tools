const fs = require('fs');
const cjsDist = {};
const Module = require('module');
const originalRequire = Module.prototype.require;

const resolveEs5Dist = function (requireName, cjsDist, requireReference, exists) {
    const filename = requireReference.resolve(requireName).split('/');
    while (filename.slice(filename.lastIndexOf('node_modules') + 1).length > 2) {
        filename.pop();
    }
    filename.push('es5');
    if (exists(filename.join('/'))) {
        const parts = requireName.split('/');
        if (parts.indexOf('es5') < 0) {
            parts.splice(2, 0, 'es5');
        }
        cjsDist[requireName] = parts.join('/');
        return cjsDist[requireName];
    }
};

module.exports = {
    init: function() {
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
                    const resolvedName = resolveEs5Dist(name, cjsDist, require, fs.existsSync.bind(fs));
                    if (resolvedName) {
                        name = resolvedName;
                    }
                } catch (err) {
                    console.log(err);
                }
            }
            return originalRequire.apply(this, [name]);
        };
    },
    resolveEs5Dist: resolveEs5Dist
};