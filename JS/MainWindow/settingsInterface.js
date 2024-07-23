/************************************************** 

			Control for SEVI UI elements

**************************************************/

function Settings_Load_Page() {
	const ipc = require("electron").ipcRenderer;
	const { BinSize, TriggerDetection, Settings } = require("../Libraries/SettingsClasses");

	// On startup, parse settings
	parse_settings(settings); // (`settings` variable defined in startup.js)

	// Listen for updated settings from Main
	ipc.on(IPCMessages.INFORMATION.SETTINGS, (event, settings_information) => {
		settings = settings_information;
		parse_settings(settings);
	});

	/**
	 * Update UI elements with parameters from `settings`
	 * @param {Settings} settings
	 */
	function parse_settings(settings) {
		// 		Camera Settings
		// Area of Interest
		document.getElementById("AoIWidth").value = settings.camera.AoI_width; // AoI Width
		document.getElementById("AoIHeight").value = settings.camera.AoI_height; // AoI Height
		document.getElementById("xOffset").value = settings.camera.x_offset; // AoI Left Offset
		document.getElementById("yOffset").value = settings.camera.y_offset; // AoI Top Offset
		// LED Area
		document.getElementById("LEDXStart").value = settings.camera.LED_area.x_start; // LED x start
		document.getElementById("LEDXEnd").value = settings.camera.LED_area.x_end; // LED x end
		document.getElementById("LEDYStart").value = settings.camera.LED_area.y_start; // LED y start
		document.getElementById("LEDYEnd").value = settings.camera.LED_area.y_end; // LED y end
		// Noise Area (for LED)
		document.getElementById("NoiseXStart").value = settings.camera.Noise_area.x_start; // Noise x start
		document.getElementById("NoiseXEnd").value = settings.camera.Noise_area.x_end; // Noise x end
		document.getElementById("NoiseYStart").value = settings.camera.Noise_area.y_start; // Noise y start
		document.getElementById("NoiseYEnd").value = settings.camera.Noise_area.y_end; // Noise y end
		// Camera Parameters
		document.getElementById("PixelClock").value = settings.camera.pixel_clock; // Pixel clock (MHz)
		document.getElementById("ExposureTime").value = settings.camera.exposure_time; // Exposure time (ms)
		document.getElementById("Gain").value = settings.camera.gain; // Gain (%)
		document.getElementById("GainBoost").checked = settings.camera.gain_boost; // Gain boost
		// Triggering Parameter
		document.getElementById("Trigger").selectedIndex = settings.camera.trigger;
		//		Centroiding Settings
		document.getElementById("HybridMethod").checked = settings.centroid.use_hybrid_method; // Whether to use HGCM method
		// Bin Size
		let bin_size = document.getElementById("CentroidBinSize");
		switch (settings.centroid.bin_size) {
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
		document.getElementById("SettingsSaveDirectory").value = settings.save_directory.base_directory; // Save directory
		document.getElementById("AutosaveDelay").value = settings.autosave.delay; // Autosave delay (s)
		// Melexir saving settings
		document.getElementById("ProcessOnSave").checked = settings.melexir.process_on_save; // Process images on save
		document.getElementById("SaveSpectrum").checked = settings.melexir.save_spectrum; // Save spectrum to file
		document.getElementById("SaveBestFit").checked = settings.melexir.save_best_fit; // Save best fit to spectrum
		document.getElementById("SaveResiduals").checked = settings.melexir.save_residuals; // Save residuals between fit and data
		//		Various Settings
		document.getElementById("MoveWavelengthEveryTime").checked = settings.action.move_wavelength_every_time; // Whether to move wavelength between images of the same energy step during action scan
		document.getElementById("AutostopOnBoth").checked = settings.autostop.both_images; // Autostop when both or first image reaches criteria
		document.getElementById("ShowImageSeriesMenu").checked = settings.image_series.show_menu; // Whether to show Image Series menu on Start button
		document.getElementById("TestingDontSave").checked = settings.testing.do_not_save_to_file; // Put program in testing mode (doesn't save anything to file)
		//		Laser and Wavemeter Settings
		// Detachment laser
		document.getElementById("DetachmentYAGFundamental").value = settings.detachment_laser.yag_fundamental; // Detachment YAG fundamental wavelength (nm)
		// Excitation laser
		document.getElementById("ExcitationYAGFundamental").value = settings.excitation_laser.yag_fundamental; // Excitation YAG fundamental wavelength (nm)
		document.getElementById("LowerWavelengthBound").value = settings.excitation_laser.lower_wavelength_bound; // Lower wavelength bound (nm)
		document.getElementById("UpperWavelengthBound").value = settings.excitation_laser.upper_wavelength_bound; // Upper wavelength bound (nm)
		document.getElementById("FIRLowerWavelengthBound").value = settings.excitation_laser.fir_lower_wavelength_bound; // Lower bound in fIR mode
		document.getElementById("FIRUpperWavelengthBound").value = settings.excitation_laser.fir_upper_wavelength_bound; // Upper bound in fIR mode
		document.getElementById("InFIRMode").checked = settings.excitation_laser.in_fir_mode; // Whether fIR crystal is in use
		document.getElementById("GoToMoveAttempts").value = settings.excitation_laser.move_attempts; // GoTo Wavelength move attempts
		document.getElementById("GoToAcceptanceRange").value = settings.excitation_laser.acceptance_range; // Acceptance range for GoTo attempt (cm^-1)
		document.getElementById("OPOHost").value = settings.excitation_laser.host; // Host address for OPO/A Network communication
		document.getElementById("OPOPort").value = settings.excitation_laser.port; // Port for OPO/A Network communication
		// Wavemeter
		document.getElementById("CollectionLength").value = settings.wavemeter.collection_length; // Collection length for wavemeter measurement
		document.getElementById("MaxFailCount").value = settings.wavemeter.max_fail_count; // Max number of failed measurements before stopping
		document.getElementById("MaxBadMeasurement").value = settings.wavemeter.max_bad_measurements; // Max number of bad measurements before stopping
		document.getElementById("DetachmentChannel").value = settings.wavemeter.detachment_laser_channel; // Channel for Detachment laser on wavemeter
		document.getElementById("ExcitationChannel").value = settings.wavemeter.excitation_laser_channel; // Channel for Excitation laser on wavemeter
		// 		VMI Calibration Constants
		// V1
		document.getElementById("V1aConstant").value = settings.vmi.V1.a;
		document.getElementById("V1bConstant").value = settings.vmi.V1.b;
		// V2
		document.getElementById("V2aConstant").value = settings.vmi.V2.a;
		document.getElementById("V2bConstant").value = settings.vmi.V2.b;
		// V3
		document.getElementById("V3aConstant").value = settings.vmi.V3.a;
		document.getElementById("V3bConstant").value = settings.vmi.V3.b;
		// V4
		document.getElementById("V4aConstant").value = settings.vmi.V4.a;
		document.getElementById("V4bConstant").value = settings.vmi.V4.b;
		//		Display Settings
		// Main Window
		document.getElementById("MainWindowWidth").value = settings.windows.main.width; // Window width
		document.getElementById("MainWindowHeight").value = settings.windows.main.height; // Window height;
		document.getElementById("MainWindowX").value = settings.windows.main.x; // Window top left corner x position
		document.getElementById("MainWindowY").value = settings.windows.main.y; // Window top left corner y position
		// Live View Window
		document.getElementById("LiveViewWindowWidth").value = settings.windows.live_view.width; // Window width
		document.getElementById("LiveViewWindowHeight").value = settings.windows.live_view.height; // Window height;
		document.getElementById("LiveViewWindowX").value = settings.windows.live_view.x; // Window top left corner x position
		document.getElementById("LiveViewWindowY").value = settings.windows.live_view.y; // Window top left corner y position
	}
}

/*****************************************************************************

							EXPORTING

*****************************************************************************/

module.exports = { Settings_Load_Page };
