const { app, BrowserWindow, dialog, ipcMain, nativeTheme, Menu } = require("electron");
const path = require("path");
const fs = require("fs");

// Declaring variables for each window used
let main_window; // Main window, for bulk of processing and control
let live_view_window; // Auxilliary window for displaying incoming camera images
let invisible_window; // Hidden window used to communicate with camera and centroid images

const settings = {
	file_name: "./Settings/Settings.JSON",
	information: {
		camera: {
			x_AoI: 0,
			y_AoI: 0,
			x_offset: 0,
			y_offset: 0,
			exposure_time: 0,
			gain: 0,
			gain_boost: false,
			trigger: "Rising Edge",
			trigger_delay: 0,
		},
		centroid: {
			accumulation: "Centroid",
			hybrid_method: true,
			bin_size: 100,
		},
		display: {
			slider_value: 0.5,
		},
		e_chart: {
			x_axis_max: 30,
			y_axis_max: 20,
		},
		save_directory: {
			base_dir: "./Images",
			base_dir_short: "./Images",
			year_dir: "",
			day_dir: "",
			scan_dir: "Hyperion Scan Information",
			full_dir: "",
			full_dir_short: "",
			full_scan_dir: "",
		},
		windows: {
			main_window: {
				x: 0,
				y: 0,
				width: 1200,
				height: 1000,
			},
			live_view_window: {
				x: 0,
				y: 0,
				width: 1200,
				height: 820,
			},
		},
	},
	functions: {
		// Save settings to file
		save: function () {
			// Save settings asynchronously (non-blocking)
			let settings_JSON = JSON.stringify(settings.information);
			fs.writeFile(settings.file_name, settings_JSON, () => {});
		},
		save_sync: function () {
			// Save settings synchronously (blocking)
			// Used to save settings on app close
			let settings_JSON = JSON.stringify(settings.information);
			fs.writeFileSync(settings.file_name, settings_JSON);
		},
		// Read settings from file
		read: function () {
			// Make sure the settings file exists
			if (fs.existsSync(settings.file_name)) {
				let data = fs.readFileSync(settings.file_name);
				let saved_settings = JSON.parse(data);
				for (let category in saved_settings) {
					for (let key in saved_settings[category]) {
						if (settings.information[category] !== undefined && settings.information[category][key] !== undefined) {
							settings.information[category][key] = saved_settings[category][key];
						}
					}
				}
			}
		},
		// Generate full save directory names
		get_full_dir: function () {
			// Create full save directory location
			settings.information.save_directory.full_dir =
				settings.information.save_directory.base_dir +
				"/" +
				settings.information.save_directory.year_dir +
				"/" +
				settings.information.save_directory.day_dir;
			// Create shorter version of save directory location (for displaying)
			settings.information.save_directory.full_dir_short =
				settings.information.save_directory.base_dir_short +
				"/" +
				settings.information.save_directory.year_dir +
				"/" +
				settings.information.save_directory.day_dir;
			// Create scan information save directory
			settings.information.save_directory.full_scan_dir =
				settings.information.save_directory.base_dir_short +
				"/" +
				settings.information.save_directory.year_dir +
				"/" +
				settings.information.save_directory.scan_dir;
		},
	},
};

