import { foo } from './index';
describe('foo', () => {
  it('returns foo', () => {
    expect(foo()).toBe('foo');
  });
});
