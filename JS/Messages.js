// These are the messages sent between all rendered windows and the main process (i.e. main.js)
const IPCMessages = {
	READY: {
		MAINWINDOW: "IPC-MAIN-WINDOW-READY",
		LIVEVIEW: "IPC-LV-WINDOW-READY",
		INVISIBLE: "IPC-INVISIBLE-WINDOW-READY",
	},
	LOADED: {
		MAINWINDOW: "IPC-MAIN-WINDOW-LOADED",
	},
	INFORMATION: {
		SETTINGS: "IPC-SETTINGS-INFORMATION",
	},
	UPDATE: {
		SAVEDIR: "IPC-UPDATE-SAVE-DIRECTORY",
		SETTINGS: "IPC-UPDATE-SETTINGS",
		SCAN: "IPC-UPDATE-SCAN",
		NEWFRAME: "IPC-NEW-CAMERA-FRAME",
		CLOSECAMERA: "IPC-CLOSE-CAMERA",
		CAMERACLOSED: "IPC-CAMERA-CLOSED",
	},
};

const UI = {
	CHANGE: {
		TAB: "UI-CHANGE-TAB",
		SEVI: {
			START: "UI-CHANGE-SEVI-START",
			SAVE: "UI-CHANGE-SEVI-SAVE",
			PAUSE: "UI-CHANGE-SEVI-PAUSE",
			RESUME: "UI-CHANGE-SEVI-RESUME",
		},
		AUTOSAVE: {
			ON: "UI-CHANGE-AUTOSAVE-ON",
			OFF: "UI-CHANGE-AUTOSAVE-OFF",
		},
		IMAGEID: {
			INCREASE: "UI-CHANGE-IMAGEID-INCREASE",
			DECREASE: "UI-CHANGE-IMAGEID-DECREASE",
			RESUMEDIMAGE: "UI-CHANGE-IMAGEID-RESUMED-IMAGE",
		},
		VMI: {
			INDEX: "UI-CHANGE-VMI-INDEX",
		},
		DISPLAYSLIDERVALUE: "UI-CHANGE-DISPLAY-SLIDER-VALUE",
	},
	INFO: {
		QUERY: {
			CURRENTTAB: "UI-INFO-QUERY-CURRENT-TAB",
			IMAGEID: "UI-INFO-QUERY-IMAGEID",
			VMI: "UI-INFO-QUERY-VMI",
			DISPLAYSLIDERVALUE: "UI-INFO-QUERY-DISPLAY-SLIDER-VALUE",
		},
		RESPONSE: {
			CURRENTTAB: "UI-INFO-RESPONSE-CURRENT-TAB",
			IMAGEID: "UI-INFO-RESPONSE-IMAGEID",
			VMI: "UI-INFO-RESPONSE-VMI",
			DISPLAYSLIDERVALUE: "UI-INFO-RESPONSE-DISPLAY-SLIDER-VALUE",
		},
	},
	LOAD: {
		SEVI: "UI-LOAD-SEVI",
		IRSEVI: "UI-LOAD-IRSEVI",
		IRACTION: "UI-LOAD-IRACTION",
		SETTINGS: "UI-LOAD-SETTINGS",
	},
	// List of all tabs (shown on the left side of main window)
	// 	Values are the tab ID's listed in the Tab Bar section of mainWindow.html
	TAB: {
		SEVI: "SeviMode",
		IRSEVI: "IRSeviMode",
		IRACTION: "IRActionMode",
		SETTINGS: "Settings",
		NONE: "UI-TAB-NONE",
	},
};

const SEVI = {
	QUERY: {
		SCAN: {
			RUNNING: "SEVI-QUERY-SCAN-RUNNING",
			PAUSED: "SEVI-QUERY-SCAN-PAUSED",
			ISIR: "SEVI-QUERY-SCAN-IS-IR",
			FILENAME: "SEVI-QUERY-SCAN-FILENAME",
			FILENAMEIR: "SEVI-QUERY-SCAN-FILENAME-IR",
			CURRENTID: "SEVI-QUERY-SCAN-CURRENT-ID",
		},
		COUNTS: {
			TOTAL: "SEVI-QUERY-COUNTS-TOTAL",
			AVERAGE: "SEVI-QUERY-COUNTS-AVERAGE",
		},
		IMAGE: {
			IROFF: "SEVI-QUERY-IMAGE-IR-OFF",
			IRON: "SEVI-QUERY-IMAGE-IR-ON",
			DIFFPOS: "SEVI-QUERY-IMAGE-DIFFERENCE-POSITIVE",
			DIFFNEG: "SEVI-QUERY-IMAGE-DIFFERENCE-NEGATIVE",
		},
	},
	RESPONSE: {
		SCAN: {
			RUNNING: "SEVI-RESPONSE-SCAN-RUNNING",
			PAUSED: "SEVI-RESPONSE-SCAN-PAUSED",
			ISIR: "SEVI-RESPONSE-SCAN-IS-IR",
			FILENAME: "SEVI-RESPONSE-SCAN-FILENAME",
			FILENAMEIR: "SEVI-RESPONSE-SCAN-FILENAME-IR",
			CURRENTID: "SEVI-RESPONSE-SCAN-CURRENT-ID",
		},
		COUNTS: {
			TOTAL: "SEVI-RESPONSE-COUNTS-TOTAL",
			AVERAGE: "SEVI-RESPONSE-COUNTS-AVERAGE",
		},
		IMAGE: "SEVI-RESPONSE-IMAGE",
	},
	ALERT: {
		SCAN: {
			STARTED: "SEVI-ALERT-SCAN-STARTED",
			STOPPED: "SEVI-ALERT-SCAN-STOPPED",
			PAUSED: "SEVI-ALERT-SCAN-PAUSED",
			RESUMED: "SEVI-ALERT-SCAN-RESUMED",
			CANCELED: "SEVI-ALERT-SCAN-CANCELED",
			RESET: "SEVI-ALERT-SCAN-RESET",
		},
	},
	SCAN: {
		START: "SEVI-SCAN-START",
		STARTIR: "SEVI-SCAN-START-IR",
		STOP: "SEVI-SCAN-STOP",
		PAUSERESUME: "SEVI-SCAN-PAUSE-RESUME",
		//RESUME: "SEVI-SCAN-RESUME",
		CANCEL: "SEVI-SCAN-CANCEL",
		RESET: "SEVI-SCAN-RESET",
		SINGLESHOT: "SEVI-SCAN-SINGLESHOT",
	},
};

