/************************************************** 

			Control for IR Action UI elements

**************************************************/

/*****************************************************************************

						SCAN CONTROL AND OPTIONS

*****************************************************************************/

function IRAction_Scan_Control_and_Options() {
	const { IRActionManagerMessenger, ActionOptions } = require("./Libraries/IRActionManager");
	const { ImageManagerMessenger, AutostopMethod } = require("./Libraries/ImageManager.js");
	const { UpdateMessenger } = require("./Libraries/UpdateMessenger.js");

	// Messenger used for displaying update or error messages to the Message Display
	const update_messenger = new UpdateMessenger();
	const IRAMMessenger = new IRActionManagerMessenger();
	const IMMessenger = new ImageManagerMessenger();

	/*****************************************************************************

								SCAN CONTROL

	*****************************************************************************/

	/****
			HTML Element Listeners
	****/

	document.getElementById("IRActionScanStartSave").onclick = function () {
		if (!IRAMMessenger.information.status.stopped) {
			// A scan is currently running, request it be stopped
			IRAMMessenger.request.scan.stop();
		} else {
			// Start a new IR Action scan
			// Get scan options
			if (update_iraction_options()) {
				// Only continue if getting options had no errors (returned true)
				IRAMMessenger.request.scan.start();
			}
		}
	};

	document.getElementById("IRActionScanPauseResume").onclick = function () {
		if (IRAMMessenger.information.status.running) {
			// A scan is currently running, request it be paused
			IRAMMessenger.request.scan.pause();
		} else if (IRAMMessenger.information.status.paused) {
			// Scan is paused, request it be resumed
			IRAMMessenger.request.scan.resume();
		} // else
		// Scan is not running, do nothing
	};

	document.getElementById("IRActionScanCancel").onclick = function () {
		IRAMMessenger.request.scan.cancel();
	};

	document.getElementById("IRActionImageSave").onclick = function () {
		// Save IR-SEVI image and move on
		IMMessenger.request.scan.stop(); // Image Manager
		// Resume action scan if paused
		IRAMMessenger.request.scan.resume(); // IR Action Manager
	};

	document.getElementById("IRActionImageReset").onclick = function () {
		IMMessenger.request.scan.reset();
	};

	document.getElementById("IRActionRemeasureWavelength").onclick = function () {
		IRAMMessenger.request.remeasure_wavelength();
	};

	/****
			IR Action Manager Listeners
	****/

	// IR Action scan has been started
	IRAMMessenger.listen.event.scan.start.on(() => {
		change_iraction_button_to_save();
		change_iraction_button_to_pause();
		enable_iraction_pause_button();
		enable_iraction_cancel_button();
		remove_override_hide_iraction_update_reset_buttons();
	});

	// IR Action scan has been completed
	IRAMMessenger.listen.event.scan.stop_or_cancel.on(() => {
		change_iraction_button_to_start();
		change_iraction_button_to_pause();
		disable_iraction_pause_button();
		disable_iraction_cancel_button();
		add_override_hide_iraction_update_reset_buttons();
	});

	// IR Action scan has been paused
	IRAMMessenger.listen.event.scan.pause.on(() => {
		change_iraction_button_to_resume();
	});

	// IR Action scan has been resumed
	IRAMMessenger.listen.event.scan.resume.on(() => {
		change_iraction_button_to_pause();
	});

	// IR-SEVI image has started (during an action scan)
	IRAMMessenger.listen.event.image.start.on(() => {
		enable_iraction_save_continue_button();
		enable_iraction_reset_image_button();
		enable_iraction_remeasure_button();
	});

	// IR-SEVI image has stopped (during an action scan)
	IRAMMessenger.listen.event.image.stop.on(() => {
		disable_iraction_save_continue_button();
		disable_iraction_reset_image_button();
		disable_iraction_remeasure_button();
	});

	// Excitation remeasuring has started
	IRAMMessenger.listen.event.remeasure.start.on(() => {
		disable_iraction_remeasure_button();
	});

	// Excitation remeasuring has stopped
	IRAMMessenger.listen.event.remeasure.stop.on(() => {
		enable_iraction_remeasure_button();
	});

	/****
			Functions
	****/

	// Change IR Action Start/Save button to Start
	function change_iraction_button_to_start() {
		const start_button_text = document.getElementById("IRActionScanStartSaveText");
		start_button_text.innerText = "Start";
	}

	// Change IR Action Start/Save button to Save
	function change_iraction_button_to_save() {
		const start_button_text = document.getElementById("IRActionScanStartSaveText");
		start_button_text.innerText = "Save";
	}

	// Change IR Action Pause/Resume button to Pause
	function change_iraction_button_to_pause() {
		const pause_button_text = document.getElementById("IRActionScanPauseResumeText");
		pause_button_text.innerText = "Pause";
	}

	// Change IR Action Pause/Resume button to Resume
	function change_iraction_button_to_resume() {
		const pause_button_text = document.getElementById("IRActionScanPauseResumeText");
		pause_button_text.innerText = "Resume";
	}

	// Disable IR Action Pause/Resume button
	function disable_iraction_pause_button() {
		const pause_button = document.getElementById("IRActionScanPauseResume");
		pause_button.disabled = true;
	}

	// Enable IR Action Pause/Resume button
	function enable_iraction_pause_button() {
		const pause_button = document.getElementById("IRActionScanPauseResume");
		pause_button.disabled = false;
	}

	// Disable IR Action Cancel button
	function disable_iraction_cancel_button() {
		const cancel_button = document.getElementById("IRActionScanCancel");
		cancel_button.disabled = true;
	}

	// Enable IR Action Cancel button
	function enable_iraction_cancel_button() {
		const cancel_button = document.getElementById("IRActionScanCancel");
		cancel_button.disabled = false;
	}

	// Disable IR Action Save & Continue button
	function disable_iraction_save_continue_button() {
		const save_continue_button = document.getElementById("IRActionImageSave");
		save_continue_button.disabled = true;
	}

	// Enable IR Action Save & Continue button
	function enable_iraction_save_continue_button() {
		const save_continue_button = document.getElementById("IRActionImageSave");
		save_continue_button.disabled = false;
	}

	// Disable IR Action Reset Image button
	function disable_iraction_reset_image_button() {
		const reset_image_button = document.getElementById("IRActionImageReset");
		reset_image_button.disabled = true;
	}

	// Enable IR Action Reset Image button
	function enable_iraction_reset_image_button() {
		const reset_image_button = document.getElementById("IRActionImageReset");
		reset_image_button.disabled = false;
	}

	// Disable IR Action Remeasure Wavelength button
	function disable_iraction_remeasure_button() {
		const remeasure_button = document.getElementById("IRActionRemeasureWavelength");
		remeasure_button.disabled = true;
	}

	// Enable IR Action Remeasure Wavelength button
	function enable_iraction_remeasure_button() {
		const remeasure_button = document.getElementById("IRActionRemeasureWavelength");
		remeasure_button.disabled = false;
	}

	/*****************************************************************************

								SCAN OPTIONS

	*****************************************************************************/

	/****
			HTML Element Listeners
	****/

	document.getElementById("IRActionVMIMode").oninput = function () {
		const vmi_mode = document.getElementById("IRActionVMIMode");
		let index = vmi_mode.selectedIndex;
		IMMessenger.update.vmi_info({ index: index });
	};

	document.getElementById("IRActionInitialEnergy").oninput = function () {
		show_iraction_update_reset_buttons();
	};
	document.getElementById("IRActionFinalEnergy").oninput = function () {
		show_iraction_update_reset_buttons();
	};
	document.getElementById("IRActionEnergyStep").oninput = function () {
		show_iraction_update_reset_buttons();
	};
	document.getElementById("IRActionAutomaticStop").oninput = function () {
		show_iraction_update_reset_buttons();
	};
	document.getElementById("IRActionAutomaticStopUnit").oninput = function () {
		show_iraction_update_reset_buttons();
	};
	document.getElementById("IRActionImageAmount").oninput = function () {
		show_iraction_update_reset_buttons();
	};

	document.getElementById("IRActionResetOptions").onclick = function () {
		reset_iraction_options();
	};

	document.getElementById("IRActionUpdateOptions").onclick = function () {
		update_iraction_options();
	};

	/****
			Image Manager Listeners
	****/

	// Update VMI info
	IMMessenger.listen.info_update.image.vmi_info.on(update_iraction_vmi);

	// Update autostop parameters
	IMMessenger.listen.info_update.autostop.params.on(update_iraction_autostop);

	/****
			Functions
	****/

	function update_iraction_options() {
		// Options sent to ActionManager:
		// initial energy, final energy, step size, images per step
		// Options sent to ImageManager:
		// Autostop
		const initial_energy_input = document.getElementById("IRActionInitialEnergy");
		const final_energy_input = document.getElementById("IRActionFinalEnergy");
		const step_size_input = document.getElementById("IRActionEnergyStep");
		const autostop_input = document.getElementById("IRActionAutomaticStop");
		const autostop_unit_input = document.getElementById("IRActionAutomaticStopUnit");
		const images_per_step_input = document.getElementById("IRActionImageAmount");
		// Get values
		let initial_energy = parseFloat(initial_energy_input.value);
		let final_energy = parseFloat(final_energy_input.value);
		let step_size = parseFloat(step_size_input.value);
		let autostop = parseFloat(autostop_input.value);
		let autostop_unit = [AutostopMethod.ELECTRONS, AutostopMethod.FRAMES][autostop_unit_input.selectedIndex];
		let images_per_step = images_per_step_input.selectedIndex + 1;
		// Make sure no options were blank
		let exit_function = false;
		if (isNaN(initial_energy) || isNaN(final_energy) || isNaN(step_size)) {
			update_messenger.error("IR Action energy values need to be specified");
			exit_function = true;
		}
		if (initial_energy <= 0 || final_energy <= 0) {
			update_messenger.error("IR Action energy values need to be positive");
			exit_function = true;
		}
		if (isNaN(autostop) || autostop_unit === undefined) {
			update_messenger.error("IR Action automatic stop values need to be specified");
			exit_function = true;
		}
		if (exit_function) return false;

		// All values check out - send to respective managers
		let action_options = new ActionOptions();
		action_options.initial_energy = initial_energy;
		action_options.final_energy = final_energy;
		action_options.step_size = step_size;
		action_options.images_per_step = images_per_step;
		IRAMMessenger.update.options(action_options);
		IMMessenger.update.autostop({ value: autostop, method: autostop_unit });
		// Hide update and reset options buttons
		hide_iraction_update_reset_buttons();
		return true;
	}

	function reset_iraction_options() {
		const initial_energy_input = document.getElementById("IRActionInitialEnergy");
		const final_energy_input = document.getElementById("IRActionFinalEnergy");
		const step_size_input = document.getElementById("IRActionEnergyStep");
		const images_per_step_input = document.getElementById("IRActionImageAmount");

		// Get IR Action scan parameters
		let action_options = IRAMMessenger.information.options;
		initial_energy_input.value = action_options.initial_energy;
		final_energy_input.value = action_options.final_energy;
		step_size_input.value = action_options.step_size;
		images_per_step_input.selectedIndex = action_options.images_per_step - 1;

		// Get autostop parameters
		let autostop_parameters = IMMessenger.information.autostop.params;
		update_iraction_autostop(autostop_parameters);

		// Hide update and reset options buttons
		hide_iraction_update_reset_buttons();
	}

	function update_iraction_autostop(autostop_params) {
		const autostop_value = document.getElementById("IRActionAutomaticStop");
		const autostop_unit = document.getElementById("IRActionAutomaticStopUnit");
		if (autostop_params.value === Infinity) autostop_value.value = "";
		else autostop_value.value = autostop_params.value;
		switch (autostop_params.method) {
			case AutostopMethod.ELECTRONS:
				autostop_unit.selectedIndex = 0;
				break;
			case AutostopMethod.FRAMES:
				autostop_unit.selectedIndex = 1;
				break;
			default:
				autostop_unit.selectedIndex = 0;
				break;
		}
	}

	function update_iraction_vmi(vmi_info) {
		const vmi_mode = document.getElementById("IRActionVMIMode");
		vmi_mode.selectedIndex = vmi_info.index;
	}

	function show_iraction_update_reset_buttons() {
		const reset = document.getElementById("IRActionResetOptions");
		const update = document.getElementById("IRActionUpdateOptions");
		reset.classList.remove("hidden");
		update.classList.remove("hidden");
	}

	function hide_iraction_update_reset_buttons() {
		const reset = document.getElementById("IRActionResetOptions");
		const update = document.getElementById("IRActionUpdateOptions");
		reset.classList.add("hidden");
		update.classList.add("hidden");
	}

	function remove_override_hide_iraction_update_reset_buttons() {
		const reset = document.getElementById("IRActionResetOptions");
		const update = document.getElementById("IRActionUpdateOptions");
		reset.classList.remove("stay-hidden");
		update.classList.remove("stay-hidden");
	}

	function add_override_hide_iraction_update_reset_buttons() {
		const reset = document.getElementById("IRActionResetOptions");
		const update = document.getElementById("IRActionUpdateOptions");
		reset.classList.add("stay-hidden");
		update.classList.add("stay-hidden");
	}
}

