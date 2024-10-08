const { sleep } = require("../../Libraries/Sleep");

const Messenger = {
	messages: [],
	going_through_msgs: false,
	message_display: undefined,
	display_speeds: {
		slow: 2000, // ms
		fast: 1000, // ms
	},
	go_through_msgs: async () => {
		if (Messenger.going_through_msgs) {
			return;
		}
		if (!Messenger.message_display) {
			return;
		}
		Messenger.going_through_msgs = true;
		while (Messenger.messages.length > 0) {
			let this_msg = Messenger.messages.shift();
			Messenger.message_display.style.color = this_msg.color;
			Messenger.message_display.innerText = this_msg.msg;
			// Also send message to console
			console.log(`%c${this_msg.type.name}: %c${this_msg.msg}`, `color:${this_msg.color}`, "color:auto");
			await sleep(Messenger.get_display_speed());
			Messenger.message_display.innerText = "";
			await sleep(50);
		}
		Messenger.going_through_msgs = false;
	},
	/** @returns {Number} ms, amount of time message is displayed for in milliseconds */
	get_display_speed: () => {
		let length = Messenger.messages.length;
		if (length > 15) return 100; // Hyper speed
		else if (length > 6) return 500; // Very fast
		else if (length > 4) return 1000; // Fast
		else if (length > 2) return 1500; // Medium
		else return 2000; // Slow
	},
};

class MessageType {
	static ERROR = new MessageType("ERROR");
	static UPDATE = new MessageType("UPDATE");

	constructor(name) {
		this.name = name;
	}
}

class MessengerMessage {
	constructor() {
		this.msg;
		this.type;
		this.color;
	}
}

class ErrorMessage extends MessengerMessage {
	constructor(msg) {
		super();
		this.msg = msg;
		this.type = MessageType.ERROR;
		this.color = "red"; // "#ff5353"
	}
}

class UpdateMessage extends MessengerMessage {
	constructor(msg) {
		super();
		this.msg = msg;
		this.type = MessageType.UPDATE;
		this.color = "white";
	}
}

/**
 * Class for sending update or error messages to the message display
 */
class UpdateMessenger {
	constructor() {}

	/**
	 * Send an update to the message display
	 * @param {String} msg update message to display
	 */
	update(msg) {
		let update_msg = new UpdateMessage(msg);
		Messenger.messages.push(update_msg);
		Messenger.go_through_msgs();
	}

	/**
	 * Send an error to the message display
	 * @param {String} msg error message to display
	 */
	error(msg) {
		let error_msg = new ErrorMessage(msg);
		Messenger.messages.push(error_msg);
		Messenger.go_through_msgs();
	}
}

/**
 * Initialize area to display update and error messages
 * @param {HTMLElement} message_display
 */
function initialize_message_display(message_display) {
	if (message_display) Messenger.message_display = message_display;
}

module.exports = { UpdateMessenger, initialize_message_display };
