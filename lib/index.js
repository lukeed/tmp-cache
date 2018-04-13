class Cache extends Map {
	constructor(opts={}) {
		super();

		let { maxAge, stale } = opts;

		this.stale = !!stale;
		this.maxAge = maxAge || 0;
	}

	peek(key) {
		let x = super.get(key);
		return x !== void 0 ? x.content : x;
	}

	set(key, content, maxAge) {
		let expires = (maxAge || this.maxAge) + Date.now();
		return super.set(key, { expires, content });
	}

	get(key) {
		let x = super.get(key);
		if (x === void 0) return x;

		let data = x.content;
		if (Date.now() >= x.expires) {
			this.delete(key);
			return this.stale ? data : void 0;
		}

		return this.set(key, data) && data;
	}
}

module.exports = Cache;
