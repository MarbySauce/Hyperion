const { app, BrowserWindow, dialog, ipcMain, nativeTheme } = require("electron");
const path = require("path");

let mainWin;
let LVWin;
let invisibleWin;

// Way to quickly switch between monitors
// 0 -> work monitor, 1 -> home monitor, 
// 2 -> no monitor, 3 -> Lab comp
const thisMonitor = 3;
const monitor = [
	[
		[-1850, -300],
		[-1100, 0],
	],
	[
		[1480, -300],
		[2950, -300],
	],
	[
		[0, 0],
		[20, 20],
	],
	[
		[50, 0],
		[-2900, 0],
	]
];

function createMainWindow() {
	const win = new BrowserWindow({
		width: 1200,
		height: 1000,
		minWidth: 600,
		minHeight: 600,
		//x: 1480,
		//y: -300,
		//x: -1850,
		//y: -200,
		x: monitor[thisMonitor][0][0],
		y: monitor[thisMonitor][0][1],
		webPreferences: {
			nodeIntegration: true,
			contextIsolation: false,
		},
	});

	win.loadFile("HTML/mainWindow.html");
	//win.webContents.openDevTools();

	return win;
}

function createLVWindow() {
	win = new BrowserWindow({
		width: 1200,
		height: 820,
		//x: 2950,
		//y: -300,
		//x: -900,
		//y: 50,
		x: monitor[thisMonitor][1][0],
		y: monitor[thisMonitor][1][1],
		webPreferences: {
			nodeIntegration: true,
			contextIsolation: false,
		},
	});

	win.loadFile("HTML/LVWindow.html");
	//win.webContents.openDevTools();

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
		},
	});

	win.loadFile("HTML/InvisibleWindow.html");
	win.webContents.openDevTools();

	return win;
}

app.whenReady().then(function () {
	// Set dark mode
	nativeTheme.themeSource = 'dark';

	invisibleWin = createInvisibleWindow();
	LVWin = createLVWindow();
	mainWin = createMainWindow();

	app.on("activate", function () {
		if (BrowserWindow.getAllWindows().length === 0) {
			invisibleWin = createInvisibleWindow();
			LVWin = createLVWindow();
			mainWin = createMainWindow();
		}
	});

	// Get rid of Live View menu bar
	LVWin.removeMenu();

	// Close LV window when main window is closed
	// !! Update comments
	mainWin.on("close", function (event) {
		/*event.preventDefault();
		mainWin.hide();
		LVWin.hide();
		mainWin.webContents.send("closing-main-window", null);*/
		app.quit();
	});
});

ipcMain.on("closing-main-window-received", (event, arg) => {
	//console.log(arg);
	mainWin.destroy();
	app.quit();
});

app.on("window-all-closed", function () {
	app.quit();
});

// Messengers
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
	invisibleWin.webContents.send("StartCentroiding", null);
});

// Tell invisible window to stop centroiding
ipcMain.on("StopCentroiding", function (event, arg) {
	invisibleWin.webContents.send("StopCentroiding", null);
});

ipcMain.on("ScanUpdate", function (event, update) {
	LVWin.webContents.send("ScanUpdate", update);
});

// Relay centroid data to visible windows
ipcMain.on("LVImageUpdate", function (event, arg) {
	// arg is an object containing image and calculated centers
	let doNothing;

	// Send data to main window if it's open
	try {
		mainWin.webContents.send("LVImageUpdate", arg);
	} catch {
		doNothing = true;
	}

	// Send data to live view window if it's open
	try {
		LVWin.webContents.send("LVImageUpdate", arg);
	} catch {
		doNothing = true;
	}
});

// Turn hybrid method on and off
ipcMain.on("HybridMethod", function (event, message) {
	// Send message to invisible window
	invisibleWin.webContents.send("HybridMethod", message);
});
