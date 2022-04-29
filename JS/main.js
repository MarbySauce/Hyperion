const { app, BrowserWindow, dialog, ipcMain, nativeTheme, Menu } = require("electron");
const path = require("path");
const fs = require("fs");

let mainWin;
let LVWin;
let invisibleWin;

let LVWinOpen = false;

const settings = {
	information: {
		camera: {
			xAoI: 0,
			yAoI: 0,
			xOffset: 0,
			yOffset: 0,
			exposureTime: 0,
			gain: 0,
			gainBoost: false,
			trigger: "Rising Edge",
			triggerDelay: 0,
		},
		centroid: {
			accumulation: "Centroid",
			hybridMethod: true,
			binSize: 100,
		},
		display: {
			sliderValue: 0.5,
		},
		eChart: {
			xAxisMax: 30,
			yAxisMax: 20,
		},
		saveDirectory: {
			currentScan: "./Images",
			currentScanShort: "./Images",
			previousScans: "./PreviousScans",
		},
		windows: {
			mainWindow: {
				x: 1480,
				y: -300,
				width: 1200,
				height: 1000,
			},
			LVWindow: {
				x: 2950,
				y: -300,
				width: 1200,
				height: 820,
			},
		},
	},
	functions: {
		save: function () {
			let settingsJSON = JSON.stringify(settings);
			fs.writeFile("./Settings/Settings.JSON", settingsJSON, () => {
				console.log("Settings Saved!");
			});
		},
		read: function () {
			let data = fs.readFileSync("./Settings/Settings.JSON");
			let savedSettings = JSON.parse(data);
			for (let category in savedSettings) {
				for (let key in savedSettings[category]) {
					settings.information[category][key] = savedSettings[category][key];
				}
			}
		},
	},
};

function createMainWindow() {
	let win = new BrowserWindow({
		width: 1200,
		height: 1000,
		minWidth: 600,
		minHeight: 600,
		x: settings.information.windows.mainWindow.x,
		y: settings.information.windows.mainWindow.y,
		webPreferences: {
			nodeIntegration: true,
			contextIsolation: false,
			backgroundThrottling: false,
		},
	});

	let menu = Menu.buildFromTemplate([
		{
			label: "Menu",
			submenu: [
				{
					label: "Open Live View",
					click() {
						if (!LVWinOpen) {
							LVWin = createLVWindow();
						}
					},
				},
				{
					label: "Close Camera",
					click() {
						SendCloseCameraMsg();
					},
				},
			],
		},
	]);
	Menu.setApplicationMenu(menu);

	win.loadFile("HTML/mainWindow.html");
	win.webContents.openDevTools();

	return win;
}

function createLVWindow() {
	win = new BrowserWindow({
		width: 1200,
		height: 820,
		x: settings.information.windows.LVWindow.x,
		y: settings.information.windows.LVWindow.y,
		webPreferences: {
			nodeIntegration: true,
			contextIsolation: false,
			backgroundThrottling: false,
		},
	});

	win.loadFile("HTML/LVWindow.html");
	//win.webContents.openDevTools();

	LVWinOpen = true;

	win.on("close", function (event) {
		LVWinOpen = false;
	});

	return win;
}

function createInvisibleWindow() {
	win = new BrowserWindow({
		width: 400,
		height: 400,
		show: false,
		webPreferences: {
			nodeIntegration: true,
			contextIsolation: false,
			backgroundThrottling: false,
		},
	});

	win.loadFile("HTML/InvisibleWindow.html");
	//win.webContents.openDevTools();

	return win;
}

