/************************************************** 

			Control for IR-SEVI UI elements

**************************************************/

/*************************************************************************************************

								*****************************
								*  IR-SEVI MODE FIRST PAGE	*
								*****************************

*************************************************************************************************/

/*****************************************************************************

							SCAN CONTROL

*****************************************************************************/

function IRSevi_Scan_Control() {
	const { ImageManagerMessenger } = require("./Libraries/ImageManager.js");

	const IMMessenger = new ImageManagerMessenger();

	/* Execute on initial page load */
	if (IMMessenger.information.autosave.params.on) change_irsevi_autosave_button_to_on();
	else change_irsevi_autosave_button_to_off();

	/****
			HTML Element Listeners
	****/

	document.getElementById("IRSeviScanStartSave").onclick = function () {
		// Check if there is a scan being taken or not
		if (IMMessenger.information.status.stopped) IMMessenger.request.scan.start_ir();
		else IMMessenger.request.scan.stop();
	};
	document.getElementById("IRSeviScanPauseResume").onclick = function () {
		if (IMMessenger.information.status.running) IMMessenger.request.scan.pause();
		else IMMessenger.request.scan.resume(true);
	};
	document.getElementById("IRSeviScanCancel").onclick = function () {
		IMMessenger.request.scan.cancel();
	};
	document.getElementById("IRSeviScanAutosave").onclick = function () {
		// Toggle autosave
		let autosave_on = IMMessenger.information.autosave.params.on;
		IMMessenger.update.autosave({ on: !autosave_on });
	};
	document.getElementById("IRSeviScanReset").onclick = function () {
		IMMessenger.request.scan.reset();
	};
	document.getElementById("IRSeviScanSingleShot").onclick = function () {
		IMMessenger.request.single_shot();
	};

	document.getElementById("IRSeviImageSeries").oninput = function () {
		IMMessenger.update.image_series(document.getElementById("IRSeviImageSeries").selectedIndex + 1);
	};

	/****
			Image Manager Listeners
	****/

	// Image has been started
	IMMessenger.listen.event.scan.start.on(() => {
		change_irsevi_button_to_save();
		change_irsevi_button_to_pause();
		// Add scan-running class to controls section when a scan starts (used for image series collection)
		add_scan_running_to_irsevi_controls();
	});

	// Image has been stopped
	IMMessenger.listen.event.scan.stop.on(() => {
		change_irsevi_button_to_start();
		change_irsevi_button_to_resume();
		// Remove scan-running class from controls section when a scan stops (used for image series collection)
		remove_scan_running_from_irsevi_controls();
	});

	IMMessenger.listen.event.scan.pause.on(() => {
		change_irsevi_button_to_resume();
	});

	IMMessenger.listen.event.scan.resume.on(() => {
		change_irsevi_button_to_save();
		change_irsevi_button_to_pause();
		// Add scan-running class to controls section when a scan starts (used for image series collection)
		add_scan_running_to_irsevi_controls();
	});

	IMMessenger.listen.event.scan.cancel.on(() => {
		change_irsevi_button_to_start();
		change_irsevi_button_to_resume();
		// Remove scan-running class from controls section when a scan stops (used for image series collection)
		remove_scan_running_from_irsevi_controls();
	});

	IMMessenger.listen.info_update.autosave.params.on((autosave_params) => {
		if (autosave_params.on) change_irsevi_autosave_button_to_on();
		else change_irsevi_autosave_button_to_off();
	});

	IMMessenger.listen.info_update.image_series.length.on((collection_length) => {
		document.getElementById("IRSeviImageSeries").selectedIndex = collection_length - 1;
	});

	IMMessenger.listen.info_update.image_series.remaining.on((remaining) => {
		const remaining_text = document.getElementById("IRSeviImageSeriesRemainingText");
		remaining_text.innerText = `(${remaining})`;
	});

	/****
			Functions
	****/

	// Change SEVI Start/Save button to Start
	function change_irsevi_button_to_start() {
		const start_button_text = document.getElementById("IRSeviScanStartSaveText");
		start_button_text.innerText = "Start";
	}

	// Change SEVI Start/Save button to Save
	function change_irsevi_button_to_save() {
		const start_button_text = document.getElementById("IRSeviScanStartSaveText");
		start_button_text.innerText = "Save";
	}

	// Change SEVI Pause/Resume button to Pause
	function change_irsevi_button_to_pause() {
		const pause_button_text = document.getElementById("IRSeviScanPauseResumeText");
		pause_button_text.innerText = "Pause";
	}

	// Change SEVI Pause/Resume button to Resume
	function change_irsevi_button_to_resume() {
		const pause_button_text = document.getElementById("IRSeviScanPauseResumeText");
		pause_button_text.innerText = "Resume";
	}

	// Change autosave button to On
	function change_irsevi_autosave_button_to_on() {
		const autosave_button_text = document.getElementById("IRSeviScanAutosaveStatusText");
		autosave_button_text.innerText = "On";
	}

	// Change autosave button to Off
	function change_irsevi_autosave_button_to_off() {
		const autosave_button_text = document.getElementById("IRSeviScanAutosaveStatusText");
		autosave_button_text.innerText = "Off";
	}

	// Add "scan-running" class to controls section (used for image series collection)
	function add_scan_running_to_irsevi_controls() {
		const irsevi_controls = document.getElementById("IRSeviScanControls");
		irsevi_controls.classList.add("scan-running");
	}

	// Remove "scan-running" class from controls section (used for image series collection)
	function remove_scan_running_from_irsevi_controls() {
		const irsevi_controls = document.getElementById("IRSeviScanControls");
		irsevi_controls.classList.remove("scan-running");
	}
}

/*****************************************************************************

							FILE NAMING

*****************************************************************************/

