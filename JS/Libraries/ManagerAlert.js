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
			try {
				f(...args);
			} catch (error) {
				console.log("Could not execute function!", error);
			}
		}
		// Execute "once" functions and remove
		for (let f of this.once) {
			try {
				f(...args);
			} catch (error) {
				console.log("Could not execute function!", error);
			}
		}
		this.once = [];
	}
}

module.exports = { ManagerAlert };
