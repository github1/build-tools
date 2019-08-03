const processArgs = require('./process-args');

describe('when a process is passed', () => {
    it('extracts the arguments', () => {
        const args = processArgs({
            argv: ['bin/node',
                '-something',
                'a',
                '--somethingElse',
                'b',
                '-foo',
                '--someTrueBoolean',
                'true',
                '--someFalseBoolean',
                'false']
        });
        expect(args.something).toEqual('a');
        expect(args.somethingElse).toEqual('b');
        expect(args.foo).toEqual(true);
        expect(args.someTrueBoolean).toEqual(true);
        expect(args.someFalseBoolean).toEqual(false);
    });
});