function IRSevi_File_Naming() {
	const { ImageManagerMessenger } = require("./Libraries/ImageManager.js");
	const IMMessenger = new ImageManagerMessenger();

	/****
			HTML Element Listeners
	****/

	document.getElementById("IRSeviImageCounterUp").onclick = function () {
		IMMessenger.update.id.increase();
	};
	document.getElementById("IRSeviImageCounterDown").onclick = function () {
		IMMessenger.update.id.decrease();
	};
	document.getElementById("IRSeviVMIMode").oninput = function () {
		const vmi_mode = document.getElementById("IRSeviVMIMode");
		let index = vmi_mode.selectedIndex;
		IMMessenger.update.vmi_info({ index: index });
	};

	/****
			Image Manager Listeners
	****/

	IMMessenger.listen.info_update.image.id.on((id) => {
		update_irsevi_image_id(id);
	});

	IMMessenger.listen.info_update.image.file_name.on((file_name) => {
		update_irsevi_filename(file_name);
	});

	IMMessenger.listen.info_update.image.file_name_ir.on((file_name_ir) => {
		update_irsevi_filename_ir(file_name_ir);
	});

	IMMessenger.listen.info_update.image.vmi_info.on((vmi_info) => {
		update_irsevi_vmi(vmi_info);
	});

	/****
			Functions
	****/

	function update_irsevi_image_id(image_id) {
		const image_counter = document.getElementById("IRSeviImageCounter");
		image_counter.value = image_id;
	}

	function update_irsevi_filename(filename) {
		const sevi_filename = document.getElementById("IRSeviCurrentImageFile");
		sevi_filename.value = filename;
	}

	function update_irsevi_filename_ir(filename_ir) {
		const irsevi_filename_ir = document.getElementById("IRSeviCurrentImageFileIR");
		irsevi_filename_ir.value = filename_ir;
	}

	function update_irsevi_vmi(vmi_info) {
		const vmi_mode = document.getElementById("IRSeviVMIMode");
		vmi_mode.selectedIndex = vmi_info.index;
	}
}

/*****************************************************************************

							LASER CONTROL

*****************************************************************************/

