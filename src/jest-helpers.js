require('regenerator-runtime/runtime');
const fs = require('fs');

global.findJson = (json, func, matches) => {
    matches = matches || [];
    if (func({
            attributes: {},
            ...json
        })) {
        matches.push(json);
    }
    (json.children || []).forEach(child => {
        findJson(child, func, matches);
    });
    return matches;
};

global.withAttribute = (name, value) => {
    return (node) => {
        return typeof value === 'undefined' ?
            node.attributes[name] : (
            value instanceof RegExp ?
                value.test(node.attributes[name]) :
            node.attributes[name] === value
        )
    };
};

global.DeferredPromise = (opts) => {
    opts = opts || {};
    opts.onResolve = opts.onResolve || ((r) => r);
    opts.onReject = opts.onReject || ((r) => r);
    let storedResolve;
    let storedReject;
    const promise = new Promise((resolve, reject) => {
        storedResolve = resolve;
        storedReject = reject;
    });
    promise.forceResolve = value => {
        storedResolve(value);
        return promise.then(opts.onResolve);
    };
    promise.forceReject = value => {
        storedReject(value);
        return promise.then(opts.onReject);
    };
    return promise;
};

global._log = (...things) => {
    fs.appendFileSync('/tmp/build-tools-test.log', things.map(thing => {
        if (thing !== null && typeof thing === 'object') {
            if (thing.constructor) {
                thing = {
                    ...thing,
                    __type: thing.constructor.name
                }
            }
            return JSON.stringify(thing, null, 2);
        }
        return thing;
    }).join(' ') + '\n');
};