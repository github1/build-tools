let babelOptions;
export function prepareBabelOptions() {
  if (!babelOptions) {
    const resolveBabelModules = (entry: any | string[]) => {
      if (Array.isArray(entry)) {
        entry[0] = require.resolve(entry[0]);
        return entry;
      }
      return require.resolve(entry);
    };

    babelOptions = {
      presets: [['@babel/preset-env', {targets: {node: 'current'}}]],
      plugins: [
        '@babel/plugin-syntax-dynamic-import',
        '@babel/plugin-syntax-import-meta',
        ['@babel/plugin-proposal-class-properties', { loose: false }],
        '@babel/plugin-proposal-json-strings',
        'babel-plugin-transform-remove-strict-mode',
        [
          'babel-plugin-inline-import',
          {
            extensions: ['.inline.test.js'],
          },
        ],
      ].map(resolveBabelModules),
    };

    require('ignore-styles').default(['.scss', '.css']);
    // tslint:disable-next-line:no-submodule-imports
    require('@babel/register')(babelOptions);
  }

  return babelOptions;
}
