const processArgs = require('./process-args');

describe('when a process is passed', () => {
    it('extracts the arguments', () => {
        const args = processArgs({
            argv: [ 'bin/node',
                'foo.js',
                'a',
                'b' ]
        });
        expect(args[0]).toEqual('a');
        expect(args[1]).toEqual('b');
    });
});