/************************************************** 

		Control for Global Settings

**************************************************/

const ipcMain = require("electron").ipcMain;
const fs = require("fs");
const path = require("path");
const { IPCMessages } = require("./Libraries/Messages.js");
const { BinSize, TriggerDetection, Settings } = require("./Libraries/SettingsClasses.js");

/*****************************************************************************

								SETTINGS MANAGER

*****************************************************************************/

const SettingsManager = {
	settings: new Settings(),
	tempsettings: new Settings(),
	filename: path.join(".", "Settings", "Settings.JSON"),
	read: () => SettingsManager_read(),
	save: () => SettingsManager_save(),
};

function SettingsManager_read() {
	fs.readFile(SettingsManager.filename, (error, data) => {
		if (error) {
			console.error(`Could not find settings file at ${file_name}`);
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
			SettingsManager.settings.save_directory = saved_settings["save_directory"];
			SettingsManager.settings.wavemeter = saved_settings["wavemeter"];
			SettingsManager.settings.windows = saved_settings["windows"];
			SettingsManager.settings.vmi = saved_settings["vmi"];
			SettingsManager.settings.testing = saved_settings["testing"];
		}
	});
}

function SettingsManager_save() {
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
		save_directory: SettingsManager.settings.save_directory,
		wavemeter: SettingsManager.settings.wavemeter,
		windows: SettingsManager.settings.windows,
		vmi: SettingsManager.settings.vmi,
		testing: SettingsManager.settings.testing,
	};
	let settings_JSON = JSON.stringify(settings, null, "/t");
	fs.writeFile(SettingsManager.filename, settings_JSON);
}

/*****************************************************************************

							IPC MESSAGES

*****************************************************************************/

/*****************************************************************************

						SETTINGS MANAGER MESSENGER

*****************************************************************************/

class SettingsManagerMessenger {
	constructor() {}

	get dummy_variable() {
		return SettingsManager.settings.testing.dummy_variable;
	}
	set dummy_variable(value) {
		SettingsManager.settings.testing.dummy_variable = value;
	}
}

module.exports = { SettingsManagerMessenger };