/*****************************************************************************

							SCAN STATUS

*****************************************************************************/

function IRAction_Scan_Status() {
	const { IRActionManagerMessenger } = require("./Libraries/IRActionManager");

	// Messenger used for displaying update or error messages to the Message Display
	const IRAMMessenger = new IRActionManagerMessenger();

	// Hide IR Action Status Current Energy and Next Energy elements on startup
	hide_iraction_status_current_energy();
	hide_iraction_status_next_energy();

	/****
			IR Action Manager Listeners
	****/

	// IR-SEVI image started
	IRAMMessenger.listen.event.image.start.on(() => {
		update_iraction_status_current_step("Collecting IR-SEVI Image");
	});
	// IR-SEVI image paused
	IRAMMessenger.listen.event.image.pause.on(() => {
		update_iraction_status_current_step("Collecting IR-SEVI Image (Paused)");
	});
	// IR-SEVI image resumed
	IRAMMessenger.listen.event.image.resume.on(() => {
		update_iraction_status_current_step("Collecting IR-SEVI Image");
	});
	// IR-SEVI image stopped
	IRAMMessenger.listen.event.image.stop.on(() => {
		update_iraction_status_current_step(); // Clear status message
	});

	// GoTo process started
	IRAMMessenger.listen.event.goto.start.on(() => {
		update_iraction_status_current_step("Moving OPO Wavelength");
	});
	// GoTo process paused
	IRAMMessenger.listen.event.goto.pause.on(() => {
		update_iraction_status_current_step("Moving OPO Wavelength (Paused)");
	});
	// GoTo process resumed
	IRAMMessenger.listen.event.goto.resume.on(() => {
		update_iraction_status_current_step("Moving OPO Wavelength");
	});
	// GoTo process stopped
	IRAMMessenger.listen.event.goto.stop.on(() => {
		update_iraction_status_current_step(); // Clear status message
	});

	// Remeasure excitation wavelength started
	IRAMMessenger.listen.event.remeasure.start.on(() => {
		update_iraction_status_current_step("Remeasuring OPO Wavelength");
	});
	// Remeasure excitation wavelength stopped
	IRAMMessenger.listen.event.remeasure.stop.on(() => {
		// Remeasure can only happen when IR-SEVI image is being collected
		// so when it's done, status should change back to collecting image
		update_iraction_status_current_step("Collecting IR-SEVI Image");
	});

	// Action scan stopped
	IRAMMessenger.listen.event.scan.stop.on(() => {
		update_iraction_status_image_amount(); // Clear status message
		hide_iraction_status_current_energy();
		hide_iraction_status_next_energy();
		update_iraction_status_current_step("Action Scan Completed");
	});

	/* Listen for updated information */
	IRAMMessenger.listen.info_update.image_amount.on(update_iraction_status_image_amount);
	IRAMMessenger.listen.info_update.energy.current.on(update_iraction_status_current_energy);
	IRAMMessenger.listen.info_update.energy.next.on(update_iraction_status_next_energy);
	IRAMMessenger.listen.info_update.duration.on(update_iraction_status_duration);

	/****
			Functions
	****/

	function flash_iraction_status_label(label_id) {
		const label = document.getElementById(label_id);
		if (label) {
			label.style.color = "blue";
			setTimeout(() => {
				label.style.color = "white";
			}, 200);
		}
	}

	/**
	 * Update the "Current Image" portion of the status section
	 * @param {ImageAmountInfo} image_amount_info
	 */
	function update_iraction_status_image_amount(image_amount_info) {
		const current_image = document.getElementById("IRActionStatusCurrentImageValues");
		if (!image_amount_info) {
			// Clear display
			current_image.innerText = "";
			hide_iraction_progress_bar();
			return;
		}
		// Stringify image progress
		let image_progress = `${image_amount_info.image_number} of ${image_amount_info.total_image_number}`;
		// Put it all together
		let image_string = `i${image_amount_info.image_id_str} (${image_progress})`;
		// Update text on UI
		current_image.innerText = image_string;
		// Flash label as notification of change
		flash_iraction_status_label("IRActionStatusCurrentImageLabel");
		// Update progress bar
		show_iraction_progress_bar();
		update_iraction_progress_bar((100 * (image_amount_info.image_number - 1)) / image_amount_info.total_image_number);
	}

	/**
	 * Update the current IR energy portion of the status section
	 * @param {ExcitationWavelength} excitation_wavelength
	 */
	function update_iraction_status_current_energy(excitation_wavelength) {
		const nir_wavelength = document.getElementById("IRActionCurrentWavelength");
		const ir_mode = document.getElementById("IRActionStatusCurrentEnergyIRLabel");
		const ir_wavenumber = document.getElementById("IRActionCurrentWavenumber");
		if (excitation_wavelength) {
			if (excitation_wavelength.nIR.wavelength > 0) {
				nir_wavelength.value = excitation_wavelength.nIR.wavelength.toFixed(3);
				ir_wavenumber.value = excitation_wavelength.energy.wavenumber.toFixed(3);
				ir_mode.innerText = excitation_wavelength.selected_mode.pretty_name;
			} else {
				nir_wavelength.value = "";
				ir_wavenumber.value = "";
				ir_mode.innerText = "";
			}
			show_iraction_status_current_energy();
			// Flash label as notification of change
			flash_iraction_status_label("IRActionStatusCurrentEnergyLabel");
		} else {
			hide_iraction_status_current_energy();
		}
	}

	function hide_iraction_status_current_energy() {
		const elements = [
			"IRActionStatusCurrentEnergyNIRLabel",
			"IRActionCurrentWavelength",
			"IRActionStatusNMLabel1",
			"IRActionStatusArrow1",
			"IRActionStatusCurrentEnergyIRLabel",
			"IRActionCurrentWavenumber",
			"IRActionStatusWNLabel1",
		];
		for (let e of elements) {
			document.getElementById(e).hidden = true;
		}
	}

	function show_iraction_status_current_energy() {
		const elements = [
			"IRActionStatusCurrentEnergyNIRLabel",
			"IRActionCurrentWavelength",
			"IRActionStatusNMLabel1",
			"IRActionStatusArrow1",
			"IRActionStatusCurrentEnergyIRLabel",
			"IRActionCurrentWavenumber",
			"IRActionStatusWNLabel1",
		];
		for (let e of elements) {
			document.getElementById(e).hidden = false;
		}
	}

	/**
	 * Update the next IR energy portion of the status section
	 * @param {ExcitationWavelength} excitation_wavelength
	 */
	function update_iraction_status_next_energy(excitation_wavelength) {
		const nir_wavelength = document.getElementById("IRActionNextWavelength");
		const ir_mode = document.getElementById("IRActionStatusNextEnergyIRLabel");
		const ir_wavenumber = document.getElementById("IRActionNextWavenumber");
		if (excitation_wavelength) {
			if (excitation_wavelength.nIR.wavelength > 0) {
				nir_wavelength.value = excitation_wavelength.nIR.wavelength.toFixed(3);
				ir_wavenumber.value = excitation_wavelength.energy.wavenumber.toFixed(3);
				ir_mode.innerText = excitation_wavelength.selected_mode.pretty_name;
			} else {
				nir_wavelength.value = "";
				ir_wavenumber.value = "";
				ir_mode.innerText = "";
			}
			show_iraction_status_next_energy();
			// Flash label as notification of change
			flash_iraction_status_label("IRActionStatusNextEnergyLabel");
		} else {
			hide_iraction_status_next_energy();
		}
	}

	function hide_iraction_status_next_energy() {
		const elements = [
			"IRActionStatusNextEnergyNIRLabel",
			"IRActionNextWavelength",
			"IRActionStatusNMLabel2",
			"IRActionStatusArrow2",
			"IRActionStatusNextEnergyIRLabel",
			"IRActionNextWavenumber",
			"IRActionStatusWNLabel2",
		];
		for (let e of elements) {
			document.getElementById(e).hidden = true;
		}
	}

	function show_iraction_status_next_energy() {
		const elements = [
			"IRActionStatusNextEnergyNIRLabel",
			"IRActionNextWavelength",
			"IRActionStatusNMLabel2",
			"IRActionStatusArrow2",
			"IRActionStatusNextEnergyIRLabel",
			"IRActionNextWavenumber",
			"IRActionStatusWNLabel2",
		];
		for (let e of elements) {
			document.getElementById(e).hidden = false;
		}
	}

	/**
	 * Update the action scan duration status
	 * @param {ActionDuration} duration
	 */
	function update_iraction_status_duration(duration) {
		const duration_value = document.getElementById("IRActionStatusScanDurationValues");
		// Extract time data from class
		let { seconds, minutes, hours } = duration;
		let duration_text = "";
		if (seconds === 1) duration_text = "1 second";
		else if (seconds > 1) duration_text = `${seconds} seconds`;
		if (minutes === 1) duration_text = "1 minute " + duration_text;
		else if (minutes > 1) duration_text = `${minutes} minutes ` + duration_text;
		if (hours === 1) duration_text = "1 hour " + duration_text;
		else if (hours > 1) duration_text = `${hours} hours ` + duration_text;
		duration_value.innerText = duration_text;
		// Flash label as notification of change
		flash_iraction_status_label("IRActionStatusScanDurationLabel");
	}

	function update_iraction_status_current_step(message) {
		const current_step = document.getElementById("IRActionStatusCurrentStepValues");
		if (message) current_step.innerText = message;
		else current_step.innerText = "";
		// Flash label as notification of change
		flash_iraction_status_label("IRActionStatusCurrentStepLabel");
	}

	function update_iraction_progress_bar(percent) {
		const progress_bar = document.getElementById("IRActionProgressBar");
		// Move progress bar
		if (percent) {
			if (percent > 100) percent = 100;
			else if (percent < 0) percent = 0;
			progress_bar.style.left = `-${100 - percent}%`;
		} else {
			progress_bar.style.left = "-100%";
		}
	}

	function show_iraction_progress_bar() {
		const progress_bar = document.getElementById("IRActionProgressBarOuter");
		progress_bar.style.display = "grid";
	}

	function hide_iraction_progress_bar() {
		const progress_bar = document.getElementById("IRActionProgressBarOuter");
		progress_bar.style.display = "none";
	}
}

