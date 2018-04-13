const test = require('tape');
const Cache = require('../lib');

const sleep = ms => new Promise(r => setTimeout(r, ms));

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

test('Cache.set', t => {
	let foo = new Cache();

	foo.set('hello', 'world');
	t.true(foo.has('hello'), '~> persists key');
	t.is(foo.get('hello'), undefined, '~> key is immediately stale (config)');
	t.false(foo.has('hello'), '~> deletes expired key');

	foo.set('hello', 'world', 1e3);
	t.true(foo.has('hello'), '~> persists key');

	t.is(foo.get('hello'), 'world', '~> key is valid w/ content (maxAge)');

	let obj = foo.values().next().value;
	t.is(typeof obj, 'object', 'entry always written as object');
	t.ok(obj.expires, '~> entry has "expires" key');
	t.is(typeof obj.expires, 'number', '~~> is a number');
	t.ok(obj.content, '~> entry has "content" key');
	t.is(obj.content, 'world', '~~> is the `value` provided');

	t.end();
});

test('Cache.set (max)', t => {
	let arr, foo=new Cache(5);

	Array.from({ length:4 }, (_, x) => foo.set(x));
	t.is(foo.size, 4, '~> initially 4 items');

	foo.set(10);
	t.is(foo.size, 5, '~> 5 items');

	arr = Array.from(foo.keys());
	t.same(arr, [0,1,2,3,10], '~> initial key list (ordered)');

	foo.set('cow');
	t.is(foo.size, 5, '~> still 5 items');

	arr = Array.from(foo.keys());
	t.same(arr, [1,2,3,10,'cow'], '~> purged oldest key to set newest key');

	t.end();
});

test('Cache.get', async t => {
	t.plan(8);
	let key = 'hi';
	let foo = new Cache({ maxAge:10 });
	let bar = new Cache({ stale:true, maxAge:10 });

	foo.set(key, 1);
	t.is(foo.get(key), 1, '~> matches value');
	t.is(foo.get(key), 1, '~> matches value (repeat)');
	await sleep(25);
	t.is(foo.get(key), undefined, '~> item expired');
	t.false(foo.has(key), '~> item removed');

	bar.set(key, 1);
	t.is(bar.get(key), 1, '~> matches value');
	t.is(bar.get(key), 1, '~> matches value (repeat)');
	await sleep(25);
	t.is(bar.get(key), 1, '~> matches value (stale)');
	t.false(bar.has(key), '~> item removed');
});

test('Cache.get :: expires', async t => {
	t.plan(4);
	let key=123, val=456;
	let foo = new Cache({ maxAge:25 });
	let toObj = () => sleep(3).then(() => foo.values().next().value);

	foo.set(key, val);
	let old = await toObj();

	await sleep(15);
	t.is(foo.get(key), val, '~> matches value');

	let x = await toObj();
	t.not(x.expires, old.expires, '~> updates the "expires" value');

	await sleep(15);
	t.is(foo.get(key), val, '~~> matches value');

	let y = await toObj();
	t.not(y.expires, x.expires, '~~> updates the "expires" value');
});

test('Cache.peek', t => {
	let key=123, val=456;
	let foo = new Cache();

	foo.set(key, val);
	let abc = foo.peek(key);
	t.is(abc, undefined, '~> receives void (instantly stale)');
	t.false(foo.has(key), '~> triggers purge');

	t.end();
});

test('Cache.peek :: stale', t => {
	let key=123, val=456;
	let foo = new Cache({ stale:true });

	foo.set(key, val);
	let abc = foo.peek(key);
	t.is(abc, val, '~> receives value (stale)');
	t.false(foo.has(key), '~> triggers purge');

	t.end();
});

test('Cache.peek :: maxAge', t => {
	let key=123, val=456;
	let foo = new Cache({ maxAge: 1e3 });
	let toObj = () => foo.values().next().value;

	foo.set(key, val);
	let old = toObj();

	let abc = foo.peek(key);
	t.is(abc, val, '~> receives the value');
	t.true(foo.has(key), '~> key remains if not stale');

	let x = toObj();
	t.is(x.expires, old.expires, '~> expiration is unchanged');

	foo.peek(key);
	let y = toObj();
	t.is(y.expires, old.expires, '~> expiration is unchanged');

	t.end();
});

test('Cache.size', t => {
	let foo = new Cache();

	foo.set(1, 1);
	t.is(foo.size, 1, '~> 1');

	foo.set(2, 2);
	t.is(foo.size, 2, '~> 2');

	foo.get(1); // expired + delete
	t.is(foo.size, 1, '~> 1');

	t.end();
});