function IRSevi_Laser_Control() {
	const { InputDelay } = require("./Libraries/InputDelay.js");
	const { DetachmentMode, ExcitationMode } = require("./Libraries/WavelengthClasses.js");
	const { DetachmentLaserManagerMessenger } = require("./Libraries/DetachmentLaserManager.js");
	const { ExcitationLaserManagerMessenger } = require("./Libraries/ExcitationLaserManager.js");
	const DLMMessenger = new DetachmentLaserManagerMessenger();
	const ELMMessenger = new ExcitationLaserManagerMessenger();

	/****
			HTML Element Listeners
	****/

	document.getElementById("IRSeviWavelengthMode").oninput = function () {
		update_irsevi_detachment_mode();
	};

	document.getElementById("IRSeviIRWavelengthMode").oninput = function () {
		update_irsevi_excitation_mode();
	};

	document.getElementById("IRSeviMeasureDetachmentWavelength").onclick = function () {
		DLMMessenger.wavemeter.request.measurement.start();
	};

	document.getElementById("IRSeviMeasureDetachmentWavelengthCancel").onclick = function () {
		DLMMessenger.wavemeter.request.measurement.cancel();
	};

	document.getElementById("IRSeviMeasureExcitationWavelength").onclick = function () {
		ELMMessenger.wavemeter.request.measurement.start();
	};

	document.getElementById("IRSeviMeasureExcitationWavelengthCancel").onclick = function () {
		ELMMessenger.wavemeter.request.measurement.cancel();
	};

	let Selected_GoTo_Unit_Index = 0;
	document.getElementById("IRSeviDesiredEnergyUnit").oninput = function () {
		const energy_input = document.getElementById("IRSeviDesiredEnergy");
		const energy_unit = document.getElementById("IRSeviDesiredEnergyUnit");
		let energy_input_value = parseFloat(energy_input.value);
		if (!energy_input_value) return;

		let new_index = energy_unit.selectedIndex;
		let index_change = Math.abs(Selected_GoTo_Unit_Index - new_index);
		let new_value;
		if (index_change === 2) {
			new_value = 1e4 / energy_input_value;
		} else if (index_change === 1) {
			if (new_index === 0 || Selected_GoTo_Unit_Index === 0) {
				new_value = 1e7 / energy_input_value;
			} else if (new_index === 2) {
				new_value = energy_input_value / 1e3;
			} else {
				new_value = energy_input_value * 1e3;
			}
		} else {
			new_value = energy_input_value;
		}

		switch (new_index) {
			case 0:
			case 1:
				energy_input.value = new_value.toFixed(3);
				break;
			case 2:
				energy_input.value = new_value.toFixed(6);
				break;
		}
		Selected_GoTo_Unit_Index = new_index;
	};

	document.getElementById("IRSeviMoveIRButton").onclick = function () {
		irsevi_goto_ir();
	};

	document.getElementById("IRSeviMoveIRButtonCancel").onclick = function () {
		ELMMessenger.request.goto.cancel();
	};

	// Putting timers on typed inputs so that the functions are only run if the user hasn't updated the input in the last second
	// (that way it doesn't execute for each character inputted)

	const update_irsevi_detachment_wavelength_delay = new InputDelay(update_irsevi_detachment_wavelength);
	document.getElementById("IRSeviDetachmentWavelength").oninput = function () {
		update_irsevi_detachment_wavelength_delay.start_timer();
	};

	const update_irsevi_excitation_wavelength_delay = new InputDelay(update_irsevi_excitation_wavelength);
	document.getElementById("IRSeviIRWavelength").oninput = function () {
		update_irsevi_excitation_wavelength_delay.start_timer();
	};

	/****
			Detachment Laser Manager Listeners
	****/

	DLMMessenger.listen.info_update.energy.on(update_irsevi_detachment_energies);

	DLMMessenger.wavemeter.listen.event.measurement.start.on(() => {
		// Disable measure button and show cancel measurement button when measurement is started
		const measure_button = document.getElementById("IRSeviMeasureDetachmentWavelength");
		const cancel_button = document.getElementById("IRSeviMeasureDetachmentWavelengthCancel");
		measure_button.disabled = true;
		cancel_button.classList.remove("hidden");
	});

	DLMMessenger.wavemeter.listen.event.measurement.stop.on(() => {
		// Re-enable measure button and hide cancel measurement button when measurement is stopped
		const measure_button = document.getElementById("IRSeviMeasureDetachmentWavelength");
		const cancel_button = document.getElementById("IRSeviMeasureDetachmentWavelengthCancel");
		measure_button.disabled = false;
		cancel_button.classList.add("hidden");
	});

	/****
			Excitation Laser Manager Listeners
	****/

	ELMMessenger.listen.info_update.energy.on(update_irsevi_excitation_energies);

	ELMMessenger.wavemeter.listen.event.measurement.start.on(() => {
		// Disable measure button and show cancel measurement button when measurement is started
		const measure_button = document.getElementById("IRSeviMeasureExcitationWavelength");
		const cancel_button = document.getElementById("IRSeviMeasureExcitationWavelengthCancel");
		measure_button.disabled = true;
		cancel_button.classList.remove("hidden");
	});

	ELMMessenger.wavemeter.listen.event.measurement.stop.on(() => {
		// Re-enable measure button and hide cancel measurement button when measurement is stopeed
		const measure_button = document.getElementById("IRSeviMeasureExcitationWavelength");
		const cancel_button = document.getElementById("IRSeviMeasureExcitationWavelengthCancel");
		measure_button.disabled = false;
		cancel_button.classList.add("hidden");
	});

	ELMMessenger.listen.event.goto.start.on(() => {
		// Disable GoTo button and show cancel button
		const goto_button = document.getElementById("IRSeviMoveIRButton");
		const cancel_button = document.getElementById("IRSeviMoveIRButtonCancel");
		goto_button.disabled = true;
		cancel_button.classList.remove("hidden");
	});

	ELMMessenger.listen.event.goto.stop_or_cancel.on(() => {
		// Re-enable GoTo button and hide cancel button
		const goto_button = document.getElementById("IRSeviMoveIRButton");
		const cancel_button = document.getElementById("IRSeviMoveIRButtonCancel");
		goto_button.disabled = false;
		cancel_button.classList.add("hidden");
	});

	/****
			Functions
	****/

	function update_irsevi_detachment_wavelength() {
		const detachment_wavelength = document.getElementById("IRSeviDetachmentWavelength");
		DLMMessenger.update.standard_wavelength(parseFloat(detachment_wavelength.value));
	}

	function update_irsevi_detachment_mode() {
		const detachment_mode = document.getElementById("IRSeviWavelengthMode");
		const mode_list = [DetachmentMode.STANDARD, DetachmentMode.DOUBLED, DetachmentMode.RAMAN, DetachmentMode.IRDFG];
		DLMMessenger.update.standard_mode(mode_list[detachment_mode.selectedIndex]);
	}

	function update_irsevi_detachment_energies(detachment_wl_class) {
		const input_wavelength = document.getElementById("IRSeviDetachmentWavelength");
		const converted_wavelength = document.getElementById("IRSeviConvertedWavelength");
		const converted_wavenumber = document.getElementById("IRSeviDetachmentWavenumber");
		const detachment_mode = document.getElementById("IRSeviWavelengthMode");
		// If the sent energy values are 0, leave all boxes blank
		if (detachment_wl_class.energy.wavelength === 0) {
			input_wavelength.value = "";
			converted_wavelength.value = "";
			converted_wavenumber.value = "";
		}
		// If the sent energy mode is Standard, don't leave the converted_wavelength box blank
		else if (detachment_wl_class.selected_mode === DetachmentMode.STANDARD) {
			converted_wavelength.value = "";
			converted_wavenumber.value = detachment_wl_class.energy.wavenumber.toFixed(3);
		}
		// Update the boxes with the sent energies
		else {
			converted_wavelength.value = detachment_wl_class.energy.wavelength.toFixed(3);
			converted_wavenumber.value = detachment_wl_class.energy.wavenumber.toFixed(3);
		}

		// Update the input box too (in case the values were changed on the SEVI tab)
		if (detachment_wl_class.standard.wavelength === 0) input_wavelength.value = "";
		else input_wavelength.value = detachment_wl_class.standard.wavelength.toFixed(3);

		// Update selected mode
		switch (detachment_wl_class.selected_mode) {
			case DetachmentMode.STANDARD:
				detachment_mode.selectedIndex = 0;
				break;
			case DetachmentMode.DOUBLED:
				detachment_mode.selectedIndex = 1;
				break;
			case DetachmentMode.RAMAN:
				detachment_mode.selectedIndex = 2;
				break;
			case DetachmentMode.IRDFG:
				detachment_mode.selectedIndex = 3;
				break;
			default:
				detachment_mode.selectedIndex = 0;
				break;
		}
	}

	function update_irsevi_excitation_wavelength() {
		const excitation_wavelength = document.getElementById("IRSeviIRWavelength");
		ELMMessenger.update.nir_wavelength(parseFloat(excitation_wavelength.value));
	}

	function update_irsevi_excitation_mode() {
		const excitation_mode = document.getElementById("IRSeviIRWavelengthMode");
		const mode_list = [ExcitationMode.NIR, ExcitationMode.IIR, ExcitationMode.MIR, ExcitationMode.FIR];
		ELMMessenger.update.nir_mode(mode_list[excitation_mode.selectedIndex]);
	}

	function update_irsevi_excitation_energies(stored_energy) {
		const input_wavelength = document.getElementById("IRSeviIRWavelength");
		const converted_wavelength = document.getElementById("IRSeviIRConvertedWavelength");
		const converted_wavenumber = document.getElementById("IRSeviIRWavenumber");
		const excitation_mode = document.getElementById("IRSeviIRWavelengthMode");
		// If the sent energy values are 0, leave all boxes blank
		if (stored_energy.energy.wavelength === 0) {
			input_wavelength.value = "";
			converted_wavelength.value = "";
			converted_wavenumber.value = "";
		}
		// If the sent energy mode is Standard, don't leave the converted_wavelength box blank
		else if (stored_energy.selected_mode === ExcitationMode.NIR) {
			converted_wavelength.value = "";
			converted_wavenumber.value = stored_energy.energy.wavenumber.toFixed(3);
		}
		// Update the boxes with the sent energies
		else {
			converted_wavelength.value = stored_energy.energy.wavelength.toFixed(3);
			converted_wavenumber.value = stored_energy.energy.wavenumber.toFixed(3);
		}

		// Update the input box too (in case the values were changed on the SEVI tab)
		if (stored_energy.nIR.wavelength === 0) input_wavelength.value = "";
		else input_wavelength.value = stored_energy.nIR.wavelength.toFixed(3);

		// Update selected mode
		switch (stored_energy.selected_mode) {
			case ExcitationMode.NIR:
				excitation_mode.selectedIndex = 0;
				break;
			case ExcitationMode.IIR:
				excitation_mode.selectedIndex = 1;
				break;
			case ExcitationMode.MIR:
				excitation_mode.selectedIndex = 2;
				break;
			case ExcitationMode.FIR:
				excitation_mode.selectedIndex = 3;
				break;
			default:
				excitation_mode.selectedIndex = 0;
				break;
		}
	}

	// Go to desired IR Energy
	function irsevi_goto_ir() {
		const energy_input = document.getElementById("IRSeviDesiredEnergy");
		const energy_unit = document.getElementById("IRSeviDesiredEnergyUnit");
		let energy_input_value = parseFloat(energy_input.value);
		// Need to send energy in cm-1, so we might need to convert
		switch (energy_unit.selectedIndex) {
			case 0: // cm-1
				break;
			case 1: // nm
				energy_input_value = 1e7 / energy_input_value;
				break;
			case 2: // um
				energy_input_value = 1e4 / energy_input_value;
				break;
		}
		ELMMessenger.request.goto.start(energy_input_value);
	}
}

