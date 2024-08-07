/************************************************** 

			Control for SEVI UI elements

**************************************************/

const { IPCMessages } = require("../Libraries/Messages");

function Settings_Load_Page() {
	const ipc = require("electron").ipcRenderer;
	const { BinSize, TriggerDetection, Settings } = require("../Libraries/SettingsClasses");
	const { UpdateMessenger } = require("./Managers/UpdateMessenger.js");

	const update_messenger = new UpdateMessenger(); // Messenger used for displaying update or error messages to the Message Display

	// On startup, parse settings
	parse_settings(settings); // (`settings` variable defined in startup.js)

	// Listen for updated settings from Main
	ipc.on(IPCMessages.INFORMATION.SETTINGS, (event, settings_information) => {
		//settings = settings_information;
		parse_settings(settings_information);
	});

	/****
			HTML Element Listeners
	****/

	document.getElementById("ResetSettingsButton").onclick = function () {
		ipc.send(IPCMessages.INFORMATION.RESET);
		update_messenger.update("Settings Reset!");
	};

	document.getElementById("UpdateSettingsButton").onclick = function () {
		let temp_settings = get_new_settings();
		ipc.send(IPCMessages.INFORMATION.TEMPSETTINGS, temp_settings);
		update_messenger.update("Settings Updated!");
	};

	document.getElementById("SaveSettingsButton").onclick = function () {
		let temp_settings = get_new_settings();
		ipc.send(IPCMessages.INFORMATION.SETTINGS, temp_settings);
		update_messenger.update("Settings Saved to File!");
	};

	/****
			Functions
	****/

	/**
	 * Update UI elements with parameters from `settings`
	 * @param {Settings} new_settings
	 */
	function parse_settings(new_settings) {
		// 		Camera Settings
		// Area of Interest
		document.getElementById("AoIWidth").value = new_settings.camera.AoI_width; // AoI Width
		document.getElementById("AoIHeight").value = new_settings.camera.AoI_height; // AoI Height
		document.getElementById("xOffset").value = new_settings.camera.x_offset; // AoI Left Offset
		document.getElementById("yOffset").value = new_settings.camera.y_offset; // AoI Top Offset
		// LED Area
		document.getElementById("LEDXStart").value = new_settings.camera.LED_area.x_start; // LED x start
		document.getElementById("LEDXEnd").value = new_settings.camera.LED_area.x_end; // LED x end
		document.getElementById("LEDYStart").value = new_settings.camera.LED_area.y_start; // LED y start
		document.getElementById("LEDYEnd").value = new_settings.camera.LED_area.y_end; // LED y end
		// Noise Area (for LED)
		document.getElementById("NoiseXStart").value = new_settings.camera.Noise_area.x_start; // Noise x start
		document.getElementById("NoiseXEnd").value = new_settings.camera.Noise_area.x_end; // Noise x end
		document.getElementById("NoiseYStart").value = new_settings.camera.Noise_area.y_start; // Noise y start
		document.getElementById("NoiseYEnd").value = new_settings.camera.Noise_area.y_end; // Noise y end
		// Camera Parameters
		document.getElementById("PixelClock").value = new_settings.camera.pixel_clock; // Pixel clock (MHz)
		document.getElementById("ExposureTime").value = new_settings.camera.exposure_time; // Exposure time (ms)
		document.getElementById("Gain").value = new_settings.camera.gain; // Gain (%)
		document.getElementById("GainBoost").checked = new_settings.camera.gain_boost; // Gain boost
		// Triggering Parameter
		document.getElementById("Trigger").selectedIndex = new_settings.camera.trigger;
		//		Centroiding Settings
		document.getElementById("HybridMethod").checked = new_settings.centroid.use_hybrid_method; // Whether to use HGCM method
		// Bin Size
		let bin_size = document.getElementById("CentroidBinSize");
		switch (new_settings.centroid.bin_size) {
			case BinSize.SMALL.size:
				bin_size.selectedIndex = 0;
				break;
			case BinSize.REGULAR.size:
				bin_size.selectedIndex = 1;
				break;
			case BinSize.BIG.size:
				bin_size.selectedIndex = 2;
				break;
			case BinSize.LARGE.size:
				bin_size.selectedIndex = 3;
				break;
			case BinSize.HUGE.size:
				bin_size.selectedIndex = 4;
				break;
			case BinSize.MASSIVE.size:
				bin_size.selectedIndex = 5;
				break;
			default:
				bin_size.selectedIndex = 1; // Default to regular size
				break;
		}
		//		File Saving Settings
		document.getElementById("SettingsSaveDirectory").value = new_settings.save_directory.base_directory; // Save directory
		document.getElementById("AutosaveDelay").value = new_settings.autosave.delay; // Autosave delay (s)
		// Melexir saving settings
		document.getElementById("ProcessOnSave").checked = new_settings.melexir.process_on_save; // Process images on save
		document.getElementById("SaveSpectrum").checked = new_settings.melexir.save_spectrum; // Save spectrum to file
		document.getElementById("SaveBestFit").checked = new_settings.melexir.save_best_fit; // Save best fit to spectrum
		document.getElementById("SaveResiduals").checked = new_settings.melexir.save_residuals; // Save residuals between fit and data
		//		Various Settings
		document.getElementById("MoveWavelengthEveryTime").checked = new_settings.action.move_wavelength_every_time; // Whether to move wavelength between images of the same energy step during action scan
		document.getElementById("AutostopOnBoth").checked = new_settings.autostop.both_images; // Autostop when both or first image reaches criteria
		document.getElementById("ShowImageSeriesMenu").checked = new_settings.image_series.show_menu; // Whether to show Image Series menu on Start button
		document.getElementById("TestingDontSave").checked = new_settings.testing.do_not_save_to_file; // Put program in testing mode (doesn't save anything to file)
		//		Laser and Wavemeter Settings
		// Detachment laser
		document.getElementById("DetachmentYAGFundamental").value = new_settings.detachment_laser.yag_fundamental; // Detachment YAG fundamental wavelength (nm)
		// Excitation laser
		document.getElementById("ExcitationYAGFundamental").value = new_settings.excitation_laser.yag_fundamental; // Excitation YAG fundamental wavelength (nm)
		document.getElementById("LowerWavelengthBound").value = new_settings.excitation_laser.lower_wavelength_bound; // Lower wavelength bound (nm)
		document.getElementById("UpperWavelengthBound").value = new_settings.excitation_laser.upper_wavelength_bound; // Upper wavelength bound (nm)
		document.getElementById("FIRLowerWavelengthBound").value = new_settings.excitation_laser.fir_lower_wavelength_bound; // Lower bound in fIR mode
		document.getElementById("FIRUpperWavelengthBound").value = new_settings.excitation_laser.fir_upper_wavelength_bound; // Upper bound in fIR mode
		document.getElementById("InFIRMode").checked = new_settings.excitation_laser.in_fir_mode; // Whether fIR crystal is in use
		document.getElementById("GoToMoveAttempts").value = new_settings.excitation_laser.move_attempts; // GoTo Wavelength move attempts
		document.getElementById("GoToAcceptanceRange").value = new_settings.excitation_laser.acceptance_range; // Acceptance range for GoTo attempt (cm^-1)
		document.getElementById("OPOHost").value = new_settings.excitation_laser.host; // Host address for OPO/A Network communication
		document.getElementById("OPOPort").value = new_settings.excitation_laser.port; // Port for OPO/A Network communication
		// Wavemeter
		document.getElementById("CollectionLength").value = new_settings.wavemeter.collection_length; // Collection length for wavemeter measurement
		document.getElementById("MaxFailCount").value = new_settings.wavemeter.max_fail_count; // Max number of failed measurements before stopping
		document.getElementById("MaxBadMeasurement").value = new_settings.wavemeter.max_bad_measurements; // Max number of bad measurements before stopping
		document.getElementById("DetachmentChannel").value = new_settings.wavemeter.detachment_laser_channel; // Channel for Detachment laser on wavemeter
		document.getElementById("ExcitationChannel").value = new_settings.wavemeter.excitation_laser_channel; // Channel for Excitation laser on wavemeter
		// 		VMI Calibration Constants
		// V1
		document.getElementById("V1aConstant").value = new_settings.vmi.V1.a;
		document.getElementById("V1bConstant").value = new_settings.vmi.V1.b;
		// V2
		document.getElementById("V2aConstant").value = new_settings.vmi.V2.a;
		document.getElementById("V2bConstant").value = new_settings.vmi.V2.b;
		// V3
		document.getElementById("V3aConstant").value = new_settings.vmi.V3.a;
		document.getElementById("V3bConstant").value = new_settings.vmi.V3.b;
		// V4
		document.getElementById("V4aConstant").value = new_settings.vmi.V4.a;
		document.getElementById("V4bConstant").value = new_settings.vmi.V4.b;
		//		Display Settings
		// Main Window
		document.getElementById("MainWindowWidth").value = new_settings.windows.main.width; // Window width
		document.getElementById("MainWindowHeight").value = new_settings.windows.main.height; // Window height;
		document.getElementById("MainWindowX").value = new_settings.windows.main.x; // Window top left corner x position
		document.getElementById("MainWindowY").value = new_settings.windows.main.y; // Window top left corner y position
		// Live View Window
		document.getElementById("LiveViewWindowWidth").value = new_settings.windows.live_view.width; // Window width
		document.getElementById("LiveViewWindowHeight").value = new_settings.windows.live_view.height; // Window height;
		document.getElementById("LiveViewWindowX").value = new_settings.windows.live_view.x; // Window top left corner x position
		document.getElementById("LiveViewWindowY").value = new_settings.windows.live_view.y; // Window top left corner y position
	}

	/**
	 * Gather updated settings from UI into a Settings class
	 * @returns {Settings} new settings
	 */
	function get_new_settings() {
		let new_settings = new Settings();
		// 		Camera Settings
		// Area of Interest
		new_settings.camera.AoI_width = parseInt(document.getElementById("AoIWidth").value); // AoI Width
		new_settings.camera.AoI_height = parseInt(document.getElementById("AoIHeight").value); // AoI Height
		new_settings.camera.x_offset = parseInt(document.getElementById("xOffset").value); // AoI Left Offset
		new_settings.camera.y_offset = parseInt(document.getElementById("yOffset").value); // AoI Top Offset
		// LED Area
		new_settings.camera.LED_area.x_start = parseInt(document.getElementById("LEDXStart").value); // LED x start
		new_settings.camera.LED_area.x_end = parseInt(document.getElementById("LEDXEnd").value); // LED x end
		new_settings.camera.LED_area.y_start = parseInt(document.getElementById("LEDYStart").value); // LED y start
		new_settings.camera.LED_area.y_end = parseInt(document.getElementById("LEDYEnd").value); // LED y end
		// Noise Area (for LED)
		new_settings.camera.Noise_area.x_start = parseInt(document.getElementById("NoiseXStart").value); // Noise x start
		new_settings.camera.Noise_area.x_end = parseInt(document.getElementById("NoiseXEnd").value); // Noise x end
		new_settings.camera.Noise_area.y_start = parseInt(document.getElementById("NoiseYStart").value); // Noise y start
		new_settings.camera.Noise_area.y_end = parseInt(document.getElementById("NoiseYEnd").value); // Noise y end
		// Camera Parameters
		new_settings.camera.pixel_clock = parseInt(document.getElementById("PixelClock").value); // Pixel clock (MHz)
		new_settings.camera.exposure_time = parseInt(document.getElementById("ExposureTime").value); // Exposure time (ms)
		new_settings.camera.gain = parseInt(document.getElementById("Gain").value); // Gain (%)
		new_settings.camera.gain_boost = document.getElementById("GainBoost").checked; // Gain boost
		// Triggering Parameter
		new_settings.camera.trigger = document.getElementById("Trigger").selectedIndex;
		//		Centroiding Settings
		new_settings.centroid.use_hybrid_method = document.getElementById("HybridMethod").checked; // Whether to use HGCM method
		// Bin Size
		let sizes = [BinSize.SMALL, BinSize.REGULAR, BinSize.BIG, BinSize.LARGE, BinSize.HUGE, BinSize.MASSIVE];
		let bin_size = document.getElementById("CentroidBinSize");
		new_settings.centroid.bin_size = sizes[bin_size.selectedIndex].size;
		//		File Saving Settings
		new_settings.save_directory.base_directory = document.getElementById("SettingsSaveDirectory").value; // Save directory
		new_settings.autosave.delay = parseInt(document.getElementById("AutosaveDelay").value); // Autosave delay (s)
		// Melexir saving settings
		new_settings.melexir.process_on_save = document.getElementById("ProcessOnSave").checked; // Process images on save
		new_settings.melexir.save_spectrum = document.getElementById("SaveSpectrum").checked; // Save spectrum to file
		new_settings.melexir.save_best_fit = document.getElementById("SaveBestFit").checked; // Save best fit to spectrum
		new_settings.melexir.save_residuals = document.getElementById("SaveResiduals").checked; // Save residuals between fit and data
		//		Various Settings
		new_settings.action.move_wavelength_every_time = document.getElementById("MoveWavelengthEveryTime").checked; // Whether to move wavelength between images of the same energy step during action scan
		new_settings.autostop.both_images = document.getElementById("AutostopOnBoth").checked; // Autostop when both or first image reaches criteria
		new_settings.image_series.show_menu = document.getElementById("ShowImageSeriesMenu").checked; // Whether to show Image Series menu on Start button
		new_settings.testing.do_not_save_to_file = document.getElementById("TestingDontSave").checked; // Put program in testing mode (doesn't save anything to file)
		//		Laser and Wavemeter Settings
		// Detachment laser
		new_settings.detachment_laser.yag_fundamental = parseFloat(document.getElementById("DetachmentYAGFundamental").value); // Detachment YAG fundamental wavelength (nm)
		// Excitation laser
		new_settings.excitation_laser.yag_fundamental = parseFloat(document.getElementById("ExcitationYAGFundamental").value); // Excitation YAG fundamental wavelength (nm)
		new_settings.excitation_laser.lower_wavelength_bound = parseFloat(document.getElementById("LowerWavelengthBound").value); // Lower wavelength bound (nm)
		new_settings.excitation_laser.upper_wavelength_bound = parseFloat(document.getElementById("UpperWavelengthBound").value); // Upper wavelength bound (nm)
		new_settings.excitation_laser.fir_lower_wavelength_bound = parseFloat(document.getElementById("FIRLowerWavelengthBound").value); // Lower bound in fIR mode
		new_settings.excitation_laser.fir_upper_wavelength_bound = parseFloat(document.getElementById("FIRUpperWavelengthBound").value); // Upper bound in fIR mode
		new_settings.excitation_laser.in_fir_mode = document.getElementById("InFIRMode").checked; // Whether fIR crystal is in use
		new_settings.excitation_laser.move_attempts = parseInt(document.getElementById("GoToMoveAttempts").value); // GoTo Wavelength move attempts
		new_settings.excitation_laser.acceptance_range = parseFloat(document.getElementById("GoToAcceptanceRange").value); // Acceptance range for GoTo attempt (cm^-1)
		new_settings.excitation_laser.host = document.getElementById("OPOHost").value; // Host address for OPO/A Network communication
		new_settings.excitation_laser.port = document.getElementById("OPOPort").value; // Port for OPO/A Network communication
		// Wavemeter
		new_settings.wavemeter.collection_length = parseInt(document.getElementById("CollectionLength").value); // Collection length for wavemeter measurement
		new_settings.wavemeter.max_fail_count = parseInt(document.getElementById("MaxFailCount").value); // Max number of failed measurements before stopping
		new_settings.wavemeter.max_bad_measurements = parseInt(document.getElementById("MaxBadMeasurement").value); // Max number of bad measurements before stopping
		new_settings.wavemeter.detachment_laser_channel = parseInt(document.getElementById("DetachmentChannel").value); // Channel for Detachment laser on wavemeter
		new_settings.wavemeter.excitation_laser_channel = parseInt(document.getElementById("ExcitationChannel").value); // Channel for Excitation laser on wavemeter
		// 		VMI Calibration Constants
		// V1
		new_settings.vmi.V1.a = parseFloat(document.getElementById("V1aConstant").value);
		new_settings.vmi.V1.b = parseFloat(document.getElementById("V1bConstant").value);
		// V2
		new_settings.vmi.V2.a = parseFloat(document.getElementById("V2aConstant").value);
		new_settings.vmi.V2.b = parseFloat(document.getElementById("V2bConstant").value);
		// V3
		new_settings.vmi.V3.a = parseFloat(document.getElementById("V3aConstant").value);
		new_settings.vmi.V3.b = parseFloat(document.getElementById("V3bConstant").value);
		// V4
		new_settings.vmi.V4.a = parseFloat(document.getElementById("V4aConstant").value);
		new_settings.vmi.V4.b = parseFloat(document.getElementById("V4bConstant").value);
		//		Display Settings
		// Main Window
		new_settings.windows.main.width = parseInt(document.getElementById("MainWindowWidth").value); // Window width
		new_settings.windows.main.height = parseInt(document.getElementById("MainWindowHeight").value); // Window height
		new_settings.windows.main.x = parseInt(document.getElementById("MainWindowX").value); // Window top left corner x position
		new_settings.windows.main.y = parseInt(document.getElementById("MainWindowY").value); // Window top left corner y position
		// Live View Window
		new_settings.windows.live_view.width = parseInt(document.getElementById("LiveViewWindowWidth").value); // Window width
		new_settings.windows.live_view.height = parseInt(document.getElementById("LiveViewWindowHeight").value); // Window height
		new_settings.windows.live_view.x = parseInt(document.getElementById("LiveViewWindowX").value); // Window top left corner x position
		new_settings.windows.live_view.y = parseInt(document.getElementById("LiveViewWindowY").value); // Window top left corner y position
		return new_settings;
	}

	/**** 
			Button Appearance Functions
	****/

	function hide_buttons() {
		document.getElementById("ResetSettingsButton").classList.add("hidden");
		document.getElementById("UpdateSettingsButton").classList.add("hidden");
		document.getElementById("SaveSettingsButton").classList.add("hidden");
	}

	function show_buttons() {
		document.getElementById("ResetSettingsButton").classList.remove("hidden");
		document.getElementById("UpdateSettingsButton").classList.remove("hidden");
		document.getElementById("SaveSettingsButton").classList.remove("hidden");
	}
}

/*****************************************************************************

							EXPORTING

*****************************************************************************/

module.exports = { Settings_Load_Page };