/*****************************************************************************

						ACCUMULATED IMAGE DISPLAY

*****************************************************************************/

function IRAction_Accumulated_Image_Display(PageInfo) {
	const { ImageType } = require("./Libraries/ImageClasses.js");
	const { Tabs } = require("./Libraries/Tabs.js");
	const { ImageManagerMessenger } = require("./Libraries/ImageManager.js");

	const IMMessenger = new ImageManagerMessenger();

	/****
			HTML Element Listeners
	****/

	document.getElementById("IRActionImageDisplaySelect").oninput = function () {
		update_iraction_accumulated_image_display();
	};

	document.getElementById("IRActionDisplay").onclick = function () {
		const large_display = document.getElementById("LargeDisplaySection");
		large_display.classList.remove("large-display-hidden");
	};

	document.getElementById("IRActionDisplaySlider").oninput = function () {
		const display_slider = document.getElementById("IRActionDisplaySlider");
		IMMessenger.update.image_contrast(display_slider.value);
		// Update image display
		update_iraction_accumulated_image_display();
	};

	document.getElementById("IRActionDisplayCheckbox").onclick = function () {
		const checkbox = document.getElementById("IRActionDisplayCheckbox");
		if (checkbox.checked) {
			IMMessenger.update.decreased_contrast.enable();
		} else {
			IMMessenger.update.decreased_contrast.disable();
		}
	};

	/****
			Image Manager Listeners
	****/

	IMMessenger.listen.info_update.image_contrast.on((value) => {
		const display_slider = document.getElementById("IRActionDisplaySlider");
		display_slider.value = value;
	});

	// Update accumulated image when alert is sent
	IMMessenger.listen.info_update.accumulated_image.on(() => {
		// If user is not on SEVI tab, ignore
		if (PageInfo.current_tab !== Tabs.IRACTION) return;
		//console.log("Updating");
		update_iraction_accumulated_image_display();
	});

	// Update accumulated image display when scan is reset
	IMMessenger.listen.event.scan.reset.on(update_iraction_accumulated_image_display);

	// Update whether decreased contrast checkbox is enabled
	IMMessenger.listen.info_update.decreased_contrast.on((checked) => {
		const checkbox = document.getElementById("IRActionDisplayCheckbox");
		checkbox.checked = checked;
	});

	/****
			Functions
	****/

	function update_iraction_accumulated_image_display() {
		const image_display = document.getElementById("IRActionDisplay");
		const image_display_select = document.getElementById("IRActionImageDisplaySelect");
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

function IRAction_Counts() {
	const { ImageManagerMessenger } = require("./Libraries/ImageManager.js");
	const { IRActionManagerMessenger } = require("./Libraries/IRActionManager");
	const { AverageElectronManagerMessenger, Rolling20Frames } = require("./Libraries/AverageElectronManager.js");

	const IRAMMessenger = new IRActionManagerMessenger();
	const IMMessenger = new ImageManagerMessenger();
	const EAMMessenger = new AverageElectronManagerMessenger();

	/****
			Image Manager Listeners
	****/

	IMMessenger.listen.info_update.image.counts.on(update_iraction_counters);

	IMMessenger.listen.info_update.autostop.progress.on((progress) => {
		// Only update progress bar if IR Action scan is taking place
		if (!IRAMMessenger.information.status.stopped) update_iraction_image_progress_bar(progress);
	});

	/****
			IR Action Manager Listeners
	****/

	// If an image is stopped during an action scan, say the progress is at 100%
	IRAMMessenger.listen.event.image.stop.on(() => {
		update_iraction_image_progress_bar(100);
	});
	// Set progress to 0% when action scan is complete
	IRAMMessenger.listen.event.scan.stop.on(() => {
		update_iraction_image_progress_bar();
	});

	/****
			Average Electron Manager Listeners
	****/

	EAMMessenger.listen.info_update.rolling_20frames.on(update_iraction_average_counters);

	/****
			Functions
	****/

	function update_iraction_counters(counts) {
		// counts should look like Image.counts
		// (i.e. counts = { electrons: { on: 0, off: 0, total: 0 }, frames: { on: 0, off: 0, total: 0 } }
		const total_frames_off = document.getElementById("IRActionTotalFrames");
		const total_frames_on = document.getElementById("IRActionTotalFramesIROn");
		const total_electrons_off = document.getElementById("IRActionTotalECount");
		const total_electrons_on = document.getElementById("IRActionTotalECountIROn");
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
	function update_iraction_average_counters(r2f_results) {
		const avg_electrons_off = document.getElementById("IRActionAvgECount");
		const avg_electrons_on = document.getElementById("IRActionAvgECountIROn");
		avg_electrons_off.value = r2f_results.off.total.average.toFixed(2);
		avg_electrons_on.value = r2f_results.on.total.average.toFixed(2);
	}

	function update_iraction_image_progress_bar(percent) {
		const progress_bar = document.getElementById("IRActionImageProgressBar");
		const percent_label = document.getElementById("IRActionImageProgressPercentLabel");
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
}

/*****************************************************************************

							PAGE CONTROL

*****************************************************************************/

function IRAction_Change_Pages() {
	const { Tabs } = require("./Libraries/Tabs.js");

	/****
			HTML Element Listeners
	****/

	document.getElementById("IRActionPageDown").onclick = function () {
		load_iraction_second_page();
	};

	document.getElementById("IRActionPageUp").onclick = function () {
		load_iraction_first_page();
	};

	function load_iraction_first_page() {
		const first_page = document.getElementById(Tabs.IRACTION.first_page);
		const second_page = document.getElementById(Tabs.IRACTION.second_page);
		// Hide second page and show first page
		second_page.style.display = "none";
		first_page.style.display = "grid";
	}

	function load_iraction_second_page() {
		const first_page = document.getElementById(Tabs.IRACTION.first_page);
		const second_page = document.getElementById(Tabs.IRACTION.second_page);
		// Hide first page and show second page
		first_page.style.display = "none";
		second_page.style.display = "grid";
	}
}

/*************************************************************************************************

								******************************
								* IR ACTION MODE SECOND PAGE *
								******************************

*************************************************************************************************/

function IRAction_Second_Page() {
	const { ActionModeAnalyzer } = require("./Libraries/ActionPESpectrumClasses.js");
	const { UpdateMessenger } = require("./Libraries/UpdateMessenger.js");

	// Messenger used for displaying update or error messages to the Message Display
	const update_messenger = new UpdateMessenger();

	const AMAnalyzer = new ActionModeAnalyzer(document.getElementById("IRActionPESpectrum"), document.getElementById("IRActionActionSpectrum"));

	AMAnalyzer.set_depletion_div(document.getElementById("DepletionAllPeaks"));
	AMAnalyzer.set_growth_div(document.getElementById("GrowthAllPeaks"));
	AMAnalyzer.set_images_div(document.getElementById("IRActionSpectrumSelection"));
	AMAnalyzer.set_save_id_input(document.getElementById("IRActionSaveCounter"));

	/*****************************************************************************

								SPECTRA DISPLAYS

	*****************************************************************************/

	/****
			HTML Event Listeners
	****/

	document.getElementById("IRActionResizeLeft").onclick = function () {
		const display_section = document.getElementById("IRActionSpectrumDisplaySection");
		display_section.classList.remove("resized-right");
		display_section.classList.add("resized-left");
	};

	document.getElementById("IRActionResizeCenter").onclick = function () {
		const display_section = document.getElementById("IRActionSpectrumDisplaySection");
		display_section.classList.remove("resized-right");
		display_section.classList.remove("resized-left");
	};

	document.getElementById("IRActionResizeRight").onclick = function () {
		const display_section = document.getElementById("IRActionSpectrumDisplaySection");
		display_section.classList.add("resized-right");
		display_section.classList.remove("resized-left");
	};

	document.getElementById("IRActionPESResetZoom").onclick = function () {
		AMAnalyzer.reset_pes_zoom();
	};

	document.getElementById("IRActionChangeBasis").onclick = function () {
		let ebe_shown = AMAnalyzer.toggle_ebe_plot();
		if (ebe_shown) change_basis_button_to_R();
		else change_basis_button_to_eBE();
	};

	document.getElementById("IRActionActionResetZoom").onclick = function () {
		AMAnalyzer.reset_action_zoom();
	};

	document.getElementById("IRActionHideLines").onclick = function () {
		let lines_shown = AMAnalyzer.toggle_lines();
		if (lines_shown) change_lines_button_to_hide();
		else change_lines_button_to_show();
	};

	document.getElementById("IRActionNormalize").onclick = function () {
		let is_normalized = AMAnalyzer.toggle_normalize();
		if (is_normalized) change_normalize_button_to_unnormalize();
		else change_normalize_button_to_normalize();
	};

	/****
			Functions
	****/

	function change_basis_button_to_R() {
		const basis_button = document.getElementById("IRActionChangeBasis");
		basis_button.innerText = "Show R Plot";
	}

	function change_basis_button_to_eBE() {
		const basis_button = document.getElementById("IRActionChangeBasis");
		basis_button.innerText = "Show eBE Plot";
	}

	function change_lines_button_to_show() {
		const lines_button = document.getElementById("IRActionHideLines");
		lines_button.innerText = "Show Lines";
	}

	function change_lines_button_to_hide() {
		const lines_button = document.getElementById("IRActionHideLines");
		lines_button.innerText = "Hide Lines";
	}

	function change_normalize_button_to_normalize() {
		const normalize_button = document.getElementById("IRActionNormalize");
		normalize_button.innerText = "Normalize";
	}

	function change_normalize_button_to_unnormalize() {
		const normalize_button = document.getElementById("IRActionNormalize");
		normalize_button.innerText = "Unnormalize";
	}

	/*****************************************************************************

								PEAK SELECTION

	*****************************************************************************/

	/****
			HTML Event Listeners
	****/

	document.getElementById("DepletionAdd").onclick = function () {
		let Ri_input = document.getElementById("DepletionRi");
		let Rf_input = document.getElementById("DepletionRf");
		let Ri = parseFloat(Ri_input.value);
		let Rf = parseFloat(Rf_input.value);
		if (Ri > 0 && Rf > 0 && Ri !== Rf) {
			AMAnalyzer.add_depletion_peak(Ri, Rf);
			// Clear inputs
			Ri_input.value = "";
			Rf_input.value = "";
		} else {
			update_messenger.error("Invalid Depletion Options for Ri and Rf!");
		}
	};

	document.getElementById("ShowDepletion").onclick = function () {
		let is_shown = AMAnalyzer.toggle_depletion_peaks();
		if (is_shown) change_depletion_button_to_hide();
		else change_depletion_button_to_show();
	};

	document.getElementById("GrowthAdd").onclick = function () {
		let Ri_input = document.getElementById("GrowthRi");
		let Rf_input = document.getElementById("GrowthRf");
		let Ri = parseFloat(Ri_input.value);
		let Rf = parseFloat(Rf_input.value);
		if (Ri > 0 && Rf > 0 && Ri !== Rf) {
			AMAnalyzer.add_growth_peak(Ri, Rf);
			// Clear inputs
			Ri_input.value = "";
			Rf_input.value = "";
		} else {
			update_messenger.error("Invalid Growth Options for Ri and Rf!");
		}
	};

	document.getElementById("ShowGrowth").onclick = function () {
		let is_shown = AMAnalyzer.toggle_growth_peaks();
		if (is_shown) change_growth_button_to_hide();
		else change_growth_button_to_show();
	};

	/****
			Functions
	****/

	function change_depletion_button_to_show() {
		const depletion_button = document.getElementById("ShowDepletion");
		depletion_button.innerText = "Show Depletion";
	}

	function change_depletion_button_to_hide() {
		const depletion_button = document.getElementById("ShowDepletion");
		depletion_button.innerText = "Hide Depletion";
	}

	function change_growth_button_to_show() {
		const growth_button = document.getElementById("ShowGrowth");
		growth_button.innerText = "Show Growth";
	}

	function change_growth_button_to_hide() {
		const growth_button = document.getElementById("ShowGrowth");
		growth_button.innerText = "Hide Growth";
	}

	/*****************************************************************************

								SPECTRUM SELECTION

	*****************************************************************************/

	/****
			HTML Event Listeners
	****/

	document.getElementById("IRActionAutoCheck").oninput = function () {
		let is_checked = document.getElementById("IRActionAutoCheck").checked;
		ActionModeAnalyzer.auto_check = is_checked;
	};

	document.getElementById("IRActionSaveCounterDown").onclick = function () {
		AMAnalyzer.decrease_save_id();
	};

	document.getElementById("IRActionSaveCounterUp").onclick = function () {
		AMAnalyzer.increase_save_id();
	};

	document.getElementById("IRActionSaveActionSpectrum").onclick = function () {
		AMAnalyzer.save_spectrum();
	};

	document.getElementById("IRActionCalculate").onclick = function () {
		AMAnalyzer.calculate_spectrum();
	};
}

/*****************************************************************************

							PAGE LOADING

*****************************************************************************/

function IRAction_Load_Page(PageInfo) {
	const { Tabs } = require("./Libraries/Tabs.js");
	const { IRActionManagerMessenger } = require("./Libraries/IRActionManager");
	const IRAMMessenger = new IRActionManagerMessenger();

	// Show tab highlight if IR Action scan is being taken
	IRAMMessenger.listen.event.scan.start.on(() => {
		let tab = document.getElementById(Tabs.IRACTION.tab);
		if (tab) tab.classList.add("highlighted-tab");
	});
	// Remove tab highlight if IR Action scan is stopped or canceled
	IRAMMessenger.listen.event.scan.stop_or_cancel.on(() => {
		let tab = document.getElementById(Tabs.IRACTION.tab);
		if (tab) tab.classList.remove("highlighted-tab");
	});

	// Wrapping these in try/catch so that rest of program can still load
	//	even if somemodules are buggy
	try {
		IRAction_Scan_Control_and_Options();
	} catch (error) {
		console.log("Cannot load IR Action tab Scan Controls or Scan Options module:", error);
	}
	try {
		IRAction_Scan_Status();
	} catch (error) {
		console.log("Cannot load IR Action tab Scan Status module:", error);
	}
	try {
		IRAction_Accumulated_Image_Display(PageInfo);
	} catch (error) {
		console.log("Cannot load IR Action tab Accumulated Image Display module:", error);
	}
	try {
		IRAction_Counts();
	} catch (error) {
		console.log("Cannot load IR Action tab Electron/Frame Counts module:", error);
	}
	try {
		IRAction_Change_Pages();
	} catch (error) {
		console.log("Cannot load IR Action tab page up/down buttons:", error);
	}
	/*		Second Page		*/
	try {
		IRAction_Second_Page();
	} catch (error) {
		console.log("Cannot load IR Action tab Second Page:", error);
	}
}

/**
 * Functions to execute every time the IR-SEVI tab is loaded - should only be used by Tab Manager
 */
function IRAction_Load_Tab() {
	const { ImageType } = require("./Libraries/ImageClasses.js");

	function update_iraction_accumulated_image_display() {
		const image_display = document.getElementById("IRActionDisplay");
		const image_display_select = document.getElementById("IRActionImageDisplaySelect");
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

	update_iraction_accumulated_image_display();
}

/*****************************************************************************

							EXPORTING

*****************************************************************************/

module.exports = { IRAction_Load_Page, IRAction_Load_Tab };
