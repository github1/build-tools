const fs = require('fs');
const stringify = require('json-stringify-safe');
const renderToJson = require('react-render-to-json').default;

const findJson = (json, func, matches) => {
  matches = matches || [];
  if (Array.isArray(json)) {
    json.forEach(item => {
      findJson(typeof item === 'function' ?
        renderToJson(item) : {attributes: item.props}, func, matches)
    });
  } else {
    if (func({
      attributes: {},
      ...json
    })) {
      matches.push(json);
    }
    (json.children || [])
      .filter(child => child !== null)
      .forEach(child => {
        findJson(child, func, matches);
      });
  }
  return matches;
};

exports.findJson = findJson;

exports.withAttribute = (name, value) => {
  return (node) => {
    return typeof value === 'undefined' ?
      node.attributes[name] : (
        value instanceof RegExp ?
          value.test(node.attributes[name]) :
          node.attributes[name] === value
      )
  };
};

exports.DeferredPromise = {
  create: (opts) => {
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
  }
};

exports.log = (...things) => {
  fs.appendFileSync('/tmp/build-tools-test.log', things.map(thing => {
    if (thing !== null && typeof thing === 'object') {
      if (thing.constructor) {
        thing = {
          ...thing,
          __type: thing.constructor.name
        }
      }
      return stringify(thing, null, 2);
    }
    return thing;
  }).join(' ') + '\n');
};