/*****************************************************************************

						ACCUMULATED IMAGE DISPLAY

*****************************************************************************/

function IRSevi_Accumulated_Image_Display(PageInfo) {
	const ipc = require("electron").ipcRenderer;
	const { IPCMessages } = require("../Messages.js");
	const { ImageType } = require("./Libraries/ImageClasses.js");
	const { Tabs } = require("./Libraries/Tabs.js");
	const { ImageManagerMessenger } = require("./Libraries/ImageManager.js");

	const IMMessenger = new ImageManagerMessenger();

	/****
			HTML Element Listeners
	****/

	document.getElementById("IRSeviImageDisplaySelect").oninput = function () {
		update_irsevi_accumulated_image_display();
	};

	document.getElementById("IRSeviDisplay").onclick = function () {
		const large_display = document.getElementById("LargeDisplaySection");
		large_display.classList.remove("large-display-hidden");
	};

	document.getElementById("IRSeviDisplaySlider").oninput = function () {
		const display_slider = document.getElementById("IRSeviDisplaySlider");
		IMMessenger.update.image_contrast(display_slider.value);
		// Update image display
		update_irsevi_accumulated_image_display();
	};

	/****
			Image Manager Listeners
	****/

	IMMessenger.listen.info_update.image_contrast.on((value) => {
		const display_slider = document.getElementById("IRSeviDisplaySlider");
		display_slider.value = value;
	});

	// Update accumulated image when alert is sent
	IMMessenger.listen.info_update.accumulated_image.on(() => {
		// If user is not on SEVI tab, ignore
		if (PageInfo.current_tab !== Tabs.IRSEVI) return;
		//console.log("Updating");
		update_irsevi_accumulated_image_display();
	});

	// Update accumulated image display when scan is reset
	IMMessenger.listen.event.scan.reset.on(update_irsevi_accumulated_image_display);

	/****
			Functions
	****/

	function update_irsevi_accumulated_image_display() {
		const image_display = document.getElementById("IRSeviDisplay");
		const image_display_select = document.getElementById("IRSeviImageDisplaySelect");
		const ctx = image_display.getContext("2d");
		// Also put image on expanded accumulated image display
		const large_display = document.getElementById("LargeDisplay");
		const large_ctx = large_display.getContext("2d");
		// Get image data
		const image_types = [ImageType.IROFF, ImageType.IRON, ImageType.DIFFPOS, ImageType.DIFFNEG];
		let image_type = image_types[image_display_select.selectedIndex];
		let image_data = IMMessenger.information.get_image_display(image_type);
		if (!image_data) return; // No ImageData object was sent
		// Clear the current image
		ctx.clearRect(0, 0, image_display.width, image_display.height);
		large_ctx.clearRect(0, 0, large_display.width, large_display.height);
		// Put image_data on the display
		// Have to convert the ImageData object into a bitmap image so that the  image is resized to fill the display correctly
		createImageBitmap(image_data).then(function (bitmap_img) {
			ctx.drawImage(bitmap_img, 0, 0, image_data.width, image_data.height, 0, 0, image_display.width, image_display.height);
			large_ctx.drawImage(bitmap_img, 0, 0, image_data.width, image_data.height, 0, 0, large_display.width, large_display.height);
		});
	}
}

/*****************************************************************************

						ELECTRON/FRAME COUNTS

*****************************************************************************/

