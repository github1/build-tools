const processArgs = require('./process-args');

describe('when a process is passed', () => {
    it('extracts the arguments', () => {
        const args = processArgs({
            argv: [ 'bin/node',
                '-something',
                'a',
                '--somethingElse',
                'b',
                '-foo' ]
        });
        expect(args.something).toEqual('a');
        expect(args.somethingElse).toEqual('b');
        expect(args.foo).toEqual(true);
    });
});