# tmp-cache ![CI](https://github.com/lukeed/tmp-cache/workflows/CI/badge.svg) [![codecov](https://badgen.net/codecov/c/github/lukeed/tmp-cache)](https://codecov.io/gh/lukeed/tmp-cache)

> A least-recently-used cache in 35 lines of code~!

LRU caches operate on a first-in-first-out queue. This means that the first item is the oldest and will therefore be deleted once the `max` limit has been reached.

When a `maxAge` value is set, items are given an expiration date. This allows existing items to become stale over time which, depending on your `stale` config, is equivalent to the item not existing at all!

In order to counteract this idle decay, all `set()` and `get()` operations on an item "refresh" its expiration date. By doing so, a new `expires` value is issued & the item is moved to the end of the list &mdash; aka, it's the newest kid on the block!


## Install

```
$ npm install --save tmp-cache
```


## Usage

```js
const Cache = require('tmp-cache');

let cache = new Cache(3); // sets "max" size

cache.set('a', 1); //~> ['a']
cache.set('b', 2); //~> ['a', 'b']
cache.set('c', 3); //~> ['a', 'b', 'c']
cache.get('a');    //~> ['b', 'c', 'a']
cache.set('d', 4); //~> ['c', 'a', 'd']
cache.peek('a');   //~> ['c', 'a', 'd']
cache.delete('d'); //~> ['c', 'a']
cache.has('d');    //=> false
cache.set('e', 5); //~> ['c', 'a', 'e']
cache.size;        //=> 3
cache.clear();     //~> []

cache = new Cache({ maxAge:10 });

cache.set(123, 'hello'); //~> valid for 10ms
cache.get(123); //=> 'hello'  --  resets 10ms counter
setTimeout(_ => cache.get(123), 25); //=> undefined

cache = new Cache({ maxAge:0, stale:true });

cache.set('foo', [123]); //~> already stale, 0ms lifespan
cache.get('foo'); //=> [123]  --  because options.stale
cache.get('foo'); //=> undefined  --  previous op flagged removal
```

## API

Aside from the items & changes mentioned below, `tmp-cache` extends the `Map` class, so all [properties and methods](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map#Map_instances) are inherited.

### Cache(options)

Returns: `Cache extends Map`

#### options.max

Type: `Number`<br>
Default: `Infinity`

The maximum number of items the cache will hold. Adding more entries will force the oldest, least-recently-used item to be purged.

Failure to include any `max` restriction could potentially allow infinite unique entries! They will only be purged based on their `expires` value (if set).

> **Note:** If `options` is an integer, then it is used as the `options.max` value.

#### options.maxAge

Type: `Number`<br>
Default: `-1`

The maximum age (in ms) an item is considered valid; aka, its lifespan.

Items are not pro-actively pruned out as they age, but if you try to access an item that has expired, it will be purged and, by default, result in an `undefined` response.

#### options.stale

Type: `Boolean`<br>
Default: `false`

Allow an expired/stale item's value to be returned before deleting it.


### Cache.set(key, value, maxAge?)

Persists the item and its value into the Cache. If a `maxAge` value exists (via custom or cache-level options), an expiration date will also be stored.

When setting or updating an item that already exists, the original is removed. This allows the new item to be unique & the most recently used!

#### key
Type: `String`

The item's unique identifier.

#### value
Type: `Mixed`

The item's value to cache.

#### maxAge
Type: `Number`<br>
Default: `options.maxAge`

Optionally override the [`options.maxAge`](#optionsmaxage) for this (single) operation.


### Cache.get(key, mutate?)

Retrieve an item's value by its key name. By default, this operation will refresh/update the item's expiration date.

May also return `undefined` if the item does not exist, or if it has expired & [`stale`](#optionsstale) is not set.

#### key
Type: `String`

The item's unique identifier.

#### mutate
Type: `Boolean`<br>
Default: `true`

Refresh the item's expiration date, marking it as _more_ recently used.


### Cache.peek(key)

Return an item's value without updating its position or refreshing its expiration date.

May also return `undefined` if the item does not exist, or if it has expired & [`stale`](#optionsstale) is not set.

#### key
Type: `String`

The item's unique identifier.



## License

MIT © [Luke Edwards](https://lukeed.com)
