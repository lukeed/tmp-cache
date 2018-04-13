const test = require('tape');
const Cache = require('../lib');

test('tmp-cache', t => {
	t.is(typeof Cache, 'function', 'exports a function');
	t.throws(Cache, /TypeError/, '~> requires "new" invoke');

	let foo = new Cache();
	t.true(foo instanceof Cache, '~> instance of "Cache" class');
	t.true(foo instanceof Map, '~> instance of "Map" class');

	t.end();
});

test('new Cache()', t => {
	let foo = new Cache();
	t.is(foo.max, Infinity, '~> "max" option is `Infinity` (default)');
	t.is(foo.stale, false, '~> "stale" option is `false` (default)');
	t.is(foo.maxAge, 0, '~> "maxAge" option is `0` (default)');
	t.end();
});

test('new Cache(max)', t => {
	let foo = new Cache(5);
	t.is(foo.stale, false, '~> "stale" option is `false` (default)');
	t.is(foo.maxAge, 0, '~> "maxAge" option is `0` (default)');
	t.is(foo.max, 5, '~> "max" option is `5`');
	t.end();
});

test('new Cache({ max, maxAge, stale })', t => {
	let foo = new Cache({ max:100, stale:true, maxAge:1e3 });
	t.is(foo.maxAge, 1000, '~> "maxAge" option is set to `1000`');
	t.is(foo.stale, true, '~> "stale" option is set to `true`');
	t.is(foo.max, 100, '~> "max" option is set to `100`');
	t.end();
});
