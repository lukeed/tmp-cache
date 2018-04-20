class Cache extends Map {
	constructor(opts={}) {
		super();

		if (typeof opts === 'number') {
			opts = { max:opts };
		}

		let { max, maxAge } = opts;
		this.max = max > 0 && max || Infinity;
		this.maxAge = maxAge !== void 0 ? maxAge : -1;
		this.stale = !!opts.stale;
	}

	peek(key) {
		return this.get(key, false);
	}

	set(key, content, maxAge = this.maxAge) {
		this.has(key) && this.delete(key);
		(this.size + 1 > this.max) && this.delete(this.keys().next().value);
		let expires = maxAge > -1 && (maxAge + Date.now());
		return super.set(key, { expires, content });
	}

	get(key, mut=true) {
		let x = super.get(key);
		if (x === void 0) return x;

		let { expires, content } = x;
		if (expires !== false && Date.now() >= expires) {
			this.delete(key);
			return this.stale ? content : void 0;
		}

		if (mut) this.set(key, content);
		return content;
	}
}

module.exports = Cache;
