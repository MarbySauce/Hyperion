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
	UPDATE: {
		TAB: "UI-UPDATE-TAB",
		SEVI: {
			START: "UI-UPDATE-SEVI-START",
			SAVE: "UI-UPDATE-SEVI-SAVE",
			PAUSE: "UI-UPDATE-SEVI-PAUSE",
			RESUME: "UI-UPDATE-SEVI-RESUME",
		},
		AUTOSAVE: {
			ON: "UI-UPDATE-AUTOSAVE-ON",
			OFF: "UI-UPDATE-AUTOSAVE-OFF",
		},
		IMAGEID: {
			INCREASE: "UI-UPDATE-IMAGEID-INCREASE",
			DECREASE: "UI-UPDATE-IMAGEID-DECREASE",
			RESUMEDIMAGE: "UI-UPDATE-IMAGEID-RESUMED-IMAGE",
		},
		VMI: {
			INDEX: "UI-UPDATE-VMI-INDEX",
		},
		DISPLAY: {
			SELECTEDINDEX: "UI-UPDATE-DISPLAY-SELECTED-INDEX",
			SLIDERVALUE: "UI-UPDATE-DISPLAY-SLIDER-VALUE",
		},
	},
	QUERY: {
		CURRENTTAB: "UI-QUERY-CURRENT-TAB",
		IMAGEID: "UI-QUERY-IMAGEID",
		VMI: "UI-QUERY-VMI",
		DISPLAY: {
			SELECTEDINDEX: "UI-QUERY-DISPLAY-SELECTED-INDEX",
			SLIDERVALUE: "UI-QUERY-DISPLAY-SLIDER-VALUE",
		},
	},
	RESPONSE: {
		CURRENTTAB: "UI-RESPONSE-CURRENT-TAB",
		IMAGEID: "UI-RESPONSE-IMAGEID",
		VMI: "UI-RESPONSE-VMI",
		DISPLAY: {
			SELECTEDINDEX: "UI-RESPONSE-DISPLAY-SELECTED-INDEX",
			SLIDERVALUE: "UI-RESPONSE-DISPLAY-SLIDER-VALUE",
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
		AUTOSTOP: {
			PARAMETERS: "SEVI-QUERY-AUTOSTOP-PARAMETERS",
			PROGRESS: "SEVI-QUERY-AUTOSTOP-PROGRESS",
		},
		SERIES: {
			LENGTH: "SEVI-QUERY-IMAGE-SERIES-LENGTH",
			REMAINING: "SEVI-QUERY-IMAGE-SERIES-REMAINING",
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
		AUTOSTOP: {
			PARAMETERS: "SEVI-RESPONSE-AUTOSTOP-PARAMETERS",
			PROGRESS: "SEVI-RESPONSE-AUTOSTOP-PROGRESS",
		},
		SERIES: {
			LENGTH: "SEVI-RESPONSE-IMAGE-SERIES-LENGTH",
			REMAINING: "SEVI-RESPONSE-IMAGE-SERIES-REMAINING",
		},
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
		PAUSE: "SEVI-SCAN-PAUSE",
		RESUME: "SEVI-SCAN-RESUME",
		CANCEL: "SEVI-SCAN-CANCEL",
		RESET: "SEVI-SCAN-RESET",
		SINGLESHOT: "SEVI-SCAN-SINGLESHOT",
	},
	UPDATE: {
		AUTOSTOP: "SEVI-UPDATE-AUTOSTOP",
		SERIES: "SEVI-UPDATE-IMAGE-SERIES",
	},
	AUTOSTOP: {
		METHOD: {
			ELECTRONS: "SEVI-AUTOSTOP-MODE-ELECTRONS",
			FRAMES: "SEVI-AUTOSTOP-MODE-FRAMES",
			NONE: "SEVI-AUTOSTOP-MODE-NONE",
		},
	},
};

const IRACTION = {
	QUERY: {
		SCAN: {
			RUNNING: "IRACTION-QUERY-SCAN-RUNNING",
			PAUSED: "IRACTION-QUERY-SCAN-PAUSED",
		},
		OPTIONS: "IRACTION-QUERY-OPTIONS",
	},
	RESPONSE: {
		SCAN: {
			RUNNING: "IRACTION-RESPONSE-SCAN-RUNNING",
			PAUSED: "IRACTION-RESPONSE-SCAN-PAUSED",
		},
		ENERGY: {
			CURRENT: "IRACTION-RESPONSE-ENERGY-CURRENT",
			NEXT: "IRACTION-RESPONSE-ENERGY-NEXT",
		},
		DURATION: "IRACTION-RESPONSE-DURATION",
		IMAGEAMOUNT: "IRACTION-RESPONSE-IMAGE-AMOUNT",
		OPTIONS: "IRACTION-RESPONSE-OPTIONS",
	},
	ALERT: {
		SCAN: {
			STARTED: "IRACTION-ALERT-SCAN-STARTED",
			STOPPED: "IRACTION-ALERT-SCAN-STOPPED",
			PAUSED: "IRACTION-ALERT-SCAN-PAUSED",
			RESUMED: "IRACTION-ALERT-SCAN-RESUMED",
			CANCELED: "IRACTION-ALERT-SCAN-CANCELED",
		},
		SEVI: {
			STARTED: "IRACTION-ALERT-SEVI-STARTED",
			STOPPED: "IRACTION-ALERT-SEVI-STOPPED",
		},
		GOTO: {
			STARTED: "IRACTION-ALERT-GOTO-STARTED",
			STOPPED: "IRACTION-ALERT-GOTO-STOPPED",
		},
		REMEASURING: {
			STARTED: "IRACTION-ALERT-REMEASURING-WAVELENGTH-STARTED",
			STOPPED: "IRACTION-ALERT-REMEASURING-WAVELENGTH-STOPPED",
		},
	},
	SCAN: {
		START: "IRACTION-SCAN-START",
		STOP: "IRACTION-SCAN-STOP",
		PAUSERESUME: "IRACTION-SCAN-PAUSE-RESUME",
		CANCEL: "IRACTION-SCAN-CANCEL",
		REMEASUREWL: "IRACTION-SCAN-REMEASURE-WAVELENGTH",
	},
	UPDATE: {
		OPTIONS: "IRACTION-UPDATE-OPTIONS",
	},
};

const LASER = {
	ALERT: {
		GOTO: {
			STARTED: "LASER-ALERT-GOTO-STARTED",
			STOPPED: "LASER-ALERT-GOTO-STOPPED",
			CANCELED: "LASER-ALERT-GOTO-CANCELED",
			PAUSED: "LASER-ALERT-GOTO-PAUSED",
			RESUMED: "LASER-ALERT-GOTO-RESUMED",
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
		PAUSE: "LASER-GOTO-PAUSE",
		RESUME: "LASER-GOTO-RESUME",
		CANCEL: "LASER-GOTO-CANCEL",
	},
	MEASURE: {
		DETACHMENT: "LASER-MEASURE-DETACHMENT-WAVELENGTH",
		EXCITATION: "LASER-MEASURE-EXCITATION-WAVELENGTH",
		CANCEL: {
			DETACHMENT: "LASER-MEASURE-CANCEL-DETACHMENT",
			EXCITATION: "LASER-MEASURE-CANCEL-EXCITATION",
		},
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
			MEASUREMENT: "LASER-QUERY-DETACHMENT-MEASUREMENT",
		},
		EXCITATION: {
			INFO: "LASER-QUERY-EXCITATION-INFO",
			CONVERSIONS: "LASER-QUERY-EXCITATION-CONVERSIONS",
			MEASUREMENT: "LASER-QUERY-EXCITATION-MEASUREMENT",
		},
		OPO: {
			WAVELENGTH: "LASER-QUERY-OPO-WAVELENGTH",
		},
	},
	RESPONSE: {
		DETACHMENT: {
			INFO: "LASER-RESPONSE-DETACHMENT-INFO",
			CONVERSIONS: "LASER-RESPONSE-DETACHMENT-CONVERSIONS",
			MEASUREMENT: "LASER-RESPONSE-DETACHMENT-MEASUREMENT",
		},
		EXCITATION: {
			INFO: "LASER-RESPONSE-EXCITATION-INFO",
			CONVERSIONS: "LASER-RESPONSE-EXCITATION-CONVERSIONS",
			MEASUREMENT: "LASER-RESPONSE-EXCITATION-MEASUREMENT",
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

module.exports = { IPCMessages, UI, SEVI, IRACTION, LASER, MSG };
