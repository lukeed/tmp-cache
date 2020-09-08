const { test } = require('uvu');
const assert = require('uvu/assert');
const Cache = require('../lib');

const sleep = ms => new Promise(r => setTimeout(r, ms));

test('tmp-cache', () => {
	assert.type(Cache, 'function', 'exports a function');
	assert.throws(Cache, `Cache cannot be invoked without 'new'`, '~> requires "new" invoke');

	let foo = new Cache();
	assert.ok(foo instanceof Cache, '~> instance of "Cache" class');
	assert.ok(foo instanceof Map, '~> instance of "Map" class');
});

test('new Cache()', () => {
	let foo = new Cache();
	assert.is(foo.max, Infinity, '~> "max" option is `Infinity` (default)');
	assert.is(foo.stale, false, '~> "stale" option is `false` (default)');
	assert.is(foo.maxAge, -1, '~> "maxAge" option is `-1` (default)');
});

test('new Cache(max)', () => {
	let foo = new Cache(5);
	assert.is(foo.stale, false, '~> "stale" option is `false` (default)');
	assert.is(foo.maxAge, -1, '~> "maxAge" option is `-1` (default)');
	assert.is(foo.max, 5, '~> "max" option is `5`');
});

test('new Cache({ max, maxAge, stale })', () => {
	let foo = new Cache({ max:100, stale:true, maxAge:1e3 });
	assert.is(foo.maxAge, 1000, '~> "maxAge" option is set to `1000`');
	assert.is(foo.stale, true, '~> "stale" option is set to `true`');
	assert.is(foo.max, 100, '~> "max" option is set to `100`');
});

test('Cache.set', () => {
	let key=123, val=456;
	let foo = new Cache();

	foo.set(key, val);
	assert.ok(foo.has(key), '~> persists key');
	assert.is(foo.get(key), val, '~> key value is returned');
	assert.ok(foo.has(key), '~~> key is not purged');

	foo.set(key, val, 1e3);
	assert.ok(foo.has(key), '~> persists key');

	assert.is(foo.get(key), val, '~> key is valid w/ content (maxAge)');

	let obj = foo.values().next().value;
	assert.type(obj, 'object', 'entry always written as object');
	assert.ok(obj.expires !== void 0, '~> entry has "expires" key');
	assert.is(obj.expires, false, '~~> is `false` when not configured');
	assert.ok(obj.content, '~> entry has "content" key');
	assert.is(obj.content, val, '~~> is the `value` provided');

	let bar = new Cache({ maxAge:1 });
	bar.set(key, val);
	let { expires } = bar.values().next().value;
	assert.ok(expires !== void 0, '~> entry has "expires" key');
	assert.type(expires, 'number', '~~> is a number when set');
});

test('Cache.set (max)', () => {
	let arr, foo=new Cache(5);

	Array.from({ length:4 }, (_, x) => foo.set(x));
	assert.is(foo.size, 4, '~> initially 4 items');

	foo.set(10);
	assert.is(foo.size, 5, '~> 5 items');

	arr = Array.from(foo.keys());
	assert.equal(arr, [0,1,2,3,10], '~> initial key list (ordered)');

	foo.set('cow');
	assert.is(foo.size, 5, '~> still 5 items');

	arr = Array.from(foo.keys());
	assert.equal(arr, [1,2,3,10,'cow'], '~> purged oldest key to set newest key');
});

test('Cache.get', async () => {
	let key = 'hi';
	let foo = new Cache({ maxAge:10 });
	let bar = new Cache({ stale:true, maxAge:10 });

	foo.set(key, 1);
	assert.is(foo.get(key), 1, '~> matches value');
	assert.is(foo.get(key), 1, '~> matches value (repeat)');
	await sleep(25);
	assert.is(foo.get(key), undefined, '~> item expired');
	assert.not.ok(foo.has(key), '~> item removed');

	bar.set(key, 1);
	assert.is(bar.get(key), 1, '~> matches value');
	assert.is(bar.get(key), 1, '~> matches value (repeat)');
	await sleep(25);
	assert.is(bar.get(key), 1, '~> matches value (stale)');
	assert.not.ok(bar.has(key), '~> item removed');
});

test('Cache.get :: expires', async () => {
	let key=123, val=456;
	let foo = new Cache({ maxAge:25 });
	let toObj = () => sleep(3).then(() => foo.values().next().value);

	foo.set(key, val);
	let old = await toObj();

	await sleep(15);
	assert.is(foo.get(key), val, '~> matches value');

	let x = await toObj();
	assert.is.not(x.expires, old.expires, '~> updates the "expires" value');

	await sleep(15);
	assert.is(foo.get(key), val, '~~> matches value');

	let y = await toObj();
	assert.is.not(y.expires, x.expires, '~~> updates the "expires" value');
});

test('Cache.peek', () => {
	let key=123, val=456;
	let foo = new Cache();
	let bar = new Cache({ maxAge:0 });

	foo.set(key, val);
	assert.is(foo.peek(key), val, '~> receives value');
	assert.ok(foo.has(key), '~> retains key');

	bar.set(key, val);
	assert.is(bar.peek(key), undefined, '~> receives undefined (stale:false)');
	assert.not.ok(bar.has(key), '~> triggers key deletion');

});

test('Cache.peek :: stale', () => {
	let key=123, val=456;
	let foo = new Cache({ maxAge:0, stale:true });

	foo.set(key, val);
	let abc = foo.peek(key);
	assert.is(abc, val, '~> receives value (stale)');
	assert.not.ok(foo.has(key), '~> triggers purge');

});

test('Cache.peek :: maxAge', () => {
	let key=123, val=456;
	let foo = new Cache({ maxAge:1e3 });
	let toObj = () => foo.values().next().value;

	foo.set(key, val);
	let old = toObj();

	let abc = foo.peek(key);
	assert.is(abc, val, '~> receives the value');
	assert.ok(foo.has(key), '~> key remains if not stale');

	let x = toObj();
	assert.is(x.expires, old.expires, '~> expiration is unchanged');

	foo.peek(key);
	let y = toObj();
	assert.is(y.expires, old.expires, '~> expiration is unchanged');

});

test('Cache.size', () => {
	let foo = new Cache();

	foo.set(1, 1, 0); // expire instantly
	assert.is(foo.size, 1, '~> 1');

	foo.set(2, 2);
	assert.is(foo.size, 2, '~> 2');

	foo.get(1); // expired & deleted
	assert.is(foo.size, 1, '~> 1');

});

test('least recently set', () => {
	let foo = new Cache(2);
	foo.set('a', 'A');
	foo.set('b', 'B');
	foo.set('c', 'C');
	assert.is(foo.get('c'), 'C');
	assert.is(foo.get('b'), 'B');
	assert.is(foo.get('a'), undefined);
});

test('lru recently gotten', () => {
	let foo = new Cache(2);
	foo.set('a', 'A');
	foo.set('b', 'B');
	foo.get('a');
	foo.set('c', 'C');
	assert.is(foo.get('c'), 'C');
	assert.is(foo.get('b'), undefined);
	assert.is(foo.get('a'), 'A');
});

test('Cache.delete', () => {
	let foo = new Cache(2)
	foo.set('a', 'A');
	foo.delete('a');
	assert.is(foo.get('a'), undefined);
});

test.run();
