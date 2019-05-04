const loadCjsDist = require('./load-cjs-dist');

describe('loadCjsDist', () => {
    it('resolves the cjs dist dir', () => {
        const requireReference = {
            resolve: jest.fn(() => '/foo/bar/node_modules/@foo/bar')
        };
        const exists = jest.fn(() => true);
        const name = loadCjsDist.resolveEs5Dist('@foo/bar', {}, requireReference, exists);
        expect(name).toBe('@foo/bar/es5');
    });
    it('resolves a file in the cjs dist dir', () => {
        const requireReference = {
            resolve: jest.fn(() => '/foo/bar/node_modules/@foo/bar/blah')
        };
        const exists = jest.fn(() => true);
        const name = loadCjsDist.resolveEs5Dist('@foo/bar/blah', {}, requireReference, exists);
        expect(name).toBe('@foo/bar/es5/blah');
    });
    it('handles already resolved', () => {
        const requireReference = {
            resolve: jest.fn(() => '/foo/bar/node_modules/@foo/bar/es5')
        };
        const exists = jest.fn(() => true);
        const name = loadCjsDist.resolveEs5Dist('@foo/bar/es5', {}, requireReference, exists);
        expect(name).toBe('@foo/bar/es5');
    });
    it('handles already resolved file', () => {
        const requireReference = {
            resolve: jest.fn(() => '/foo/bar/node_modules/@foo/bar/es5/something')
        };
        const exists = jest.fn(() => true);
        const name = loadCjsDist.resolveEs5Dist('@foo/bar/es5/something', {}, requireReference, exists);
        expect(name).toBe('@foo/bar/es5/something');
    });
});