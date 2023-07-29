class ManagerAlert {
	constructor() {
		this.on = [];
		this.once = [];
	}

	add_on(callback) {
		this.on.push(callback);
	}

	add_once(callback) {
		this.once.push(callback);
	}

	alert(...args) {
		// Execute "on" functions first
		for (let f of this.on) {
			f(...args);
		}
		// Execute "once" functions and remove
		for (let f of this.once) {
			f(...args);
		}
		this.once = [];
	}
}

module.exports = { ManagerAlert };
