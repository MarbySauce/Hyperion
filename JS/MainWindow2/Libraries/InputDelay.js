/**
 * Class used to make inputs only execute a function if nothing has been typed for 1s.
 * That way functions aren't prematurely executed before user is done typing.
 * @param {function} fn_to_execute - Function to execute when input is received
 * @param {array} args_to_pass - List of arguments to give the function to execute upon input
 */
class InputDelay {
	constructor(fn_to_execute, args_to_pass) {
		this.timeout = null;
		this.args_to_pass = args_to_pass || [];
		this.fn_to_execute = fn_to_execute;
	}
	/**
	 * Start 1s timer and execute if not interrupted by more inputs
	 */
	start_timer() {
		clearTimeout(this.timeout);
		this.timeout = setTimeout(() => {
			this.execute();
		}, 1000 /* ms */);
	}
	execute() {
		this.fn_to_execute(...this.args_to_pass);
	}
}

module.exports = { InputDelay };