app.whenReady().then(function () {
	// Read settings from file
	settings.functions.read();

	// Set dark mode
	nativeTheme.themeSource = "dark";

	mainWin = createMainWindow();
	//invisibleWin = createInvisibleWindow();
	//LVWin = createLVWindow();

	app.on("activate", function () {
		if (BrowserWindow.getAllWindows().length === 0) {
			mainWin = createMainWindow();
			invisibleWin = createInvisibleWindow();
			LVWin = createLVWindow();
		}
	});

	// If one monitor is too small, Electron doesn't size windows well
	// Fixed by rechanging the size after creation
	mainWin.setSize(settings.information.windows.mainWindow.width, settings.information.windows.mainWindow.height);
	//LVWin.setSize(settings.information.windows.LVWindow.width, settings.information.windows.LVWindow.height);

	// Get rid of Live View menu bar
	//LVWin.removeMenu();

	// Send settings information to main window when ready
	mainWin.on("ready-to-show", () => {
		mainWin.webContents.send("settings-information", settings.information);
	})

	// Close LV window when main window is closed
	mainWin.on("close", function (event) {
		/*event.preventDefault();
	mainWin.hide();
	LVWin.hide();
	mainWin.webContents.send("closing-main-window", null);*/

		//
		// Could add in a timeout so that if a success is not received
		// from the main window, the app still quits
		//

		SendCloseCameraMsg();
		//app.quit();
	});
});

ipcMain.on("closing-main-window-received", (event, arg) => {
	//console.log(arg);
	mainWin.destroy();
	//app.quit();
});

app.on("window-all-closed", function () {
	app.quit();
});

//
//		Messengers
//
ipcMain.on("UpdateSaveDirectory", function (event, arg) {
	dialog
		.showOpenDialog({
			title: "Choose Save Directory",
			buttonLabel: "Choose Folder",
			defaultPath: app.getPath("documents"),
			properties: ["openDirectory"],
		})
		.then(function (result) {
			if (!result.canceled) {
				// File explorer was not canceled
				let actualReturnPath = result.filePaths[0];
				let returnPath;

				// Check if Home directory is included in path
				// If so, remove (to clean up aesthetically)
				// Do the same for the app's parent directory
				let homePath = app.getPath("home");
				let appPath = app.getAppPath();
				if (actualReturnPath.includes(appPath)) {
					returnPath = "." + actualReturnPath.substr(appPath.length);
				} else if (actualReturnPath.includes(homePath)) {
					returnPath = "~" + actualReturnPath.substr(homePath.length);
				}

				// Send message back with directory path
				event.reply("NewSaveDirectory", [actualReturnPath, returnPath]);
			}
		})
		.catch(function (err) {
			console.log(err);
		});
});

// Tell invisible window to start centroiding
ipcMain.on("StartCentroiding", function (event, arg) {
	//invisibleWin.webContents.send("StartCentroiding", null);
});

// Tell invisible window to stop centroiding
ipcMain.on("StopCentroiding", function (event, arg) {
	//invisibleWin.webContents.send("StopCentroiding", null);
});

ipcMain.on("ScanUpdate", function (event, update) {
	LVWin.webContents.send("ScanUpdate", update);
});

// Relay centroid data to visible windows
ipcMain.on("new-camera-frame", function (event, info) {
	// info is an object containing image and calculated centers
	let doNothing;

	// Send data to main window if it's open
	try {
		mainWin.webContents.send("new-camera-frame", info);
	} catch {
		doNothing = true;
	}

	// Send data to live view window if it's open
	try {
		LVWin.webContents.send("new-camera-frame", info);
	} catch {
		doNothing = true;
	}
});

// Turn hybrid method on and off
ipcMain.on("HybridMethod", function (event, message) {
	// Send message to invisible window
	//invisibleWin.webContents.send("HybridMethod", message);
});

// Update eChart axes on Live Video window
ipcMain.on("UpdateAxes", function (event, axisSizes) {
	// Send message to LV window
	LVWin.webContents.send("UpdateAxes", axisSizes);
});

// Close camera connection
function SendCloseCameraMsg() {
	//invisibleWin.webContents.send("CloseCamera", null);
}

// Close the app after the camera is successfully closed
// Need to change this so it doesn't close the app if you only want to close the camera
ipcMain.on("CameraClosed", function (event, msg) {
	setTimeout(() => {
		app.quit();
	}, 2000 /* ms */);
});

// Send the settings information to the main and live view windows
function SendSettings() {
	let settings2 = {
		a: "Hi",
		b: "There",
	};
	mainWin.webContents.send("settings-information", settings2);
	LVWin.webContents.send("settings-information", settings2);
}
