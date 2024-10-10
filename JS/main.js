const { app, BrowserWindow, dialog, ipcMain, nativeTheme, Menu } = require("electron");
const fs = require("fs");
const path = require("path");
const { IPCMessages } = require("./Libraries/Messages.js");
const { BinSize, TriggerDetection, Settings } = require("./Libraries/SettingsClasses.js");

/*****************************************************************************

									STARTUP

*****************************************************************************/

app.on("ready", () => {
	// Read settings from file
	SettingsManager.read();

	// Set dark mode
	nativeTheme.themeSource = "dark";

	// Create windows
	create_main_window();
	if (Windows.params.open_live_view_window) create_live_view_window();
	if (Windows.params.open_invisible_window) create_invisible_window();
});

app.on("window-all-closed", () => {
	app.quit();
});

/*****************************************************************************

								WINDOWS CONTROL

*****************************************************************************/

const Windows = {
	params: {
		open_live_view_window: true,
		open_invisible_window: true,
		open_main_dev_tools: true,
		open_live_view_dev_tools: false,
		open_invisible_dev_tools: false,
	},
	main: undefined, // Main Window
	live_view: undefined, // Live View Window
	invisible: undefined, // Invisible Window
};

function create_main_window() {
	let win = new BrowserWindow({
		show: false,
		minWidth: 600,
		minHeight: 600,
		webPreferences: {
			nodeIntegration: true,
			nodeIntegrationInWorker: true,
			contextIsolation: false,
			backgroundThrottling: false,
		},
	});

	// Create custom menu for main window
	let menu = Menu.buildFromTemplate([
		...(process.platform === "darwin" ? [{ label: app.name }] : []),
		{
			label: "Windows",
			sublabel: "Hello",
			submenu: [
				{
					label: "Open Live View",
					click() {
						// Only open the live view window if it's not open already
						if (Windows.live_view === undefined) {
							create_live_view_window(SettingsManager.settings.windows);
							resize_live_view_window(SettingsManager.settings.windows);
						}
					},
				},
			],
		},
		{
			label: "Dev Tools",
			submenu: [
				{
					label: "Open Main Window Dev Tools",
					click() {
						if (Windows.main?.webContents) Windows.main.webContents.openDevTools();
					},
				},
				{
					label: "Open Live View Window Dev Tools",
					click() {
						if (Windows.live_view?.webContents) Windows.live_view.webContents.openDevTools();
					},
				},
				{
					label: "Open Invisible Window Dev Tools",
					click() {
						if (Windows.invisible?.webContents) Windows.invisible.webContents.openDevTools();
					},
				},
			],
		},
		{
			label: "External",
			submenu: [
				{
					label: "Camera",
					submenu: [
						{
							label: "Open Camera",
							click() {
								// Send message to invisible window to close camera
								if (Windows.invisible) {
									Windows.invisible.webContents.send(IPCMessages.CONNECT.CAMERA);
								} else {
									create_invisible_window();
									Windows.invisible.webContents.send(IPCMessages.CONNECT.CAMERA);
								}
							},
						},
						{
							label: "Close Camera",
							click() {
								// Send message to invisible window to close camera
								if (Windows.invisible) Windows.invisible.webContents.send(IPCMessages.UPDATE.CLOSECAMERA);
							},
						},
					],
				},
				{
					label: "Open Wavemeter Application",
					click() {
						// Send message to main window to open wavemeter application
						if (Windows.main) Windows.main.webContents.send(IPCMessages.CONNECT.WAVEMETER);
					},
				},
				{
					label: "Connect to OPO",
					click() {
						// Send message to main window to connect to OPO/A
						if (Windows.main) Windows.main.webContents.send(IPCMessages.CONNECT.OPO);
					},
				},
			],
		},
	]);
	Menu.setApplicationMenu(menu);

	win.loadFile("HTML/mainWindow.html");

	if (Windows.params.open_main_dev_tools) {
		win.webContents.openDevTools();
	}

	// Create window reference
	Windows.main = win;

	// Close app if Main window is gone
	//win.webContents.on("render-process-gone", (event, details) => {
	//	shut_down_app();
	//});

	// Close app if Main window is closed
	win.once("closed", (event) => {
		Windows.main = undefined;
		shut_down_app();
	});
}

/**
 * Resize Main Window to settings' specifications
 */
function resize_main_window(windows_settings) {
	if (Windows.main) {
		Windows.main.setPosition(windows_settings.main.x, windows_settings.main.y);
		Windows.main.setSize(windows_settings.main.width, windows_settings.main.height);
		Windows.main.show();
	}
}