function IRSevi_Counts() {
	const { InputDelay } = require("./Libraries/InputDelay.js");
	const { ImageManagerMessenger, AutostopMethod } = require("./Libraries/ImageManager.js");
	const { AverageElectronManagerMessenger, Rolling20Frames } = require("./Libraries/AverageElectronManager.js");

	const IMMessenger = new ImageManagerMessenger();
	const EAMMessenger = new AverageElectronManagerMessenger();

	/****
			HTML Element Listeners
	****/

	// If Image progress bar is shown (scan is running and autostop parameters set)
	// when user hovers mouse over counters section, autostop input section should be shown (so they can change it)
	document.getElementById("IRSeviCounters").onmouseenter = function () {
		hide_irsevi_image_progress_bar();
	};
	document.getElementById("IRSeviCounters").onmouseleave = function () {
		send_irsevi_autostop_value_update(); // In case user updated autostop value while mouse hovering over box
		show_irsevi_image_progress_bar();
	};

	// Putting timers on typed inputs so that the functions are only run if the user hasn't updated the input in the last second
	// (that way it doesn't execute for each character inputted)
	const send_irsevi_autostop_value_update_delay = new InputDelay(send_irsevi_autostop_value_update);
	document.getElementById("IRSeviAutomaticStop").oninput = function () {
		send_irsevi_autostop_value_update_delay.start_timer();
	};

	document.getElementById("IRSeviAutomaticStopUnit").oninput = function () {
		send_irsevi_autostop_unit_update();
	};

	/****
			Image Manager Listeners
	****/

	IMMessenger.listen.info_update.image.counts.on(update_irsevi_counters);

	IMMessenger.listen.info_update.autostop.params.on(update_irsevi_autostop);
	IMMessenger.listen.info_update.autostop.progress.on(update_irsevi_image_progress_bar);

	// Add scan-running class to counters section when a scan starts (used for image progress bar)
	IMMessenger.listen.event.scan.start.on(() => {
		add_scan_running_to_irsevi_counters();
		show_irsevi_image_progress_bar();
	});
	IMMessenger.listen.event.scan.resume.on(() => {
		add_scan_running_to_irsevi_counters();
		show_irsevi_image_progress_bar();
	});
	// Remove scan-running class from counters section when a scan stops (used for image progress bar)
	IMMessenger.listen.event.scan.stop_or_cancel.on(() => {
		remove_scan_running_from_irsevi_counters();
		hide_irsevi_image_progress_bar();
	});

	/****
			Average Electron Manager Listeners
	****/

	EAMMessenger.listen.info_update.rolling_20frames.on(update_irsevi_average_counters);

	/****
			Functions
	****/

	// Add "scan-running" class to counters section (used for image progress bar)
	function add_scan_running_to_irsevi_counters() {
		const irsevi_counters = document.getElementById("IRSeviCounters");
		irsevi_counters.classList.add("scan-running");
	}

	// Remove "scan-running" class from counters section (used for image progress bar)
	function remove_scan_running_from_irsevi_counters() {
		const irsevi_counters = document.getElementById("IRSeviCounters");
		irsevi_counters.classList.remove("scan-running");
	}

	function update_irsevi_counters(counts) {
		// counts should look like Image.counts
		// (i.e. counts = { electrons: { on: 0, off: 0, total: 0 }, frames: { on: 0, off: 0, total: 0 } }
		const total_frames_off = document.getElementById("IRSeviTotalFrames");
		const total_frames_on = document.getElementById("IRSeviTotalFramesIROn");
		const total_electrons_off = document.getElementById("IRSeviTotalECount");
		const total_electrons_on = document.getElementById("IRSeviTotalECountIROn");
		let formatted_electrons_off, formatted_electrons_on;
		if (counts.electrons.off > 10000) {
			formatted_electrons_off = counts.electrons.off.toExponential(3);
		} else {
			formatted_electrons_off = counts.electrons.off.toString();
		}
		if (counts.electrons.on > 10000) {
			formatted_electrons_on = counts.electrons.on.toExponential(3);
		} else {
			formatted_electrons_on = counts.electrons.on.toString();
		}

		total_frames_off.value = counts.frames.off;
		total_frames_on.value = counts.frames.on;
		total_electrons_off.value = formatted_electrons_off;
		total_electrons_on.value = formatted_electrons_on;
	}

	/**
	 * @param {Rolling20Frames} r2f_results
	 */
	function update_irsevi_average_counters(r2f_results) {
		const avg_electrons_off = document.getElementById("IRSeviAvgECount");
		const avg_electrons_on = document.getElementById("IRSeviAvgECountIROn");
		avg_electrons_off.value = r2f_results.off.total.average.toFixed(2);
		avg_electrons_on.value = r2f_results.on.total.average.toFixed(2);
	}

	function send_irsevi_autostop_value_update() {
		const autostop_value = document.getElementById("IRSeviAutomaticStop");
		let value = autostop_value.value;
		IMMessenger.update.autostop({ value: value });
	}

	function send_irsevi_autostop_unit_update() {
		const autostop_unit = document.getElementById("IRSeviAutomaticStopUnit");
		const methods = [AutostopMethod.NONE, AutostopMethod.ELECTRONS, AutostopMethod.FRAMES];
		let method = methods[autostop_unit.selectedIndex] || AutostopMethod.NONE; // If selectedIndex is (somehow) out of range, send NONE as method
		IMMessenger.update.autostop({ method: method });
	}

	function update_irsevi_autostop(autostop_params) {
		const autostop_value = document.getElementById("IRSeviAutomaticStop");
		const autostop_unit = document.getElementById("IRSeviAutomaticStopUnit");
		if (autostop_params.value === Infinity) autostop_value.value = "";
		else autostop_value.value = autostop_params.value;
		switch (autostop_params.method) {
			case AutostopMethod.NONE:
				autostop_unit.selectedIndex = 0;
				break;
			case AutostopMethod.ELECTRONS:
				autostop_unit.selectedIndex = 1;
				break;
			case AutostopMethod.FRAMES:
				autostop_unit.selectedIndex = 2;
				break;
			default:
				autostop_unit.selectedIndex = 0;
				break;
		}
	}

	function update_irsevi_image_progress_bar(percent) {
		const progress_bar = document.getElementById("IRSeviImageProgressBar");
		const percent_label = document.getElementById("IRSeviImageProgressPercentLabel");
		// Move progress bar
		if (percent) {
			if (percent > 100) percent = 100;
			else if (percent < 0) percent = 0;
			progress_bar.style.left = `-${100 - percent}%`;
			percent_label.innerText = `${Math.round(percent)}%`;
		} else {
			progress_bar.style.left = "-100%";
			percent_label.innerText = "0%";
		}
	}

	function show_irsevi_image_progress_bar() {
		// Only show the image progress bar if the current scan is an IR-SEVI scan
		if (!IMMessenger.information.image_info.is_ir) return; // Currently a SEVI scan
		// Only show the image progress bar if autostop is in use
		if (!IMMessenger.information.autostop.in_use) return;
		// Show image progress bar
		const irsevi_counters = document.getElementById("IRSeviCounters");
		irsevi_counters.classList.remove("hide-progress-bar");
		irsevi_counters.classList.add("show-progress-bar");
	}

	function hide_irsevi_image_progress_bar() {
		const irsevi_counters = document.getElementById("IRSeviCounters");
		irsevi_counters.classList.remove("show-progress-bar");
		irsevi_counters.classList.add("hide-progress-bar");
	}
}

/*****************************************************************************

							PAGE CONTROL

*****************************************************************************/

