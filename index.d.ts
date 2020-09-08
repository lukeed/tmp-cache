declare interface Options {
	max?: number;
	maxAge?: number;
	stale?: boolean;
}

declare class Cache<K, V> extends Map<K, V> {
	constructor(options?: Options | number);
	get(key: K, refresh?: boolean): V | undefined;
	peek(key: K): V | undefined;
	set(key: K, value: V, maxAge?: number): this;
}

export = Cache;
