import entryPoint from './entry-point';
import * as fs from 'fs';
import processArgs from './process-args';

describe('when the entry point is called', () => {
  let webpack;
  let appServer;
  let jestMock;
  let process;
  let status;
  let run;
  let logs;
  beforeEach(() => {
    webpack = jest.fn((config: any, callback: any) =>
      callback(undefined, {
        hasErrors() {
          return false;
        },
      })
    );
    appServer = jest.fn((extensions: any) => {
      extensions.forEach((extension: any) => {
        if (extension.onStart) {
          extension.onStart({ port: 3000 });
        }
      });
    });
    jestMock = {
      runCLI: jest.fn(() => {
        return Promise.resolve({});
      }),
    };
    process = {
      cwd: () => '/tmp/foo',
      env: {},
      argv: ['bin/node', 'foo.js'],
    };
    logs = [];
    status = 0;
    fs.mkdirSync('/tmp/foo-cache', { recursive: true });
    run = () =>
      entryPoint({
        packageJsonLoader: () => ({ name: '@foo/bar' }),
        logger: {
          info(...args) {
            logs.push(args.join(' '));
          },
          error(...args) {
            logs.push(args.join(' '));
          },
        },
        buildToolsDir: __dirname,
        workDir: process.cwd(),
        buildCacheDir: '/tmp/foo-cache',
        env: process.env,
        args: processArgs(process),
        tools: {
          webpack,
          jest: jestMock,
          appServer,
        },
      }).catch((err) => {
        console.error(err);
        status = 1;
      });
  });

  describe('and the devserver task is run', () => {
    beforeEach(() => {
      process = {
        cwd: () => '/tmp/foo',
        env: {},
        argv: ['bin/node', 'foo.js', 'devserver', '--open', 'false'],
      };
    });
    it('runs the devserver', () => {
      return run().then(() => {
        expect(appServer.mock.calls.length).toBe(1);
      });
    });
  });

  describe('and the test task is run', () => {
    beforeEach(() => {
      process = {
        cwd: () => '/tmp/foo',
        env: {},
        argv: ['bin/node', 'foo.js', 'test'],
      };
    });
    it('runs jest', () => {
      return run().then(() => {
        expect(jestMock.runCLI.mock.calls.length).toBe(1);
        // tslint:disable-next-line:non-literal-fs-path
        const jestTransform = JSON.parse(
          fs
            .readFileSync(jestMock.runCLI.mock.calls[0][0].config)
            .toString('utf8')
        ).transform;
        expect(jestTransform).not.toBe(undefined);
      });
    });
    it('runs jest with arguments', () => {
      process.argv.push('--watch');
      process.argv.push('--logHeapUsage');
      process.argv.push('--env');
      process.argv.push('node');
      return run().then(() => {
        expect(jestMock.runCLI.mock.calls.length).toBe(1);
        expect(jestMock.runCLI.mock.calls[0][0].watch).toBe(true);
        expect(jestMock.runCLI.mock.calls[0][0].logHeapUsage).toBe(true);
        expect(jestMock.runCLI.mock.calls[0][0].env).toBe('node');
      });
    });
  });

  describe('and the webpack task is run', () => {
    beforeEach(() => {
      process = {
        cwd: () => '/tmp/foo',
        env: {},
        argv: ['bin/node', 'foo.js', 'webpack'],
      };
      fs.mkdirSync('/tmp/foo/src', { recursive: true });
      fs.writeFileSync('/tmp/foo/src/index.js', 'export const foo = "foo";');
    });
    it('runs webpack', () => {
      return run().then(() => {
        expect(webpack.mock.calls.length).toBe(1);
        const webpackConfig = webpack.mock.calls[0][0];
        const externalsCallback = jest.fn();
        webpackConfig.externals[0]({ request: '@api/foo'}, externalsCallback);
        expect(externalsCallback.mock.calls[0][1]).toBe('@api/foo');
        expect(webpackConfig.output.path).toBe('/tmp/foo/target/dist/public');
      });
    });
    it('can exit with status 0', () => {
      return run().then(() => {
        expect(status).toBe(0);
      });
    });
    it('can exit with status 1', () => {
      webpack = (config: any, callback: any) =>
        callback(undefined, {
          hasErrors() {
            return true;
          },
        });
      return run().then(() => {
        expect(status).toBe(1);
      });
    });
  });
});