function IRSevi_Change_Pages() {
	const { Tabs } = require("./Libraries/Tabs.js");

	/****
			HTML Element Listeners
	****/

	document.getElementById("IRSeviPageDown").onclick = function () {
		load_irsevi_second_page();
	};

	document.getElementById("IRSeviPageUp").onclick = function () {
		load_irsevi_first_page();
	};

	function load_irsevi_first_page() {
		const first_page = document.getElementById(Tabs.IRSEVI.first_page);
		const second_page = document.getElementById(Tabs.IRSEVI.second_page);
		// Hide second page and show first page
		second_page.style.display = "none";
		first_page.style.display = "grid";
	}

	function load_irsevi_second_page() {
		const first_page = document.getElementById(Tabs.IRSEVI.first_page);
		const second_page = document.getElementById(Tabs.IRSEVI.second_page);
		// Hide first page and show second page
		first_page.style.display = "none";
		second_page.style.display = "grid";
	}
}

/*************************************************************************************************

								*****************************
								* IR-SEVI MODE SECOND PAGE	*
								*****************************

*************************************************************************************************/

/*****************************************************************************

					PHOTOELECTRON SPECTRUM DISPLAY

*****************************************************************************/

function IRSevi_PESpectrum_Display() {
	const { Chart, registerables } = require("chart.js");
	const { zoomPlugin } = require("chartjs-plugin-zoom");
	const { PESRadio, PESpectrumDisplay, IRPESpectrumDisplay } = require("./Libraries/PESpectrumDisplayClasses.js");
	const { ImageManagerMessenger } = require("./Libraries/ImageManager.js");

	if (registerables) Chart.register(...registerables);
	if (zoomPlugin) Chart.register(zoomPlugin);

	const IMMessenger = new ImageManagerMessenger();

	/****
			Setting up PES Chart
	****/

	const AllPESRadio = [];
	let DisplayedPES = new PESpectrumDisplay();

	const radio_name = "IRSEVI_pe_spectra";

	const zoom_options = {
		zoom: {
			mode: "xy",
			drag: {
				enabled: true,
				borderColor: "rgb(54, 162, 235)",
				borderWidth: 1,
				backgroundColor: "rgba(54, 162, 235, 0.3)",
			},
		},
	};

	const scales_title = {
		color: "black",
		display: true,
		font: {
			size: 16,
		},
	};

	const chart = new Chart(document.getElementById("IRSeviPESpectrum").getContext("2d"), {
		type: "line",
		options: {
			responsive: true,
			maintainAspectRatio: false,
			animations: false,
			scales: {
				x: {
					type: "linear",
					title: scales_title,
				},
				y: {
					title: scales_title,
				},
			},
			plugins: {
				zoom: zoom_options,
				title: {
					text: "",
					display: true,
					fullSize: false,
					align: "end",
					padding: 0,
				},
				legend: {
					fullSize: false,
				},
			},
			elements: {
				point: {
					radius: 0,
				},
			},
		},
	});

	/****
			HTML Element Listeners
	****/

	document.getElementById("IRSeviResetZoom").onclick = function () {
		chart.resetZoom();
	};

	document.getElementById("IRSeviChangeBasis").onclick = function () {
		PESpectrumDisplay.toggle_ebe();
		if (DisplayedPES.show_ebe) {
			// eBE plot is now displayed, change button to say R
			change_basis_button_to_R();
		} else {
			// Radial plot is now displayed, change button to say eBE
			change_basis_button_to_eBE();
		}
		update_pes_plot();
	};

	document.getElementById("IRSeviShowDifference").onclick = function () {
		PESpectrumDisplay.toggle_difference();
		if (DisplayedPES.show_difference) {
			// Difference spectrum is now displayed, change button to say IR On/Off
			change_difference_button_to_ir_on_off();
		} else {
			// IR On/Off spectrum is now displayed, change button to say Difference
			change_difference_button_to_difference();
		}
		update_pes_plot();
	};

	document.getElementById("IRSeviShowAnisotropy").onclick = function () {
		PESpectrumDisplay.toggle_anisotropy();
		if (DisplayedPES.show_anisotropy) {
			//Aanisotropy is now displayed, change button to say Hide
			change_anisotropy_button_to_hide();
		} else {
			// Anisotropy is no longer displayed, change button to say Show
			change_anisotropy_button_to_show();
		}
		update_pes_plot();
	};

	document.getElementById("IRSeviCalculateSpectrumButton").onclick = function () {
		IMMessenger.request.process_image();
	};

	/****
			Image Manager Listeners
	****/

	// Disable calculate button when Melexir starts processing
	IMMessenger.listen.event.melexir.start.on(disable_calculate_button);

	IMMessenger.listen.event.melexir.stop.on((image) => {
		// Check if this image is already in PES list
		let is_not_in_list = true;
		for (radio of AllPESRadio) {
			if (image.id === radio.image.id) {
				// Update that image and end loop
				radio.update_image(image);
				// If the updated image is also displayed (i.e. the radio is checked) then update plot
				if (radio.radio.checked) {
					DisplayedPES = radio.spectrum_display;
					update_pes_plot();
				}
				is_not_in_list = false;
				break;
			}
		}
		if (is_not_in_list) {
			// Create new radio button and add to list
			add_radio_button(image);
			// If that is the only image so far, display it
			if (AllPESRadio.length === 1) {
				AllPESRadio[0].radio.checked = true;
				DisplayedPES = AllPESRadio[0].spectrum_display;
				update_pes_plot();
			}
		}
		// Re-enable calculate button
		enable_calculate_button();
	});

	/****
			Functions
	****/

	function clear_irsevi_pe_spectra_display() {
		const spectra_selection = document.getElementById("IRSeviSpectrumSelection");
		const display_length = spectra_selection.children.length;
		for (let i = 0; i < display_length; i++) {
			// Remove the first child from section
			spectra_selection.removeChild(spectra_selection.children[0]);
		}
	}

	function add_radio_button(image) {
		const spectra_selection = document.getElementById("IRSeviSpectrumSelection");

		let radio = new PESRadio(image, radio_name);
		radio.set_up_callback((spectrum_display) => {
			DisplayedPES = spectrum_display;
			update_pes_plot();
		});
		radio.add_to_div(spectra_selection);

		AllPESRadio.push(radio);
	}

	function update_pes_plot() {
		chart.data = DisplayedPES.data;
		chart.options.plugins.tooltip = DisplayedPES.tooltip;
		chart.options.plugins.title.text = DisplayedPES.plugins_title;
		chart.options.scales.x.title.text = DisplayedPES.x_axis_title;
		chart.options.scales.y.title.text = DisplayedPES.y_axis_title;
		chart.update();
	}

	function change_basis_button_to_R() {
		const basis_button = document.getElementById("IRSeviChangeBasis");
		basis_button.innerText = "Show R Plot";
	}

	function change_basis_button_to_eBE() {
		const basis_button = document.getElementById("IRSeviChangeBasis");
		basis_button.innerText = "Show eBE Plot";
	}

	function change_difference_button_to_difference() {
		const difference_button = document.getElementById("IRSeviShowDifference");
		difference_button.innerText = "Show Difference";
	}

	function change_difference_button_to_ir_on_off() {
		const difference_button = document.getElementById("IRSeviShowDifference");
		difference_button.innerText = "Show IR On/Off";
	}

	function change_anisotropy_button_to_show() {
		const anisotropy_button = document.getElementById("IRSeviShowAnisotropy");
		anisotropy_button.innerText = "Show Anisotropy";
	}

	function change_anisotropy_button_to_hide() {
		const anisotropy_button = document.getElementById("IRSeviShowAnisotropy");
		anisotropy_button.innerText = "Hide Anisotropy";
	}

	function disable_calculate_button() {
		const calculate_button = document.getElementById("IRSeviCalculateSpectrumButton");
		calculate_button.disabled = true;
	}

	function enable_calculate_button() {
		const calculate_button = document.getElementById("IRSeviCalculateSpectrumButton");
		calculate_button.disabled = false;
	}
}

