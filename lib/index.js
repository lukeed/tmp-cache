class Cache extends Map {
	constructor(opts={}) {
		super();

		if (typeof opts === 'number') {
			opts = { max:opts };
		}

		let { max, maxAge, stale } = opts;

		this.stale = !!stale;
		this.maxAge = maxAge || 0;
		this.max = max > 0 && max || Infinity;
	}

	peek(key) {
		return this.get(key, false);
	}

	set(key, content, maxAge) {
		this.has(key) && this.delete(key);
		(this.size + 1 > this.max) && this.delete(this.keys().next().value);
		let expires = (maxAge || this.maxAge) + Date.now();
		return super.set(key, { expires, content });
	}

	get(key, mut=true) {
		let x = super.get(key);
		if (x === void 0) return x;

		let data = x.content;
		if (Date.now() >= x.expires) {
			this.delete(key);
			return this.stale ? data : void 0;
		}

		if (mut) this.set(key, data);
		return data;
	}
}

module.exports = Cache;