const LASER = {
	ALERT: {
		GOTO: {
			CANCELED: "LASER-ALERT-GOTO-CANCELED",
		},
		OPO: {
			MOTORS: {
				MOVING: "LASER-ALERT-OPO-MOTORS-MOVING",
				STOPPED: "LASER-ALERT-OPO-MOTORS-STOPPED",
			},
		},
		WAVEMETER: {
			MEASURING: {
				EXCITATION: {
					STARTED: "LASER-ALERT-WAVEMETER-MEASURING-EXCITATION-STARTED",
					STOPPED: "LASER-ALERT-WAVEMETER-MEASURING-EXCITATION-STOPPED",
				},
				DETACHMENT: {
					STARTED: "LASER-ALERT-WAVEMETER-MEASURING-DETACHMENT-STARTED",
					STOPPED: "LASER-ALERT-WAVEMETER-MEASURING-DETACHMENT-STOPPED",
				},
			},
		},
	},
	GOTO: {
		EXCITATION: "LASER-GOTO-EXCITATION-WAVENUMBER",
	},
	MEASURE: {
		DETACHMENT: "LASER-MEASURE-DETACHMENT-WAVELENGTH",
		EXCITATION: "LASER-MEASURE-EXCITATION-WAVELENGTH",
	},
	MODE: {
		DETACHMENT: {
			STANDARD: "LASER-MODE-DETACHMENT-STANDARD",
			DOUBLED: "LASER-MODE-DETACHMENT-DOUBLED",
			RAMAN: "LASER-MODE-DETACHMENT-RAMAN",
			IRDFG: "LASER-MODE-DETACHMENT-IRDFG",
		},
		EXCITATION: {
			NIR: "LASER-MODE-EXCITATION-NIR",
			IIR: "LASER-MODE-EXCITATION-IIR",
			MIR: "LASER-MODE-EXCITATION-MIR",
			FIR: "LASER-MODE-EXCITATION-FIR",
		},
	},
	UPDATE: {
		DETACHMENT: {
			STANDARDWL: "LASER-UPDATE-DETACHMENT-STANDARD-WAVELENGTH",
			MODE: "LASER-UPDATE-DETACHMENT-MODE",
		},
		EXCITATION: {
			NIRWL: "LASER-UPDATE-EXCITATION-NIR-WAVELENGTH",
			MODE: "LASER-UPDATE-EXCITATION-MODE",
		},
	},
	QUERY: {
		DETACHMENT: {
			INFO: "LASER-QUERY-DETACHMENT-INFO",
			CONVERSIONS: "LASER-QUERY-DETACHMENT-CONVERSIONS",
		},
		EXCITATION: {
			INFO: "LASER-QUERY-EXCITATION-INFO",
			CONVERSIONS: "LASER-QUERY-EXCITATION-CONVERSIONS",
		},
		OPO: {
			WAVELENGTH: "LASER-QUERY-OPO-WAVELENGTH",
		},
	},
	RESPONSE: {
		DETACHMENT: {
			INFO: "LASER-RESPONSE-DETACHMENT-INFO",
			CONVERSIONS: "LASER-RESPONSE-DETACHMENT-CONVERSIONS",
		},
		EXCITATION: {
			INFO: "LASER-RESPONSE-EXCITATION-INFO",
			CONVERSIONS: "LASER-RESPONSE-EXCITATION-CONVERSIONS",
		},
		OPO: {
			WAVELENGTH: "LASER-RESPONSE-OPO-WAVELENGTH",
		},
	},
};

const MSG = {
	UPDATE: "MSG-UPDATE",
	ERROR: "MSG-ERROR",
};

module.exports = { IPCMessages, UI, SEVI, LASER, MSG };