/*****************************************************************************

							RECENT SCANS

*****************************************************************************/

function IRSevi_Recent_Scans() {
	const { SafeIRImage, SafeImage } = require("./Libraries/ImageClasses.js");
	const { ImageManagerMessenger } = require("./Libraries/ImageManager.js");
	const IMMessenger = new ImageManagerMessenger();

	/****
			Image Manager Listeners
	****/

	IMMessenger.listen.event.scan.stop.on(() => {
		// Clear display
		clear_irsevi_recent_scan_display();
		// Get all images from Image Manager and put scan information on the display
		let all_images = IMMessenger.information.all_images;
		for (image of all_images) {
			if (image.is_ir) {
				show_irsevi_ir_scan_info(image);
			} else {
				show_irsevi_scan_info(image);
			}
		}
	});

	/****
			Functions
	****/

	function clear_irsevi_recent_scan_display() {
		const recent_scans = document.getElementById("IRSeviRecentScansSection");
		const display_length = recent_scans.children.length;
		for (let i = 0; i < display_length; i++) {
			// Remove the first child from section
			recent_scans.removeChild(recent_scans.children[0]);
		}
	}

	/**
	 * @param {SafeImage | SafeIRImage} image_class
	 */
	function show_irsevi_scan_info(image_class) {
		const recent_scans = document.getElementById("IRSeviRecentScansSection");

		// To add: Image ID, Detachment (converted) wavelength, Detachment (converted) wavenumber, Frame count, Electron count
		const vals_to_add = [];
		vals_to_add.push(`i${image_class.id_str}`); // Image ID
		// Converted detachment wavelength
		let wavelength = image_class.detachment_wavelength.energy.wavelength;
		if (wavelength > 0) wavelength = `${wavelength.toFixed(3)} nm`;
		else wavelength = ""; // Don't show wavelength if not stored
		vals_to_add.push(wavelength);
		// Converted detachment wavenumber
		let wavenumber = image_class.detachment_wavelength.energy.wavenumber;
		if (wavenumber > 0) wavenumber = `${wavenumber.toFixed(3)} cm-1`;
		else wavenumber = ""; // Don't show wavenumber if not stored
		vals_to_add.push(wavenumber);
		// Frame count
		let frame_count = image_class.counts.frames.total;
		if (frame_count > 1000) frame_count = `${(frame_count / 1000).toFixed(1)}k`;
		vals_to_add.push(frame_count);
		// Electron count
		let electron_count = image.counts.electrons.total;
		if (electron_count > 1e4) electron_count = electron_count.toExponential(2);
		vals_to_add.push(electron_count);

		// Add information to recent scans section as <p> elements
		let tag;
		for (let i = 0; i < vals_to_add.length; i++) {
			tag = document.createElement("p");
			tag.style.borderBottom = "1px solid lightsteelblue";
			text_node = document.createTextNode(vals_to_add[i]);
			tag.appendChild(text_node);
			recent_scans.appendChild(tag);
		}
	}

	function show_irsevi_ir_scan_info(image_class) {
		const recent_scans = document.getElementById("IRSeviRecentScansSection");

		// To add: Image ID, Detachment (converted) wavelength, Detachment (converted) wavenumber, Frame (off) count, Electron (off) count
		const vals_to_add = [];
		vals_to_add.push(`i${image_class.id_str}`); // Image ID
		// Converted detachment wavelength
		let wavelength = image_class.detachment_wavelength.energy.wavelength;
		if (wavelength > 0) wavelength = `${wavelength.toFixed(3)} nm`;
		else wavelength = ""; // Don't show wavelength if not stored
		vals_to_add.push(wavelength);
		// Converted detachment wavenumber
		let wavenumber = image_class.detachment_wavelength.energy.wavenumber;
		if (wavenumber > 0) wavenumber = `${wavenumber.toFixed(3)} cm-1`;
		else wavenumber = ""; // Don't show wavenumber if not stored
		vals_to_add.push(wavenumber);
		// Frame (IR off) count
		let frame_count = image_class.counts.frames.off;
		if (frame_count > 1000) frame_count = `${(frame_count / 1000).toFixed(1)}k`;
		vals_to_add.push(frame_count);
		// Electron (IR off) count
		let electron_count = image.counts.electrons.off;
		if (electron_count > 1e4) electron_count = electron_count.toExponential(2);
		vals_to_add.push(electron_count);

		// To add: (blank), Excitation (nIR) wavelength, Excitation (converted) wavenumber, Frame (on) count, Electron (on) count
		const ir_vals_to_add = [];
		ir_vals_to_add.push("");
		// Excitation (nIR) wavelength
		wavelength = image_class.excitation_wavelength.nIR.wavelength;
		if (wavelength > 0) wavelength = `${wavelength.toFixed(3)} nm`;
		else wavelength = ""; // Don't show wavelength if not stored
		ir_vals_to_add.push(wavelength);
		// Excitation (converted) wavenumber
		wavenumber = image_class.excitation_wavelength.energy.wavenumber;
		if (wavenumber > 0) wavenumber = `${wavenumber.toFixed(3)} cm-1`;
		else wavenumber = ""; // Don't show wavenumber if not stored
		ir_vals_to_add.push(wavenumber);
		// Frame (IR on) count
		frame_count = image_class.counts.frames.on;
		if (frame_count > 1000) frame_count = `${(frame_count / 1000).toFixed(1)}k`;
		ir_vals_to_add.push(frame_count);
		// Electron (IR on) count
		electron_count = image.counts.electrons.on;
		if (electron_count > 1e4) electron_count = electron_count.toExponential(2);
		ir_vals_to_add.push(electron_count);

		// Add information to recent scans section as <p> elements
		let tag;
		for (let i = 0; i < vals_to_add.length; i++) {
			tag = document.createElement("p");
			text_node = document.createTextNode(vals_to_add[i]);
			tag.appendChild(text_node);
			recent_scans.appendChild(tag);
		}
		// Add information to recent scans section as <p> elements
		for (let i = 0; i < ir_vals_to_add.length; i++) {
			tag = document.createElement("p");
			tag.style.borderBottom = "1px solid lightsteelblue";
			text_node = document.createTextNode(ir_vals_to_add[i]);
			tag.appendChild(text_node);
			recent_scans.appendChild(tag);
		}
	}
}