function create_live_view_window() {
	// Create the window
	win = new BrowserWindow({
		show: false,
		webPreferences: {
			nodeIntegration: true,
			contextIsolation: false,
			backgroundThrottling: false,
		},
	});
	// Get rid of Live View menu bar
	win.removeMenu();

	win.loadFile("HTML/LVWindow.html");

	if (Windows.params.open_live_view_dev_tools) {
		win.webContents.openDevTools();
	}

	// Create window reference
	Windows.live_view = win;

	// Delete window reference when window is closed
	win.once("closed", (event) => {
		Windows.live_view = undefined;
	});
}

/**
 * Resize Live View Window to settings' specifications
 */
function resize_live_view_window(windows_settings) {
	if (Windows.live_view) {
		Windows.live_view.setPosition(windows_settings.live_view.x, windows_settings.live_view.y);
		Windows.live_view.setSize(windows_settings.live_view.width, windows_settings.live_view.height);
		Windows.live_view.show();
	}
}

function create_invisible_window() {
	// Create the window
	win = new BrowserWindow({
		show: false,
		webPreferences: {
			nodeIntegration: true,
			contextIsolation: false,
			backgroundThrottling: false,
		},
	});

	win.loadFile("HTML/InvisibleWindow.html");

	if (Windows.params.open_invisible_dev_tools) {
		win.webContents.openDevTools();
	}

	Windows.invisible = win;

	win.once("closed", () => {
		Windows.invisible = undefined;
	});
}

/** Close all windows */
function close_windows() {
	if (Windows.main) Windows.main.close();
	if (Windows.live_view) Windows.live_view.close();
	if (Windows.invisible) Windows.invisible.close();
}

/** Shut down the app safely */
function shut_down_app() {
	// Close Main and Live View windows
	delete_empty_folder();
	if (Windows.main) Windows.main.close();
	if (Windows.live_view) Windows.live_view.close();
	Windows.main = undefined;
	Windows.live_view = undefined;
	// Send message to invisible window to close camera
	if (Windows.invisible) Windows.invisible.webContents.send(IPCMessages.UPDATE.CLOSECAMERA);
}

/*****************************************************************************

								SETTINGS CONTROL

*****************************************************************************/

const SettingsManager = {
	settings: new Settings(),
	temp_settings: new Settings(),
	filename: path.join(".", "Settings", "Settings.JSON"),
	read: () => SettingsManager_read(),
	save: (callback) => SettingsManager_save(callback),
	get_full_directory: () => SettingsManager_get_full_directory(),
};

function SettingsManager_read() {
	fs.readFile(SettingsManager.filename, (error, data) => {
		if (error) {
			console.error(`Could not find settings file at ${SettingsManager.filename}`);
		} else {
			let saved_settings = JSON.parse(data);

			SettingsManager.settings.action = saved_settings["action"];
			SettingsManager.settings.autosave = saved_settings["autosave"];
			SettingsManager.settings.autostop = saved_settings["autostop"];
			SettingsManager.settings.camera = saved_settings["camera"];
			SettingsManager.settings.centroid = saved_settings["centroid"];
			SettingsManager.settings.detachment_laser = saved_settings["detachment_laser"];
			SettingsManager.settings.excitation_laser = saved_settings["excitation_laser"];
			SettingsManager.settings.image_series = saved_settings["image_series"];
			SettingsManager.settings.melexir = saved_settings["melexir"];
			SettingsManager.settings.save_directory.base_directory = saved_settings["save_directory"]["base_directory"];
			SettingsManager.settings.wavemeter = saved_settings["wavemeter"];
			SettingsManager.settings.windows = saved_settings["windows"];
			SettingsManager.settings.vmi = saved_settings["vmi"];
			SettingsManager.settings.testing = saved_settings["testing"];

			SettingsManager.settings.ISBLANK = false; // Settings have been updated

			SettingsManager.temp_settings = SettingsManager.settings;

			// Create folders to save images
			create_folders();
		}
	});
}

function SettingsManager_save(callback) {
	const settings = {
		action: SettingsManager.settings.action,
		autosave: SettingsManager.settings.autosave,
		autostop: SettingsManager.settings.autostop,
		camera: SettingsManager.settings.camera,
		centroid: SettingsManager.settings.centroid,
		detachment_laser: SettingsManager.settings.detachment_laser,
		excitation_laser: SettingsManager.settings.excitation_laser,
		image_series: SettingsManager.settings.image_series,
		melexir: SettingsManager.settings.melexir,
		save_directory: {
			base_directory: SettingsManager.settings.save_directory.base_directory,
		},
		wavemeter: SettingsManager.settings.wavemeter,
		windows: SettingsManager.settings.windows,
		vmi: SettingsManager.settings.vmi,
		testing: SettingsManager.settings.testing,
	};
	let settings_JSON = JSON.stringify(settings, null, "\t");
	fs.writeFile(SettingsManager.filename, settings_JSON, () => {
		if (callback) {
			callback();
		}
	});
}

