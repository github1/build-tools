require('regenerator-runtime/runtime');
const helpers = require('../index');

Object.keys(helpers).map(helper => {
  return 'log' === helper ? '_log' : helper;
}).forEach(helper => {
  global[helper] = helpers[helper];
});