/*****************************************************************************

						LASER ENERGY CONVERSION

*****************************************************************************/

/*****************************************************************************

							PAGE LOADING

*****************************************************************************/

function IRSevi_Load_Page(PageInfo) {
	const { Tabs } = require("./Libraries/Tabs.js");
	const { ImageManagerMessenger } = require("./Libraries/ImageManager.js");
	const IMMessenger = new ImageManagerMessenger();

	// Show/hide image series button based on settings
	const irsevi_controls = document.getElementById("IRSeviScanControls");
	if (irsevi_controls) {
		if (settings?.image_series.show_menu) irsevi_controls.classList.remove("hide-image-series");
		else irsevi_controls.classList.add("hide-image-series");
	}

	// Show tab highlight if SEVI scan is being taken
	IMMessenger.listen.event.scan.start.on(() => {
		// Make sure it is an IR-SEVI scan
		if (IMMessenger.information.image_info.is_ir) {
			let tab = document.getElementById(Tabs.IRSEVI.tab);
			if (tab) tab.classList.add("highlighted-tab");
		}
	});
	// Remove tab highlight if SEVI scan is stopped or canceled
	IMMessenger.listen.event.scan.stop_or_cancel.on(() => {
		let tab = document.getElementById(Tabs.IRSEVI.tab);
		if (tab) tab.classList.remove("highlighted-tab");
	});

	// Wrapping these in try/catch so that rest of program can still load
	//	even if somemodules are buggy
	try {
		IRSevi_Scan_Control();
	} catch (error) {
		console.log("Cannot load IR-SEVI tab Scan Controls module:", error);
	}
	try {
		IRSevi_File_Naming();
	} catch (error) {
		console.log("Cannot load IR-SEVI tab File Naming module:", error);
	}
	try {
		IRSevi_Laser_Control();
	} catch (error) {
		console.log("Cannot load IR-SEVI tab Laser Controls module:", error);
	}
	try {
		IRSevi_Accumulated_Image_Display(PageInfo);
	} catch (error) {
		console.log("Cannot load IR-SEVI tab Accumulated Image Display module:", error);
	}
	try {
		IRSevi_Counts();
	} catch (error) {
		console.log("Cannot load IR-SEVI tab Electron/Frame Counts module:", error);
	}
	try {
		IRSevi_Change_Pages();
	} catch (error) {
		console.log("Cannot load IR-SEVI tab page up/down buttons:", error);
	}
	/*		Second Page		*/
	try {
		IRSevi_PESpectrum_Display();
	} catch (error) {
		console.log("Cannot load IR-SEVI tab PE Spectra Display module:", error);
	}
	try {
		IRSevi_Recent_Scans();
	} catch (error) {
		console.log("Cannot load IR-SEVI tab Recent Scans module:", error);
	}
}

/**
 * Functions to execute every time the IR-SEVI tab is loaded - should only be used by Tab Manager
 */
function IRSevi_Load_Tab() {
	const { ImageType } = require("./Libraries/ImageClasses.js");

	function update_irsevi_accumulated_image_display() {
		const image_display = document.getElementById("IRSeviDisplay");
		const image_display_select = document.getElementById("IRSeviImageDisplaySelect");
		const ctx = image_display.getContext("2d");
		const image_types = [ImageType.IROFF, ImageType.IRON, ImageType.DIFFPOS, ImageType.DIFFNEG];
		let image_type = image_types[image_display_select.selectedIndex];
		let image_data = IMMessenger.information.get_image_display(image_type);
		if (!image_data) return; // No ImageData object was sent
		// Clear the current image
		ctx.clearRect(0, 0, image_display.width, image_display.height);
		// Put image_data on the display
		// Have to convert the ImageData object into a bitmap image so that the  image is resized to fill the display correctly
		createImageBitmap(image_data).then(function (bitmap_img) {
			ctx.drawImage(bitmap_img, 0, 0, image_data.width, image_data.height, 0, 0, image_display.width, image_display.height);
		});
	}

	update_irsevi_accumulated_image_display();
}

/*****************************************************************************

							EXPORTING

*****************************************************************************/

module.exports = { IRSevi_Load_Page, IRSevi_Load_Tab };
