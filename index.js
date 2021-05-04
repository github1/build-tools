const fs = require('fs');
const stringify = require('json-stringify-safe');
const renderToJson = require('react-render-to-json').default;
const jsonpath = require('jsonpath');

const findJson = (json, jsonPathOrMatcherFunc, matches) => {
  matches = matches || [];
  if (typeof jsonPathOrMatcherFunc === 'string') {
    return jsonpath.query(json, jsonPathOrMatcherFunc);
  } else {
    if (Array.isArray(json)) {
      json.forEach(item => {
        findJson(typeof item === 'function' ?
          renderToJson(item) : {attributes: item.props}, jsonPathOrMatcherFunc, matches)
      });
    } else {
      if (jsonPathOrMatcherFunc({
        attributes: {},
        ...json
      })) {
        matches.push(json);
      }
      (json.children || [])
        .filter(child => child !== null)
        .forEach(child => findJson(child, jsonPathOrMatcherFunc, matches));
    }
  }
  return matches;
};

exports.findJson = findJson;

exports.withKeyValueIn = (name, key, value) => {
  return (node) => {
    if (typeof node === 'object') {
      const source = node[name];
      if (source && typeof source === 'object') {
        return typeof value === 'undefined' ?
          source[key] : (
            value instanceof RegExp ?
              value.test(source[key]) :
              source[key] === value
          )
      }
    }
    return false;
  };
};

exports.withAttribute = (name, value) => {
  return (node) => {
    return exports.withKeyValueIn('props', name, value)(node) || exports.withKeyValueIn('attributes', name, value)(node)
  };
};

exports.DeferredPromise = {
  create: (opts) => {
    opts = opts || {};
    opts.onResolve = opts.onResolve || ((r) => r);
    opts.onReject = opts.onReject || ((r) => r);
    let storedResolve;
    let storedReject;
    let promise = null;
    const createPromise = () => {
      promise = new Promise((resolve, reject) => {
        storedResolve = resolve;
        storedReject = reject;
      });
    };
    const self = {};
    self.forceResolve = value => {
      createPromise();
      promise.then(opts.onResolve);
      storedResolve(value);
    };
    self.forceReject = value => {
      createPromise();
      promise.catch(opts.onReject);
      storedReject(value);
    };
    self.then = (handler) => {
      return new Promise((resolve) => {
        const waitForDefinition = () => {
          if (promise) {
            resolve(promise.then(handler));
          } else {
            setTimeout(() => waitForDefinition(),100);
          }
        };
        waitForDefinition();
      });
    };
    self.catch = (handler) => {
      return new Promise((resolve, reject) => {
        const waitForDefinition = () => {
          if (promise) {
            reject(promise.catch(handler));
          } else {
            setTimeout(() => waitForDefinition(),100);
          }
        };
        waitForDefinition();
      });
    };
    self.catch = (handler) => promise.catch(handler);
    return self;
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