function SettingsManager_get_full_directory() {
	SettingsManager.settings.save_directory.full_directory = path.join(
		SettingsManager.settings.save_directory.base_directory,
		SettingsManager.settings.save_directory.year_directory,
		SettingsManager.settings.save_directory.day_directory
	);
}

/**
 * Send settings to `window`
 * @param {BrowserWindow} window - Either Windows.main, Windows.live_view, or Windows.invisible
 */
function send_settings(window) {
	if (window) {
		window.webContents.send(IPCMessages.INFORMATION.SETTINGS, SettingsManager.settings);
	}
}

/**
 * Send temporary settings to `window`
 * @param {BrowserWindow} window - Either Windows.main, Windows.live_view, or Windows.invisible
 */
function send_temp_settings(window) {
	if (window) {
		window.webContents.send(IPCMessages.INFORMATION.SETTINGS, SettingsManager.temp_settings);
	}
}

function check_for_new_window_size(new_settings, old_settings) {
	if (new_settings.windows.main.x !== old_settings.windows.main.x) return true;
	if (new_settings.windows.main.y !== old_settings.windows.main.y) return true;
	if (new_settings.windows.main.width !== old_settings.windows.main.width) return true;
	if (new_settings.windows.main.height !== old_settings.windows.main.height) return true;
	if (new_settings.windows.live_view.x !== old_settings.windows.live_view.x) return true;
	if (new_settings.windows.live_view.y !== old_settings.windows.live_view.y) return true;
	if (new_settings.windows.live_view.width !== old_settings.windows.live_view.width) return true;
	if (new_settings.windows.live_view.height !== old_settings.windows.live_view.height) return true;
	return false;
}

/****
		IPC Event Listeners
****/

ipcMain.on(IPCMessages.INFORMATION.RESET, (event) => {
	if (check_for_new_window_size(SettingsManager.settings, SettingsManager.temp_settings)) {
		resize_main_window(SettingsManager.settings.windows);
		resize_live_view_window(SettingsManager.settings.windows);
	}
	SettingsManager.temp_settings = SettingsManager.settings;
	send_settings(Windows.main);
	send_settings(Windows.live_view);
	send_settings(Windows.invisible);
});

/**
 * Recieve temporary update to settings
 */
ipcMain.on(IPCMessages.INFORMATION.TEMPSETTINGS, (event, temp_settings) => {
	// Update windows and send settings around
	if (check_for_new_window_size(temp_settings, SettingsManager.temp_settings)) {
		resize_main_window(temp_settings.windows);
		resize_live_view_window(temp_settings.windows);
	}
	SettingsManager.temp_settings = temp_settings;
	send_temp_settings(Windows.main);
	send_temp_settings(Windows.live_view);
	send_temp_settings(Windows.invisible);
});

/**
 * Recieve update to settings and save to file
 */
ipcMain.on(IPCMessages.INFORMATION.SETTINGS, (event, settings) => {
	// Update windows and send settings around
	if (check_for_new_window_size(settings, SettingsManager.settings)) {
		resize_main_window(settings.windows);
		resize_live_view_window(settings.windows);
	}
	SettingsManager.settings = settings;
	send_settings(Windows.main);
	send_settings(Windows.live_view);
	send_settings(Windows.invisible);
	SettingsManager.save();
});

/*****************************************************************************

							SAVE DIRECTORY CONTROL

*****************************************************************************/

/** Current date, formatted as MMDDYY */
function get_formatted_date() {
	let today = new Date();
	let day = ("0" + today.getDate()).slice(-2);
	let month = ("0" + (today.getMonth() + 1)).slice(-2);
	let full_year = today.getFullYear().toString();
	let year = full_year.slice(-2);
	return [full_year, month + day + year];
}