function create_main_window() {
	// Create the window
	let win = new BrowserWindow({
		width: 1200,
		height: 1000,
		minWidth: 600,
		minHeight: 600,
		x: settings.information.windows.main_window.x,
		y: settings.information.windows.main_window.y,
		webPreferences: {
			nodeIntegration: true,
			nodeIntegrationInWorker: true,
			contextIsolation: false,
			backgroundThrottling: false,
		},
	});

	// Create custom menu for main window
	let menu = Menu.buildFromTemplate([
		{
			label: "Menu",
			submenu: [
				{
					label: "Open Live View",
					click() {
						// Only open the live view window if it's not open already
						if (!live_view_window) {
							live_view_window = create_live_view_window();
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
	//Menu.setApplicationMenu(menu);

	win.loadFile("HTML/mainWindow.html");
	win.webContents.openDevTools();

	return win;
}

function create_live_view_window() {
	// Create the window
	win = new BrowserWindow({
		width: 1200,
		height: 820,
		x: settings.information.windows.live_view_window.x,
		y: settings.information.windows.live_view_window.y,
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

function create_invisible_window() {
	// Create the window
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

	main_window = create_main_window();
	//invisible_window = create_invisible_window();
	//live_view_window = create_live_view_window();

	app.on("activate", function () {
		if (BrowserWindow.getAllWindows().length === 0) {
			main_window = create_main_window();
			invisible_window = create_invisible_window();
			live_view_window = create_live_view_window();
		}
	});

	// If one monitor is too small, Electron doesn't size windows well
	// Fixed by rechanging the size after creation
	if (main_window) {
		main_window.setSize(settings.information.windows.main_window.width, settings.information.windows.main_window.height);
		// Close app when main window is closed
		main_window.on("closed", function (event) {
			send_close_camera_msg();
			main_window = null;
		});
	}

	if (live_view_window) {
		live_view_window.setSize(settings.information.windows.live_view_window.width, settings.information.windows.live_view_window.height);

		// Get rid of Live View menu bar
		live_view_window.removeMenu();
	}

	// Check if there is a folder for today's year and date, and if not create it
	create_folders();
});

app.on("window-all-closed", function () {
	app.quit();
});

// Send settings information to main window
function send_settings() {
	if (main_window) {
		main_window.webContents.send("settings-information", settings.information);
	}
}

// Close camera connection and quit the app
function send_close_camera_msg() {
	// Need to delete the day's folders if no images were saved
	delete_empty_folder();
	// Save the settings to file
	settings.functions.save_sync();
	// Send message to invisible window to close camera
	if (invisible_window) {
		invisible_window.webContents.send("close-camera", null);
	} else {
		// The invisible window is already closed (ergo no camera connection), just quit the app
		app.quit();
	}
}

// Create folders (day, year) to store images and scan information
function create_folders() {
	// Check if there is a folder for today's year and date, and if not create it
	let folder_names = get_folder_names();
	// Update save directory in settings
	settings.information.save_directory.year_dir = folder_names[0];
	settings.information.save_directory.day_dir = folder_names[1];
	settings.functions.get_full_dir();
	// Try to make the year's folder first
	let year_save_dir = settings.information.save_directory.base_dir + "/" + folder_names[0];
	fs.mkdir(year_save_dir, (error) => {
		// Error will be filled if the folder already exists, otherwise it'll make the folder
		// In either case we don't care about the error message, so move on

		// Try to make the day's folder
		let day_save_dir = settings.information.save_directory.full_dir;
		fs.mkdir(day_save_dir, (error) => {});

		// Try to make scan info folder
		let scan_save_dir = settings.information.save_directory.full_scan_dir;
		fs.mkdir(scan_save_dir, (error) => {});
	});
}

// Delete the data folder made on startup if no images were saved
function delete_empty_folder() {
	// Check for today's folder
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
	// Check for scan information folder (same process)
	fs.readdir(settings.information.save_directory.full_scan_dir, (error, files) => {
		if (!error && !files.length) {
			// The folder is empty but does exists, so we need to delete it
			fs.rmdir(settings.information.save_directory.full_scan_dir, (error) => {});
		}
	});
}

// Get formatted names of year and date (MMDDYY) for folder creation
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
	send_settings();
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
				let full_save_path = result.filePaths[0];
				let short_save_path;

				// Check if Home directory is included in path
				// If so, remove (to clean up aesthetically)
				// Do the same for the app's parent directory
				let home_path = app.getPath("home");
				let app_path = app.getAppPath();
				if (full_save_path.includes(app_path)) {
					// Use "." to represent base app folder
					short_save_path = "." + full_save_path.substring(app_path.length, full_save_path.length);
				} else if (full_save_path.includes(home_path)) {
					// Use "~" to represent user folder
					short_save_path = "~" + full_save_path.substring(home_path.length, full_save_path.length);
				}

				console.log(short_save_path);

				// Update path in settings
				settings.information.save_directory.base_dir = full_save_path;
				settings.information.save_directory.base_dir_short = short_save_path;
				settings.functions.get_full_dir();

				// Send updated settings to main window
				send_settings();
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
	if (live_view_window) {
		live_view_window.webContents.send("scan-update", update);
	}
});

// Message received from invisible window
// Relay centroid data to main and live view windows
ipcMain.on("new-camera-frame", function (event, info) {
	// Send data to main window if it's open
	if (main_window) {
		main_window.webContents.send("new-camera-frame", info);
	}

	// Send data to live view window if it's open
	if (live_view_window) {
		live_view_window.webContents.send("new-camera-frame", info);
	}
});

// Message received from main window
// Send message to live view window to update e- chart axes
ipcMain.on("update-axes", function (event, axis_sizes) {
	if (live_view_window) {
		live_view_window.webContents.send("update-axes", axis_sizes);
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
	if (invisible_window) {
		invisible_window.webContents.send("hybrid-method", message);
	}
});
