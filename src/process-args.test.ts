import processArgs from './process-args';

describe('when a process is passed', () => {
  it('extracts the arguments', () => {
    const args = processArgs({
      argv: ['bin/node',
        'theTask',
        '-something',
        'a',
        '--usingEquals=bar',
        '--somethingElse',
        'b',
        '-foo',
        '--someTrueBoolean',
        'true',
        '--someFalseBoolean',
        'false',
        '--kebab-case',
        'works']
    } as any);
    expect(args.something)
      .toEqual('a');
    expect(args.usingEquals)
      .toEqual('bar');
    expect(args.somethingElse)
      .toEqual('b');
    expect(args.foo)
      .toEqual(true);
    expect(args.someTrueBoolean)
      .toEqual(true);
    expect(args.kebabCase)
      .toEqual('works');
    expect(args.task)
      .toEqual('theTask');
  });
});
