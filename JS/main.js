const { app, BrowserWindow, dialog, ipcMain, nativeTheme, Menu } = require("electron");
const path = require("path");
const fs = require("fs");

let mainWin;
let LVWin;
let invisibleWin;

// NOTE TO MARTY: Should change these to be snake case
const settings = {
	file_name: "./Settings/Settings.JSON",
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
		save_directory: {
			base_dir: "./Images",
			base_dir_short: "./Images",
			year_dir: "",
			day_dir: "",
			full_dir: "",
			full_dir_short: "",
			previous_scans_dir: "./PreviousScans",
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
		// Save settings to file
		save: function () {
			let settingsJSON = JSON.stringify(settings.information);
			fs.writeFile(settings.file_name, settingsJSON, () => {
				console.log("Settings Saved!");
			});
		},
		save_sync: function () {
			let settingsJSON = JSON.stringify(settings.information);
			fs.writeFileSync(settings.file_name, settingsJSON);
		},
		// Read settings from file
		read: function () {
			// Make sure the settings file exists
			if (fs.existsSync(settings.file_name)) {
				let data = fs.readFileSync(settings.file_name);
				let savedSettings = JSON.parse(data);
				for (let category in savedSettings) {
					for (let key in savedSettings[category]) {
						settings.information[category][key] = savedSettings[category][key];
					}
				}
			}
		},
		// Generate full save directory names
		get_full_dir: function () {
			settings.information.save_directory.full_dir =
				settings.information.save_directory.base_dir +
				"/" +
				settings.information.save_directory.year_dir +
				"/" +
				settings.information.save_directory.day_dir;
			settings.information.save_directory.full_dir_short =
				settings.information.save_directory.base_dir_short +
				"/" +
				settings.information.save_directory.year_dir +
				"/" +
				settings.information.save_directory.day_dir;
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
			nodeIntegrationInWorker: true,
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
						// Only open the live view window if it's not open already
						if (!LVWin) {
							LVWin = createLVWindow();
						}
					},
				},
				// NOTE TO MARTY: Do I want to keep this function in?
				{
					label: "Close Camera",
					click() {
						send_close_camera_msg();
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
	if (mainWin) {
		mainWin.setSize(settings.information.windows.mainWindow.width, settings.information.windows.mainWindow.height);
		// Close app when main window is closed
		mainWin.on("closed", function (event) {
			send_close_camera_msg();
			mainWin = null;
		});
	}

	if (LVWin) {
		LVWin.setSize(settings.information.windows.LVWindow.width, settings.information.windows.LVWindow.height);

		// Get rid of Live View menu bar
		LVWin.removeMenu();
	}

	// Check if there is a folder for today's year and date, and if not create it
	let folder_names = get_folder_names();
	// Update save directory in settings
	settings.information.save_directory.year_dir = folder_names[0];
	settings.information.save_directory.day_dir = folder_names[1];
	settings.functions.get_full_dir();
	// Try to make the year's folder first
	let save_dir = settings.information.save_directory.base_dir + "/" + folder_names[0];
	fs.mkdir(save_dir, (error) => {
		// Error will be filled if the folder already exists, otherwise it'll make the folder
		// In either case we don't care about the error message, so move on
		// Try to make the day's folder
		save_dir += "/" + folder_names[1];
		fs.mkdir(save_dir, (error) => {
			// Again, don't care about the error
		});
	});
});

app.on("window-all-closed", function () {
	app.quit();
});

// Close camera connection and quit the app
function send_close_camera_msg() {
	// Need to delete the day's folders if no images were saved
	delete_empty_folder();
	// Save the settings to file
	settings.functions.save_sync();
	// Send message to invisible window to close camera
	if (invisibleWin) {
		invisibleWin.webContents.send("close-camera", null);
	} else {
		// The invisible window is already closed (ergo no camera connection), just quit the app
		app.quit();
	}
}

// Delete the data folder made on startup if no images were saved
function delete_empty_folder() {
	fs.readdir(settings.information.save_directory.full_dir, (error, files) => {
		if (!error && !files.length) {
			// The folder is empty but does exists, so we need to delete it
			fs.rmdir(settings.information.save_directory.full_dir, (error) => {
				// Folder is deleted
			});
			// Could do this without reading the directory first, but I don't want to risk
			// 	accidentally deleting data
		}
	});
}

function get_folder_names() {
	let today = new Date();
	let formatted_day = ("0" + today.getDate()).slice(-2);
	let formatted_month = ("0" + (today.getMonth() + 1)).slice(-2);
	let full_formatted_year = today.getFullYear().toString();
	let formatted_year = full_formatted_year.slice(-2);
	return [full_formatted_year, formatted_month + formatted_day + formatted_year];
}

//
//		Messengers
//

// Message received from main window
// Main window is loaded, send the settings info
ipcMain.on("main-window-ready", function (event, arg) {
	//settings.functions.read();
	if (mainWin) {
		mainWin.webContents.send("settings-information", settings.information);
	}
});

// Message received from main window
// Load dialog to choose which directory to save the images to
ipcMain.on("update-save-directory", function (event, arg) {
	dialog
		.showOpenDialog({
			title: "Choose Base Save Directory (Not Year or Day Directories)",
			buttonLabel: "Choose Folder",
			defaultPath: app.getPath("documents"),
			properties: ["openDirectory"],
		})
		.then(function (result) {
			if (!result.canceled) {
				// File explorer was not canceled
				let actualReturnPath = result.filePaths[0];
				console.log(result.filePaths);
				let returnPath;

				// Check if Home directory is included in path
				// If so, remove (to clean up aesthetically)
				// Do the same for the app's parent directory
				let homePath = app.getPath("home");
				let appPath = app.getAppPath();
				if (actualReturnPath.includes(appPath)) {
					returnPath = "." + actualReturnPath.substr(appPath.length);
				} else if (actualReturnPath.includes(homePath)) {
					// NOTE TO MARTY: I don't think "~" works on Windows
					returnPath = "~" + actualReturnPath.substr(homePath.length);
				}

				console.log(returnPath);

				// Send message back to main window with directory path
				event.reply("new-save-directory", [actualReturnPath, returnPath]);
			}
		})
		.catch(function (err) {
			console.log(err);
		});
});

// Message received from main window
// Update the settings
ipcMain.on("update-settings", function (event, update) {
	let MartyDoSomethingHere = true;
});

// Message received from main window
// Tell live view window whether a scan was started/paused/etc
ipcMain.on("scan-update", function (event, update) {
	// Need to make sure the live view window is open
	if (LVWin) {
		LVWin.webContents.send("scan-update", update);
	}
});

// Message received from invisible window
// Relay centroid data to main and live view windows
ipcMain.on("new-camera-frame", function (event, info) {
	// Send data to main window if it's open
	if (mainWin) {
		mainWin.webContents.send("new-camera-frame", info);
	}

	// Send data to live view window if it's open
	if (LVWin) {
		LVWin.webContents.send("new-camera-frame", info);
	}
});

// Message received from main window
// Send message to live view window to update e- chart axes
ipcMain.on("update-axes", function (event, axisSizes) {
	if (LVWin) {
		LVWin.webContents.send("update-axes", axisSizes);
	}
});

// Message received from invisible window
// Close the app after the camera is successfully closed
ipcMain.on("camera-closed", function (event, msg) {
	app.quit();
});

// Message received from main window
// Send message to invisible window to turn hybrid method on and off
ipcMain.on("hybrid-method", function (event, message) {
	if (invisibleWin) {
		invisibleWin.webContents.send("hybrid-method", message);
	}
});
