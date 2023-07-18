// NOTE TO MARTY: Add a fast display system if there are a lot of messages?

const Messenger = {
	messages: [],
	colors: { UPDATE: "white", ERROR: "#ff5353" },
	going_through_msgs: false,
	go_through_msgs: async () => {
		if (Messenger.going_through_msgs) {
			return;
		}
		Messenger.going_through_msgs = true;
		const message_display = document.getElementById("MessageDisplay");
		while (Messenger.messages.length > 0) {
			let this_msg = Messenger.messages.shift();
			if (Messenger.colors[this_msg.type]) {
				message_display.style.color = Messenger.colors[this_msg.type];
			}
			message_display.innerText = this_msg.msg;
			await sleep(2000); // Show message for 2 seconds
			message_display.innerText = "";
			await sleep(100);
		}
		Messenger.going_through_msgs = false;
	},
};

class MessengerMessage {
	constructor(type, msg) {
		this.type = type; // Either "UPDATE" or "ERROR"
		this.msg = msg;
	}
}

msgEmitter.on(MSG.UPDATE, async (msg) => {
	let new_update = new MessengerMessage("UPDATE", msg);
	Messenger.messages.push(new_update);
	Messenger.go_through_msgs();
});

msgEmitter.on(MSG.ERROR, async (msg) => {
	let new_update = new MessengerMessage("ERROR", msg);
	Messenger.messages.push(new_update);
	Messenger.go_through_msgs();
});
