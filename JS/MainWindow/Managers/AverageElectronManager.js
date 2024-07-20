const ipc = require("electron").ipcRenderer;
const { ManagerAlert } = require("../../Libraries/ManagerAlert.js");
const { average } = require("../Libraries/WavemeterClasses.js");

class Rolling20Frames {
	constructor() {
		this.off = {
			com: { average: 0, stdev: 0 },
			hgcm: { average: 0, stdev: 0 },
			total: { average: 0, stdev: 0 },
		};
		this.on = {
			com: { average: 0, stdev: 0 },
			hgcm: { average: 0, stdev: 0 },
			total: { average: 0, stdev: 0 },
		};
		this.total = {
			com: { average: 0, stdev: 0 },
			hgcm: { average: 0, stdev: 0 },
			total: { average: 0, stdev: 0 },
		};
	}
}

/*****************************************************************************

						AVERAGE ELECTRON MANAGER 

*****************************************************************************/

const AverageElectronManager = {
	// Average electrons over 20 camera frames (10 for off or on)
	// Update alerts are sent every 10 camera frames
	rolling_20frames: {
		off: {
			com: [],
			hgcm: [],
			total: [],
		},
		on: {
			com: [],
			hgcm: [],
			total: [],
		},
		total: {
			com: [],
			hgcm: [],
			total: [],
		},
		counter: 0,
		update: (centroid_results) => rolling_20frames_update(centroid_results),
	},
};

/****
		IPC Event Listener
****/

// Listen for new camera frame event
ipc.on(IPCMessages.UPDATE.NEWFRAME, (event, centroid_results) => {
	AverageElectronManager.rolling_20frames.update(centroid_results);
});

/****
		Functions
****/

function rolling_20frames_update(centroid_results) {
	const r2f = AverageElectronManager.rolling_20frames;
	let com = centroid_results.com_centers.length;
	let hgcm = centroid_results.hgcm_centers.length;
	let total = com + hgcm;
	if (centroid_results.is_led_on) {
		r2f.on.com.push(com);
		r2f.on.hgcm.push(hgcm);
		r2f.on.total.push(total);
		if (r2f.on.com.length > 10) r2f.on.com.shift();
		if (r2f.on.hgcm.length > 10) r2f.on.hgcm.shift();
		if (r2f.on.total.length > 10) r2f.on.total.shift();
	} else {
		r2f.off.com.push(com);
		r2f.off.hgcm.push(hgcm);
		r2f.off.total.push(total);
		if (r2f.off.com.length > 10) r2f.off.com.shift();
		if (r2f.off.hgcm.length > 10) r2f.off.hgcm.shift();
		if (r2f.off.total.length > 10) r2f.off.total.shift();
	}
	r2f.total.com.push(com);
	r2f.total.hgcm.push(hgcm);
	r2f.total.total.push(total);
	if (r2f.total.com.length > 20) r2f.total.com.shift();
	if (r2f.total.hgcm.length > 20) r2f.total.hgcm.shift();
	if (r2f.total.total.length > 20) r2f.total.total.shift();

	r2f.counter++;
	if (r2f.counter > 10) {
		rolling_20frames_average();
		r2f.counter = 0;
	}
}

function rolling_20frames_average() {
	const r2f = AverageElectronManager.rolling_20frames;
	let r2f_results = new Rolling20Frames();
	r2f_results.off.com = average(r2f.off.com);
	r2f_results.off.hgcm = average(r2f.off.hgcm);
	r2f_results.off.total = average(r2f.off.total);
	r2f_results.on.com = average(r2f.on.com);
	r2f_results.on.hgcm = average(r2f.on.hgcm);
	r2f_results.on.total = average(r2f.on.total);
	r2f_results.total.com = average(r2f.total.com);
	r2f_results.total.hgcm = average(r2f.total.hgcm);
	r2f_results.total.total = average(r2f.total.total);

	EAMAlerts.info_update.rolling_20frames.alert(r2f_results);
}

/*****************************************************************************

					AVERAGE ELECTRON MANAGER ALERTS

*****************************************************************************/

const EAMAlerts = {
	info_update: {
		rolling_20frames: new ManagerAlert(),
	},
};

/*****************************************************************************

			AVERAGE ELECTRON MANAGER MESSENGER COMPONENTS

*****************************************************************************/

/***************************************** 

	Used for listening to alerts

*****************************************/

/** Set up callback functions to be executed on alert */
class AEMMessengerCallback {
	constructor() {
		this._info_update = new AEMMessengerCallbackInfoUpdate();
	}

	get info_update() {
		return this._info_update;
	}
}

/***************************************** 
   Listen for information being updated
*****************************************/

/** Set up callback functions to be executed when information is updated */
class AEMMessengerCallbackInfoUpdate {
	constructor() {
		this._rolling_20frames = {
			/** Callback called with argument `{Rolling20Frames}` */
			on: (callback) => {
				EAMAlerts.info_update.rolling_20frames.add_on(callback);
			},
			/** Callback called with argument `{Rolling20Frames}` */
			once: (callback) => {
				EAMAlerts.info_update.rolling_20frames.add_once(callback);
			},
		};
	}

	get rolling_20frames() {
		return this._rolling_20frames;
	}
}

/*****************************************************************************

					AVERAGE ELECTRON MANAGER MESSENGER

*****************************************************************************/

class AverageElectronManagerMessenger {
	/** WARNING: This function should only be used for testing purposes! */
	static get_manager() {
		console.warn("WARNING: This function should only be used for testing purposes!");
		return AverageElectronManager;
	}

	constructor() {
		this._listen = new AEMMessengerCallback();
	}

	get listen() {
		return this._listen;
	}
}

module.exports = { AverageElectronManagerMessenger, Rolling20Frames };