/** Create folders (day, year) to store images and scan information */
function create_folders() {
	// Check if there is a folder for today's year and date, and if not create it
	let folder_names = get_formatted_date();
	// Update save directory in settings
	SettingsManager.settings.save_directory.year_directory = folder_names[0];
	SettingsManager.settings.save_directory.day_directory = folder_names[1];
	SettingsManager.get_full_directory();
	// Try to make the year's folder first
	let year_save_dir = path.join(SettingsManager.settings.save_directory.base_directory, SettingsManager.settings.save_directory.year_directory);
	fs.mkdir(year_save_dir, (error) => {
		// Error will be filled if the folder already exists, otherwise it'll make the folder
		// In either case we don't care about the error message, so move on

		// Try to make the day's folder
		let day_save_dir = SettingsManager.settings.save_directory.full_directory;
		fs.mkdir(day_save_dir, (error) => {});
	});
}

/** Delete the data folder made on startup if no images were saved */
function delete_empty_folder() {
	// Check for today's folder
	let directory = SettingsManager.settings.save_directory.full_directory;
	fs.readdir(directory, (error, files) => {
		if (!error && !files.length) {
			// The folder is empty but does exists, so we need to delete it
			fs.rmdir(directory, (error) => {
				// Folder is deleted
			});
			// Could do this without reading the directory first, but I don't want to risk
			// 	accidentally deleting data
		}
	});
}

function prompt_update_save_directory() {
	dialog
		.showOpenDialog({
			title: "Choose Base Save Directory (Not Year or Day Directories)",
			buttonLabel: "Choose Folder",
			defaultPath: app.getPath("documents"),
			properties: ["openDirectory"],
		})
		.then(update_save_directory_setting)
		.catch(function (err) {
			console.log(err);
		});
}

function update_save_directory_setting(save_result) {
	if (!save_result.canceled) {
		let save_path = save_result.filePaths[0];
		SettingsManager.settings.save_directory.base_directory = save_path;
		create_folders();
		//SettingsManager.get_full_directory();
		send_settings(Windows.main);
		SettingsManager.save();
	}
}

/*****************************************************************************

								MELEXIR CONTROL

*****************************************************************************/

function create_mlxr_window() {
	win = new BrowserWindow({
		show: false,
		webPreferences: {
			nodeIntegration: true,
			contextIsolation: false,
		},
	});

	//win.webContents.openDevTools();
	win.loadFile("HTML/mlxrWindow.html");
	return win;
}

ipcMain.on("process-mlxr", (event, data) => {
	let win = create_mlxr_window();
	win.on("ready-to-show", () => {
		win.webContents.send("run-mlxr", data);
		ipcMain.once("mlxr-results", (event, results) => {
			if (Windows.main) Windows.main.webContents.send("mlxr-results", results);
			win.close();
			win = undefined;
		});
	});
});

/*****************************************************************************

								IPC MESSAGES

*****************************************************************************/

// Main window is ready, send the settings info
ipcMain.on(IPCMessages.READY.MAINWINDOW, (event, arg) => {
	send_settings(Windows.main);
});

// Live View window is ready, send the settings info
ipcMain.on(IPCMessages.READY.LIVEVIEW, (event, arg) => {
	send_settings(Windows.live_view);
});

// Invisible window is ready, send the settings info
ipcMain.on(IPCMessages.READY.INVISIBLE, (event, arg) => {
	send_settings(Windows.invisible);
});

// Main window has loaded and is ready to be displayed
ipcMain.on(IPCMessages.LOADED.MAINWINDOW, (event, arg) => {
	resize_live_view_window(SettingsManager.settings.windows);
	resize_main_window(SettingsManager.settings.windows);
});

// New camera frame from Invisible window, relay data to Main and Live View windows
ipcMain.on(IPCMessages.UPDATE.NEWFRAME, (event, info) => {
	// Wrap in try/catch because it throws a bunch of errors if the window is closed
	try {
		Windows.main.webContents.send(IPCMessages.UPDATE.NEWFRAME, info);
	} catch {}

	try {
		Windows.live_view.webContents.send(IPCMessages.UPDATE.NEWFRAME, info);
	} catch {}
});

// Relay error message from Invisible window to Main window
ipcMain.on(IPCMessages.UPDATE.CAMERAERROR, (event, error) => {
	// Wrap in try/catch because it throws a bunch of errors if the window is closed
	try {
		Windows.main.webContents.send(IPCMessages.UPDATE.CAMERAERROR, error);
	} catch {}
});

// Close Invisible window when camera is closed
ipcMain.on(IPCMessages.UPDATE.CAMERACLOSED, () => {
	if (Windows.invisible) Windows.invisible.close();
	Windows.invisible = undefined;
});

// Update directory used for saving files
ipcMain.on(IPCMessages.UPDATE.SAVEDIRECTORY, () => {
	prompt_update_save_directory();
});
