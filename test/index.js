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
	t.is(foo.maxAge, -1, '~> "maxAge" option is `-1` (default)');
	t.end();
});

test('new Cache(max)', t => {
	let foo = new Cache(5);
	t.is(foo.stale, false, '~> "stale" option is `false` (default)');
	t.is(foo.maxAge, -1, '~> "maxAge" option is `-1` (default)');
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
	let key=123, val=456;
	let foo = new Cache();

	foo.set(key, val);
	t.true(foo.has(key), '~> persists key');
	t.is(foo.get(key), val, '~> key value is returned');
	t.true(foo.has(key), '~~> key is not purged');

	foo.set(key, val, 1e3);
	t.true(foo.has(key), '~> persists key');

	t.is(foo.get(key), val, '~> key is valid w/ content (maxAge)');

	let obj = foo.values().next().value;
	t.is(typeof obj, 'object', 'entry always written as object');
	t.true(obj.expires !== void 0, '~> entry has "expires" key');
	t.is(obj.expires, false, '~~> is `false` when not configured');
	t.ok(obj.content, '~> entry has "content" key');
	t.is(obj.content, val, '~~> is the `value` provided');

	let bar = new Cache({ maxAge:1 });
	bar.set(key, val);
	let { expires } = bar.values().next().value;
	t.true(expires !== void 0, '~> entry has "expires" key');
	t.is(typeof expires, 'number', '~~> is a number when set');

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
	let bar = new Cache({ maxAge:0 });

	foo.set(key, val);
	t.is(foo.peek(key), val, '~> receives value');
	t.true(foo.has(key), '~> retains key');

	bar.set(key, val);
	t.is(bar.peek(key), undefined, '~> receives undefined (stale:false)');
	t.false(bar.has(key), '~> triggers key deletion');

	t.end();
});

test('Cache.peek :: stale', t => {
	let key=123, val=456;
	let foo = new Cache({ maxAge:0, stale:true });

	foo.set(key, val);
	let abc = foo.peek(key);
	t.is(abc, val, '~> receives value (stale)');
	t.false(foo.has(key), '~> triggers purge');

	t.end();
});

test('Cache.peek :: maxAge', t => {
	let key=123, val=456;
	let foo = new Cache({ maxAge:1e3 });
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

	foo.set(1, 1, 0); // expire instantly
	t.is(foo.size, 1, '~> 1');

	foo.set(2, 2);
	t.is(foo.size, 2, '~> 2');

	foo.get(1); // expired & deleted
	t.is(foo.size, 1, '~> 1');

	t.end();
});

test('least recently set', t => {
  let foo = new Cache(2);
  foo.set('a', 'A');
  foo.set('b', 'B');
  foo.set('c', 'C');
  t.is(foo.get('c'), 'C');
  t.is(foo.get('b'), 'B');
  t.is(foo.get('a'), undefined);
  t.end();
});

test('lru recently gotten', t => {
  let foo = new Cache(2);
  foo.set('a', 'A');
  foo.set('b', 'B');
  foo.get('a');
  foo.set('c', 'C');
  t.equal(foo.get('c'), 'C');
  t.equal(foo.get('b'), undefined);
  t.equal(foo.get('a'), 'A');
  t.end();
});

test('Cache.delete', t => {
  let foo = new Cache(2)
  foo.set('a', 'A');
  foo.delete('a');
  t.equal(foo.get('a'), undefined);
  t.end();
});
