/*
	This is a list of all functions used in main window Renderer

	For some reason it's necessary to wrap .onclick and .oninput functions with function(){}
*/

/*****************************************************************************


							EVENT LISTENERS


*****************************************************************************/

// Startup
window.onload = function () {
	// Send message to main process that the window is ready
	ipc.send("main-window-ready", null);
	switch_tabs();
};

/*		Tabs		*/

document.getElementById("SeviMode").onclick = function () {
	// SEVI mode tab
	switch_tabs("SEVI");
};
document.getElementById("IRSeviMode").onclick = function () {
	// IR SEVI mode tab
	switch_tabs("IRSEVI");
};
document.getElementById("IRActionMode").onclick = function () {
	// IR Action mode tab
	switch_tabs("IRACTION");
};
document.getElementById("Settings").onclick = function () {
	// Settings tab
	switch_tabs("SETTINGS");
};

/*		Sevi and IR-Sevi Mode		*/

// Scan control buttons
document.getElementById("ScanStartSave").onclick = function () {
	sevi_start_save_button();
};
document.getElementById("ScanPauseResume").onclick = function () {
	sevi_pause_resume_button();
};
document.getElementById("ScanCancel").onclick = function () {
	sevi_cancel_button();
};
document.getElementById("ScanAutosave").onclick = function () {
	autosave_button();
};
document.getElementById("ScanReset").onclick = function () {
	sevi_scan_reset();
};
document.getElementById("ScanSingleShot").onclick = function () {
	single_shot_button();
};

// File naming buttons
document.getElementById("ImageCounterDown").onclick = function () {
	downtick_image_counter();
	//update_scan_id();
};
document.getElementById("ImageCounterUp").onclick = function () {
	uptick_image_counter();
	//update_scan_id();
};
document.getElementById("VMIMode").oninput = function () {
	vmi_mode_selection();
};

// Laser control buttons
document.getElementById("WavelengthMode").oninput = function () {
	detachment_mode_selection();
};
// Using input delay class to make sure function only executes if there is no input update for 1s
const detachment_wavelength_input_delay = new Input_delay(detachment_energy_input_fn);
document.getElementById("DetachmentWavelength").oninput = function () {
	detachment_wavelength_input_delay.start_timer();
};
document.getElementById("IRWavelengthMode").oninput = function () {
	excitation_mode_selection();
};
// Using input delay class to make sure function only executes if there is no input update for 1s
const excitation_wavelength_input_delay = new Input_delay(excitation_energy_input_fn);
document.getElementById("IRWavelength").oninput = function () {
	excitation_wavelength_input_delay.start_timer();
};
document.getElementById("DesiredEnergy").oninput = function () {
	desired_ir_energy_input();
};
document.getElementById("DesiredEnergyUnit").oninput = function () {
	desired_ir_energy_unit_input();
};
document.getElementById("MoveIRButton").onclick = function () {
	move_ir_button();
};
document.getElementById("MeasureDetachmentWavelength").onclick = function () {
	measure_laser_wavelengths();
};

// Electron Counters
// Using input delay class to make sure function only executes if there is no input update for 1s
const sevi_automatic_stop_input_delay = new Input_delay(sevi_automatic_stop_input);
document.getElementById("AutomaticStop").oninput = function () {
	sevi_automatic_stop_input_delay.start_timer();
};
document.getElementById("AutomaticStopUnit").oninput = function () {
	sevi_automatic_stop_selection();
};

// PE Spectrum control buttons
document.getElementById("SpectrumSwitch").oninput = function () {
	switch_pes_spectra();
};
document.getElementById("CalculateSpectrumButton").onclick = function () {
	run_melexir();
};
// Using input delay class to make sure function only executes if there is no input update for 1s
const spectrum_x_lower_input_delay = new Input_delay(change_spectrum_x_display_range);
document.getElementById("SpectrumXLower").oninput = function () {
	spectrum_x_lower_input_delay.start_timer();
};
// Using input delay class to make sure function only executes if there is no input update for 1s
const spectrum_x_upper_input_delay = new Input_delay(change_spectrum_x_display_range);
document.getElementById("SpectrumXUpper").oninput = function () {
	spectrum_x_upper_input_delay.start_timer();
};

// Page Up/Down buttons
document.getElementById("SeviPageDown").onclick = function () {
	switch_pages(1); // Switch to second page
	create_spectrum_plot(); // Create plot for PE Spectrum
};
document.getElementById("SeviPageUp").onclick = function () {
	switch_pages(0); // Switch to first page
};

/*		IR Action Mode		*/

if (document.getElementById("IRActionStartSave")) {
	document.getElementById("IRActionStartSave").onclick = function () {
		action_start_save_button();
	};
}
if (document.getElementById("IRActionPageDown")) {
	document.getElementById("IRActionPageDown").onclick = function () {
		switch_pages(1); // Switch to second page
		destroy_absorption_plot();
	};
}
if (document.getElementById("IRActionPageUp")) {
	document.getElementById("IRActionPageUp").onclick = function () {
		switch_pages(0); // Switch to first page
		create_absorption_plot(); // Create plot for Absorption profile
	};
}

/*		Settings		*/

document.getElementById("SaveSettingsButton").onclick = function () {
	// Save settings button
	SaveSettings();
};

/*****************************************************************************


						FUNCTIONS FOR EVENT LISTENERS


*****************************************************************************/

/*		Startup		*/

/**
 * Application startup procedure
 */
function startup() {
	// Go to Sevi Mode tab
	switch_tabs("SEVI");

	// Start wavemeter application
	wavemeter.startApplication();

	// Update Autosave button On/Off text
	update_autosave_button_text();

	// Generate image file names and display
	scan.saving.get_file_names();
	scan.previous.read();
	display_file_names();

	Images.reset();

	// Set up Mac wavemeter simulation function
	initialize_mac_fn();
	// Get OPO wavelength
	setTimeout(() => {
		opo.get_wavelength();
	}, 1000);

	disable_action_mode_buttons();

	ipc.send("main-window-loaded", null);

	// Start messenger display loop
	messenger.display_loop();
}

/*		Tabs		*/

/**
 * Depress all of the buttons (to behave like a radio button) and then activate the tab 'tab'
 * @param {string} tab - Should be tab in Tab_List (e.g. 'SEVI', 'IRSEVI')
 */
function switch_tabs(tab) {
	// Depress the current tab and hide content
	let current_tab = document.getElementById(page_info.current_tab);
	let current_page = document.getElementById(page_info.current_page);
	if (current_tab) current_tab.classList.remove("pressed-tab");
	if (current_page) current_page.style.display = "none";

	// Make sure the tab argument passed is an integer corresponding to a real tab
	if (!Tab_List[tab] || !Content_List[tab]) {
		return;
	}

	// Store the current tab info
	page_info.current_tab = Tab_List[tab];
	page_info.current_page = Content_List[tab];

	// Activate selected tab and show content
	let new_tab = document.getElementById(Tab_List[tab]);
	let new_page = document.getElementById(Content_List[tab]);
	if (new_tab) new_tab.classList.add("pressed-tab");
	if (new_page) {
		new_page.style.display = "grid";
		// If chosen tab is Sevi or IR-Sevi mode, we have to do a bit more
		// since IR-SEVI is just Sevi with a few more elements shown
		if (tab === "SEVI") {
			new_page.classList.remove("ir-sevi-mode");
			new_page.classList.add("sevi-mode");
		} else if (tab === "IRSEVI") {
			new_page.classList.remove("sevi-mode");
			new_page.classList.add("ir-sevi-mode");
		}
	}

	// If moving to IR Action tab, create Absorption chart, otherwise destroy it if it exists
	if (tab === "IRACTION") {
		create_absorption_plot();
		// Connect to OPO
		opo.network.connect();
	} else {
		destroy_absorption_plot();
	}

	// Lastly, make sure we switch to the first page (if there are two)
	switch_pages(0);
}

/**
 * Switch between first and second page
 * @param {int} page_index - 0 to switch to first page, 1 to switch to second
 */
function switch_pages(page_index) {
	let page_prefix;
	if (page_info.current_tab === Tab_List.SEVI || page_info.current_tab === Tab_List.IRSEVI) {
		page_prefix = "Sevi";
	} else if (page_info.current_tab === Tab_List.IRACTION) {
		page_prefix = "IRAction";
	} else {
		// Currently on a tab without pages, just return
		// Note: need to add another "else if" if you add another tab with two pages
		return;
	}

	const first_page = document.getElementById(page_prefix + "FirstPage");
	const second_page = document.getElementById(page_prefix + "SecondPage");

	if (page_index === 0 && first_page && second_page) {
		// Display first page
		first_page.style.display = "grid";
		second_page.style.display = "none";

		// PE Spectrum is on second page, and needs to be destroyed if moving to first page
		//	(if it exists)
		destroy_spectrum_plot();
	} else if (page_index === 1 && first_page && second_page) {
		// Display second page
		first_page.style.display = "none";
		second_page.style.display = "grid";
	}
}

/*****************************************************************************

							SEVI/IR-SEVI MODES

*****************************************************************************/

/**
 * Functionality for SEVI/IR-SEVI Mode Start/Save button
 */
function sevi_start_save_button() {
	// Check whether a scan is running
	if (Images.current) {
		// Scan is running, stop scan and save
		stop_sevi_scan(true); // 'true' argument means image will be saved to file
		// Update button text
		change_sevi_start_button_to_start();
		change_sevi_pause_button_to_resume();
		// If scan was paused while saved, update pause status
		remove_pause_screen_overlay(); // Remove gray-out display
		// Update display again to get rid of pause icon
		update_accumulated_image_display(true);
		// Increase image ID counter
		uptick_image_counter();
		// Run Melexir
		run_melexir();
	} else {
		// Scan was not running, start new scan
		start_sevi_scan();
		// Update button text
		change_sevi_start_button_to_save();
		change_sevi_pause_button_to_pause();
	}
	update_file_name_display();
}

/**
 * Start a SEVI or IR-SEVI scan
 */
function start_sevi_scan() {
	// Reset counters, accumulated image, and autosave timer
	//electrons.total.reset();
	scan.accumulated_image.reset();
	scan.saving.start_timer();
	// Save image ID for scan
	////update_scan_id();
	//update_pes_id();
	// Update scan running status
	scan.status.running = true;
	scan.status.paused = false;

	const image_counter = document.getElementById("ImageCounter");
	let image_id = parseInt(image_counter.value);
	if (page_info.current_tab === Tab_List.SEVI) {
		Spectra.new(image_id, Scanning_Mode.SEVI);
		Images.new(image_id, Scanning_Mode.SEVI);
		// Add message that scan was started
		messenger.add("SEVI scan started!");
	} else {
		Spectra.new(image_id, Scanning_Mode.IRSEVI);
		Images.new(image_id, Scanning_Mode.IRSEVI);
		// Add message that scan was started
		messenger.add("IR-SEVI scan started!");
	}

	Images.reset();
}

/**
 * Stop SEVI or IR-SEVI scan
 * @param {bool} save_image - Whether to save image to file
 */
function stop_sevi_scan(save_image) {
	// Update scan running status
	scan.status.running = false;
	scan.status.paused = false;
	/*// Save image to file (if selected)
	if (save_image) {
		scan.previous.add_scan();
		scan.accumulated_image.save();
		// Add message that scan was saved
		messenger.add("(IR)SEVI scan saved!");
	} else {
		// Add message that scan was canceled
		messenger.add("(IR)SEVI scan canceled!");
	}*/

	// Move "current" image & spectrum to "latest" position
	Images.update_latest(Images.current);
	Images.clear_current();
	Spectra.update_latest(Spectra.current);
	Spectra.clear_current();
	// Save image to file (if selected)
	if (save_image) {
		Images.save();
	}
}

/**
 * Change SEVI Mode Start button text to say Start
 */
function change_sevi_start_button_to_start() {
	const start_button_text = document.getElementById("ScanStartSaveText");
	if (start_button_text) start_button_text.innerText = "Start";
}

/**
 * Change SEVI Mode Start button text to say Save
 */
function change_sevi_start_button_to_save() {
	const start_button_text = document.getElementById("ScanStartSaveText");
	if (start_button_text) start_button_text.innerText = "Save";
}

function sevi_pause_resume_button() {
	if (Images.current) {
		// Scan is currently being taken
		if (Images.current.paused) {
			// Current scan is paused, resume scan
			Images.current.paused = false;
			// Update button text and remove pause overlay
			change_sevi_pause_button_to_pause();
			remove_pause_screen_overlay();
			// Add message that scan was resumed
			messenger.add("(IR)SEVI scan resumed!");
		} else {
			// Pause current scan
			Images.current.paused = true;
			// Update button text and add pause overlay
			change_sevi_pause_button_to_resume();
			add_pause_screen_overlay();
			// Add message that scan was paused
			messenger.add("(IR)SEVI scan paused!");
		}
	} else {
		// Check if there was an image previously taken
		if (Images.latest) {
			// Update button text
			change_sevi_start_button_to_save();
			change_sevi_pause_button_to_pause();
			// Start autosave timer
			scan.saving.start_timer(); // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!! Change
			// Move "latest" to "current"
			Images.current = Images.latest;
			display_file_names();
			// Add message that scan was resumed
			messenger.add("Previous (IR)SEVI scan resumed!");
		}
	}
}

/**
 * Change SEVI Mode Pause button text to say Pause
 */
function change_sevi_pause_button_to_pause() {
	const pause_button_text = document.getElementById("ScanPauseResumeText");
	if (pause_button_text) pause_button_text.innerText = "Pause";
}

/**
 * Change SEVI Mode Pause button text to say Resume
 */
function change_sevi_pause_button_to_resume() {
	const pause_button_text = document.getElementById("ScanPauseResumeText");
	if (pause_button_text) pause_button_text.innerText = "Resume";
}

/**
 * Gray out display to show scan is paused
 */
function add_pause_screen_overlay() {
	const sevi_content = document.getElementById("SeviModeContent");
	// Gray out sections
	if (sevi_content) sevi_content.classList.add("paused");
	// Add pause icon on accumulated image display
	draw_pause_icon();
}

/**
 * Remove pause screen display
 */
function remove_pause_screen_overlay() {
	const sevi_content = document.getElementById("SeviModeContent");
	if (sevi_content) sevi_content.classList.remove("paused");
}

/**
 * Draw a pause icon on the accumulated image display
 */
function draw_pause_icon() {
	const image_display = document.getElementById("Display");
	const ctx = image_display.getContext("2d");

	if (!image_display || !ctx) {
		return;
	}

	const canvas_center = { x: 1000, y: 1000 };

	// Dimensions of rectangle for each side of pause sign
	let box_height = 800;
	let box_width = 200;
	let box_shift = 150; // Shift left/right of center

	ctx.fillStyle = "gray";

	// There's probably a cleaner way to do this using loops but idgaf
	// Left side of pause icon
	// First draw a rectangle, then add half circles at top at bottom
	ctx.moveTo(canvas_center.x - (box_width + box_shift), canvas_center.y - box_height / 2); // Move to upper left corner
	ctx.lineTo(canvas_center.x - box_shift, canvas_center.y - box_height / 2); // Draw line to upper right corner
	ctx.lineTo(canvas_center.x - box_shift, canvas_center.y + box_height / 2); // Draw line to lower right corner
	ctx.lineTo(canvas_center.x - (box_width + box_shift), canvas_center.y + box_height / 2); // Draw line to lower left corner
	ctx.lineTo(canvas_center.x - (box_width + box_shift), canvas_center.y - box_height / 2); // Draw line to upper left corner
	ctx.arc(canvas_center.x - (box_width / 2 + box_shift), canvas_center.y - box_height / 2, box_width / 2, Math.PI, 0); // Draw half circle above rectangle
	ctx.arc(canvas_center.x - (box_width / 2 + box_shift), canvas_center.y + box_height / 2, box_width / 2, 0, Math.PI); // Draw half circle below rectangle
	// Right side of pause icon
	ctx.moveTo(canvas_center.x + box_shift, canvas_center.y - box_height / 2); // Move to upper left corner
	ctx.lineTo(canvas_center.x + box_width + box_shift, canvas_center.y - box_height / 2); // Draw line to upper right corner
	ctx.lineTo(canvas_center.x + box_width + box_shift, canvas_center.y + box_height / 2); // Draw line to lower right corner
	ctx.lineTo(canvas_center.x + box_shift, canvas_center.y + box_height / 2); // Draw line to lower left corner
	ctx.lineTo(canvas_center.x + box_shift, canvas_center.y - box_height / 2); // Draw line to upper left corner
	ctx.arc(canvas_center.x + box_width / 2 + box_shift, canvas_center.y - box_height / 2, box_width / 2, Math.PI, 0); // Draw half circle above rectangle
	ctx.arc(canvas_center.x + box_width / 2 + box_shift, canvas_center.y + box_height / 2, box_width / 2, 0, Math.PI); // Draw half circle below rectangle
	ctx.fill(); // Fill in shapes with color
}

/**
 * Cancel SEVI scan
 */
function sevi_cancel_button() {
	// If a scan isn't running, do nothing
	if (!Images.current) {
		return;
	}
	// If the scan was paused, remove pause overlay
	remove_pause_screen_overlay();
	update_accumulated_image_display(true); // Get rid of pause icon
	// Stop scan
	stop_sevi_scan();
	// Update button text
	change_sevi_start_button_to_start();
	change_sevi_pause_button_to_resume();
	update_file_name_display();
}

/**
 * Toggle to autosave images
 */
function autosave_button() {
	// Toggle autosaving status in scan info
	scan.saving.autosave = !scan.saving.autosave;
	// Start autosave timer (if taking scan)
	scan.saving.start_timer();
	// Update button text
	update_autosave_button_text();
}

/**
 * Update text for autosave button to match scan saving status
 */
function update_autosave_button_text() {
	const autosave_on_off_text = document.getElementById("ScanAutosaveStatusText");
	if (autosave_on_off_text) {
		if (scan.saving.autosave) {
			// Autosaving is now turned on
			autosave_on_off_text.innerText = "On";
		} else {
			// Autosaving is now turned off
			autosave_on_off_text.innerText = "Off";
		}
	}
}

/**
 * Reset accumulated image and electron counters
 */
function sevi_scan_reset() {
	electrons.total.reset();
	scan.accumulated_image.reset();

	Images.reset();
	// Add message that scan was reset
	messenger.add("(IR)SEVI scan reset!");
}

/**
 * Save the next camera frame (and centroids) to file
 */
function single_shot_button() {
	scan.single_shot.saving.to_save = true;
	// Disable button for 0.5s to make it clear it saved
	disable_single_shot_button(true);
	setTimeout(() => {
		disable_single_shot_button(false);
	}, 500 /* ms */);
}

/**
 * Disable or enable single shot button
 * @param {bool} to_disable - whether to disable (true) or enable (false) button
 */
function disable_single_shot_button(to_disable) {
	const single_shot_button = document.getElementById("ScanSingleShot");
	single_shot_button.disabled = to_disable;
}

/**
 * If a scan is running, only show the file names that will be saved even when switching tabs (SEVI and IR-SEVI only)
 * (i.e. if SEVI scan is being taken, only show one file name while on IR-SEVI tab)
 */
function update_file_name_display() {
	const ir_on_file = document.getElementById("CurrentImageFileIR");
	if (Images.current) {
		if (Images.current.scanning_mode === Scanning_Mode.SEVI) {
			ir_on_file.classList.add("do-not-show-file");
		} else if (Images.current.scanning_mode === Scanning_Mode.IRSEVI) {
			ir_on_file.classList.add("always-show-file");
		}
	} else {
		ir_on_file.classList.remove("do-not-show-file");
		ir_on_file.classList.remove("always-show-file");
	}
}

/**
 * Display the image file names for ir_off and ir_on
 */
function display_file_names() {
	const ir_off_file = document.getElementById("CurrentImageFile");
	const ir_on_file = document.getElementById("CurrentImageFileIR");
	const image_counter = document.getElementById("ImageCounter");
	// If there is a current image, use that file name
	if (Images.current) {
		ir_off_file.value = Images.current.file_name;
		ir_on_file.value = Images.current.ir_file_name;
		image_counter.value = Images.current.id;
	} else {
		// Generate file name using Image Counter value as ID
		const image_counter = document.getElementById("ImageCounter");
		let image_id = parseInt(image_counter.value);
		ir_off_file.value = Image.file_name(image_id);
		ir_on_file.value = Image.ir_file_name(image_id);
	}
}

/**
 * Increment the image counter by one
 */
function uptick_image_counter() {
	const image_counter = document.getElementById("ImageCounter");
	let current_counter_val = parseInt(image_counter.value);
	current_counter_val++;
	image_counter.value = current_counter_val;
	// Update file names
	display_file_names();
}

/**
 * Decrement the image counter by one
 */
function downtick_image_counter() {
	const image_counter = document.getElementById("ImageCounter");
	let current_counter_val = parseInt(image_counter.value);
	if (current_counter_val === 1) {
		// Don't lower below 1
		return;
	}
	current_counter_val--;
	image_counter.value = current_counter_val;
	// Update file names
	display_file_names();
}

/**
 * Update the ID used for PE Spectrum display
 */
function update_pes_id() {
	const image_counter = document.getElementById("ImageCounter");
	let image_id = parseInt(image_counter.value);
	if (scan.status.running) {
		scan.accumulated_image.spectra.params.image_id = image_id;
	} else {
		scan.accumulated_image.spectra.params.image_id = image_id - 1;
	}
}

/**
 * Update the selected VMI mode in vmi_info
 */
function vmi_mode_selection() {
	const vmi_mode = document.getElementById("VMIMode");
	// The VMI modes are [V1, V2, V3, V4], which is one above the selected index value
	vmi_setting = "V" + (vmi_mode.selectedIndex + 1);
	vmi_info.selected_setting = vmi_setting;
}

/**
 * Update detachment laser wavelengths based on user input
 */
function detachment_energy_input_fn() {
	const wavelength_input = document.getElementById("DetachmentWavelength");
	let input_wl;
	// Get wavelength as number and round to 3 decimal places
	if (wavelength_input.value) {
		input_wl = decimal_round(parseFloat(wavelength_input.value), 3);
	} else {
		input_wl = 0;
	}
	// Save in laser object and get conversions
	laser.detachment.wavelength.input = input_wl;
	laser.detachment.convert();
	// Display appropriate wavelength
	display_detachment_energies();
}

/**
 * Update detachment laser setup mode based on selection
 */
function detachment_mode_selection() {
	const detachment_mode = document.getElementById("WavelengthMode");
	switch (detachment_mode.selectedIndex) {
		case 0:
			// Standard mode
			laser.detachment.mode = "standard";
			break;
		case 1:
			// Doubled mode
			laser.detachment.mode = "doubled";
			break;
		case 2:
			// Raman shifter mode
			laser.detachment.mode = "raman";
			break;
		case 3:
			// IR-DFG mode
			laser.detachment.mode = "irdfg";
			break;
		default:
			// Use standard mode as default
			laser.detachment.mode = "standard";
			break;
	}
	// Update displays
	display_detachment_energies();
}

/**
 * Update displays for detachment energies based on chosen setup
 */
function display_detachment_energies() {
	const converted_wavelength = document.getElementById("ConvertedWavelength");
	const converted_wavenumber = document.getElementById("DetachmentWavenumber");
	// Display selected mode's converted values
	if (laser.detachment.wavelength[laser.detachment.mode] !== 0) {
		converted_wavelength.value = laser.detachment.wavelength[laser.detachment.mode].toFixed(3);
		converted_wavenumber.value = laser.detachment.wavenumber[laser.detachment.mode].toFixed(3);
		// If standard mode was chosen, shouldn't show converted wavelength
		if (laser.detachment.mode === "standard") {
			converted_wavelength.value = "";
		}
	} else {
		converted_wavelength.value = "";
		converted_wavenumber.value = "";
	}
}

/**
 * Update excitation laser wavelengths based on user input
 */
function excitation_energy_input_fn() {
	const wavelength_input = document.getElementById("IRWavelength");
	// Get wavelength as number and round to 3 decimal places
	let input_wl = decimal_round(parseFloat(wavelength_input.value), 3);
	if (isNaN(input_wl)) {
		input_wl = 0;
	}
	// Save in laser object and get conversions
	laser.excitation.wavelength.input = input_wl;
	laser.excitation.convert();
	// Display appropriate wavelength
	display_excitation_energies();
}

/**
 * Update excitation laser setup mode based on selection
 */
function excitation_mode_selection() {
	const excitation_mode = document.getElementById("IRWavelengthMode");
	switch (excitation_mode.selectedIndex) {
		case 0:
			// nIR mode
			laser.excitation.mode = "nir";
			break;
		case 1:
			// iIR mode
			laser.excitation.mode = "iir";
			break;
		case 2:
			// mIR mode
			laser.excitation.mode = "mir";
			break;
		case 3:
			// fIR mode
			laser.excitation.mode = "fir";
			break;
		default:
			// Use nIR mode as default
			laser.excitation.mode = "nir";
			break;
	}
	// Update displays
	display_excitation_energies();
}

/**
 * Update displays for excitation energies based on chosen setup
 */
function display_excitation_energies() {
	const converted_wavelength = document.getElementById("IRConvertedWavelength");
	const converted_wavenumber = document.getElementById("IRWavenumber");
	// Display selected mode's converted values
	if (laser.excitation.wavelength[laser.excitation.mode] !== 0) {
		converted_wavelength.value = laser.excitation.wavelength[laser.excitation.mode].toFixed(3);
		converted_wavenumber.value = laser.excitation.wavenumber[laser.excitation.mode].toFixed(3);
		// If nIR mode was chosen, shouldn't show converted wavelength
		if (laser.excitation.mode === "nir") {
			converted_wavelength.value = "";
		}
	} else {
		converted_wavelength.value = "";
		converted_wavenumber.value = "";
	}
}

/**
 * IR Energy input for moving OPO IR energy
 */
function desired_ir_energy_input() {
	// Energy unit function does necessary calculations for us
	// 	just need to tell it to use user input
	desired_ir_energy_unit_input(true);
}

/**
 * IR Energy Unit input for moving OPO IR energy
 */
function desired_ir_energy_unit_input(use_user_input) {
	const ir_energy = document.getElementById("DesiredEnergy");
	const ir_energy_unit = document.getElementById("DesiredEnergyUnit");

	let input_value = decimal_round(parseFloat(ir_energy.value), 3);
	// Make sure input value is real, positive number
	if (input_value <= 0 || isNaN(input_value)) {
		use_user_input = false;
	}

	switch (ir_energy_unit.selectedIndex) {
		case 0:
			// cm-1
			if (use_user_input) {
				// Update stored desired IR value using input value
				laser.excitation.control.desired_ir = input_value;
			} else {
				// Update display using stored IR value
				ir_energy.value = laser.excitation.control.desired_ir;
			}
			break;
		case 1:
			// um
			if (use_user_input) {
				// First, convert to cm-1
				input_value = decimal_round(Math.pow(10, 4) / input_value, 3);
				// Update stored desired IR value using input value
				laser.excitation.control.desired_ir = input_value;
			} else {
				// Update display using stored IR value after converting to um
				ir_energy.value = decimal_round(Math.pow(10, 4) / laser.excitation.control.desired_ir, 3);
			}
			break;
		case 2:
			// nm
			if (use_user_input) {
				// First, convert to cm-1
				input_value = decimal_round(Math.pow(10, 7) / input_value, 3);
				// Update stored desired IR value using input value
				laser.excitation.control.desired_ir = input_value;
			} else {
				// Update display using stored IR value after converting to nm
				ir_energy.value = decimal_round(Math.pow(10, 7) / laser.excitation.control.desired_ir, 3);
			}
			break;
	}
}

/**
 * Move OPO to desired IR energy
 */
async function move_ir_button() {
	const ir_button = document.getElementById("MoveIRButton");
	const ir_input = document.getElementById("IRWavelength");
	const ir_mode = document.getElementById("IRWavelengthMode");
	let measured_energies;
	let nir_wl;
	// Make sure there is a stored IR value to go to
	if (laser.excitation.control.desired_ir <= 0) {
		return;
	}
	// Connect to the OPO
	opo.network.connect();
	// Disable IR button so it can't be reclicked
	ir_button.disabled = true;
	// Move to IR
	measured_energies = await move_to_ir(laser.excitation.control.desired_ir);
	// Update displayed IR values
	nir_wl = decimal_round(measured_energies.nir.wavelength, 3);
	laser.excitation.wavelength.input = nir_wl;
	laser.excitation.convert();
	ir_input.value = nir_wl;
	switch (measured_energies.desired_mode) {
		case "nir":
			ir_mode.selectedIndex = 0;
			break;
		case "iir":
			ir_mode.selectedIndex = 1;
			break;
		case "mir":
			ir_mode.selectedIndex = 2;
			break;
		case "fir":
			ir_mode.selectedIndex = 3;
			break;
	}
	excitation_mode_selection();
	// Re-enable IR button
	ir_button.disabled = false;
}

/**
 * Measure wavelengths of detachment and IR laser
 * 	(Currently only measures IR)
 */
async function measure_laser_wavelengths() {
	const measure_button = document.getElementById("MeasureDetachmentWavelength");
	const ir_input = document.getElementById("IRWavelength");
	// Disable button
	measure_button.disabled = true;
	// Measure wavelength
	let measured_wl = await measure_wavelength();
	if (measured_wl) {
		measured_wl = decimal_round(measured_wl, 3);
		ir_input.value = measured_wl;
		laser.excitation.wavelength.input = measured_wl;
		laser.excitation.convert();
		excitation_mode_selection();
	} else {
		console.log("Could not measure wavelengths");
	}
	// Re-enable button
	measure_button.disabled = false;
}

/**
 * Update the accumulated image display
 * @param {bool} override - if true, update display regardless of scan status
 * */
function update_accumulated_image_display(override) {
	if (!override) {
		// First check if a scan is currently being taken
		if (Images.current && Images.current.paused) {
			// Don't update the images
			return;
		}
	}
	// Make sure settings have been updated
	if (!settings || !settings.centroid) {
		return;
	}
	const image_select = document.getElementById("ImageDisplaySelect");
	const image_display = document.getElementById("Display");
	const ctx = image_display.getContext("2d");
	const display_slider_value = parseFloat(document.getElementById("DisplaySlider").value);
	let image_size = settings.centroid.bin_size;
	let image_data = new ImageData(image_size, image_size);
	let displayed_image;
	let image_pixel;
	let display_positive = true; // If false, display only negative values (for difference image)

	// Clear the current image
	ctx.clearRect(0, 0, image_display.width, image_display.height);

	if (page_info.current_tab === Tab_List.SEVI) {
		// On Sevi Mode tab, display ir_off + ir_on
		for (let Y = 0; Y < image_size; Y++) {
			for (let X = 0; X < image_size; X++) {
				image_pixel = Images.images.ir_off[Y][X];
				image_pixel += Images.images.ir_on[Y][X];
				// If the pixel is zero we can just skip it
				if (image_pixel === 0) {
					continue;
				}
				// Adjust for contrast
				image_pixel = 255 * image_pixel * display_slider_value;
				// If image_pixel is oversaturated, set to 255
				if (image_pixel > 255) {
					image_pixel = 255;
				}
				// Want to make pixels white -> RGBA = [255, 255, 255, 255] (at full contrast)
				for (let i = 0; i < 4; i++) {
					image_data.data[4 * (image_size * Y + X) + i] = image_pixel;
				}
			}
		}
	} else if (page_info.current_tab === Tab_List.IRSEVI) {
		// On IR-Sevi tab, display selected image
		switch (image_select.selectedIndex) {
			case 0:
				// IR Off
				displayed_image = Images.images.ir_off;
				break;
			case 1:
				// IR On
				displayed_image = Images.images.ir_on;
				break;
			case 2:
				// Difference positive (need to calculate difference first)
				displayed_image = Images.images.difference;
				break;
			case 3:
				// Difference negative (need to calculate difference first)
				display_positive = false;
				displayed_image = Images.images.difference;
				break;
			default:
				// Just display IR Off
				displayed_image = Images.images.ir_off;
				break;
		}
		for (let Y = 0; Y < image_size; Y++) {
			for (let X = 0; X < image_size; X++) {
				image_pixel = displayed_image[Y][X];
				// If the pixel is zero we can just skip it
				if (image_pixel === 0) {
					continue;
				}
				// For difference image, figure out if positive or negative values should be shown
				if (display_positive) {
					// Only display positive differences
					if (image_pixel < 0) {
						image_pixel = 0;
					}
				} else {
					// Only display negative differences
					image_pixel = -image_pixel; // Invert values
					if (image_pixel < 0) {
						image_pixel = 0;
					}
				}
				// Adjust for contrast
				image_pixel = 255 * image_pixel * display_slider_value;
				// If image_pixel is oversaturated, set to 255
				if (image_pixel > 255) {
					image_pixel = 255;
				}
				// Want to make pixels white -> RGBA = [255, 255, 255, 255] (at full contrast)
				for (let i = 0; i < 4; i++) {
					image_data.data[4 * (image_size * Y + X) + i] = image_pixel;
				}
			}
		}
	}
	// Put image_data on the display
	// Have to do this bullshit so that the image is resized to fill the display correctly
	// (turning the ImageData object into a BMP image and then using drawImage to put it on the canvas)
	createImageBitmap(image_data).then(function (bitmap_img) {
		ctx.drawImage(bitmap_img, 0, 0, image_size, image_size, 0, 0, image_display.width, image_display.height);
	});
}

/**
 * Update electron counter displays
 */
function update_counter_displays() {
	const total_frames = document.getElementById("TotalFrames");
	const total_frames_ir = document.getElementById("TotalFramesIROn");
	const total_e_count = document.getElementById("TotalECount");
	const total_e_count_ir = document.getElementById("TotalECountIROn");
	const avg_e_count = document.getElementById("AvgECount");
	const avg_e_count_ir = document.getElementById("AvgECountIROn");

	let avg_off = electrons.average.mode.ir_off_value;
	let avg_on = electrons.average.mode.ir_on_value;
	let off_length = electrons.average.mode.ir_off.length;
	let on_length = electrons.average.mode.ir_on.length;

	// If on Sevi mode tab, total values = ir_off + ir_on
	if (page_info.current_tab === Tab_List.SEVI) {
		if (Images.current) {
			total_e_count.value = Images.current.get_electrons(Count_Type.TOTAL);
			total_frames.value = Images.current.get_frames(Count_Type.TOTAL, true);
		} else if (Images.latest) {
			// No current image to display values for, display latest instead
			total_e_count.value = Images.latest.get_electrons(Count_Type.TOTAL);
			total_frames.value = Images.latest.get_frames(Count_Type.TOTAL, true);
		}
		avg_e_count.value = ((off_length * avg_off + on_length * avg_on) / (off_length + on_length)).toFixed(2);
	} else {
		if (Images.current) {
			total_e_count.value = Images.current.get_electrons(Count_Type.OFF);
			total_e_count_ir.value = Images.current.get_electrons(Count_Type.ON);
			total_frames.value = Images.current.get_frames(Count_Type.OFF, true);
			total_frames_ir.value = Images.current.get_frames(Count_Type.ON, true);
		} else if (Images.latest) {
			// No current image to display values for, display latest instead
			total_e_count.value = Images.latest.get_electrons(Count_Type.OFF);
			total_e_count_ir.value = Images.latest.get_electrons(Count_Type.ON);
			total_frames.value = Images.latest.get_frames(Count_Type.OFF, true);
			total_frames_ir.value = Images.latest.get_frames(Count_Type.ON, true);
		}
		avg_e_count.value = avg_off.toFixed(2);
		avg_e_count_ir.value = avg_on.toFixed(2);
	}
}

/**
 * Input value for automatic image stopping/saving
 */
function sevi_automatic_stop_input() {
	// Don't update values if an action scan is taking place
	if (scan.action_mode.status.running) {
		return;
	}
	const auto_stop = document.getElementById("AutomaticStop");
	let value = parseFloat(auto_stop.value);
	//electrons.total.autostop.update(value);
	Images.update_autostop(value);
}

/**
 * Selection of unit (None, Frames, Electrons) for automatic image stopping/saving
 */
function sevi_automatic_stop_selection() {
	// Don't update values if an action scan is taking place
	if (scan.action_mode.status.running) {
		return;
	}
	const auto_stop = document.getElementById("AutomaticStop");
	const auto_stop_unit = document.getElementById("AutomaticStopUnit");
	switch (auto_stop_unit.selectedIndex) {
		case 0:
			// None
			Images.autostop.type = Autostop.NONE;
			auto_stop.value = "";
			break;
		case 1:
			// Electrons (x1e5)
			Images.autostop.type = Autostop.ELECTRONS;
			auto_stop.value = Images.autostop.electrons || "";
			break;
		case 2:
			// Frames (x1000)
			Images.autostop.type = Autostop.FRAMES;
			auto_stop.value = Images.autostop.frames || "";
			break;
		default:
			// None
			Images.autostop.type = Autostop.NONE;
			auto_stop.value = "";
			break;
	}
}

/**
 *  Create chart to plot PE Spectrum
 */
function create_spectrum_plot() {
	const spectrum_display_ctx = document.getElementById("PESpectrum").getContext("2d");
	spectrum_display = new Chart(spectrum_display_ctx, spectrum_config);
	process_melexir_results();
}

/**
 * Destroy PE Spectrum chart
 */
function destroy_spectrum_plot() {
	if (spectrum_display) {
		spectrum_display.destroy();
		spectrum_display = null;
	}
}

/**
 * Switch PES display between IR on/off and difference spectra
 */
function switch_pes_spectra() {
	const spectrum_switch = document.getElementById("SpectrumSwitch");
	if (spectrum_switch.selectedIndex === 0) {
		// Display IR on/off
		scan.accumulated_image.spectra.params.show_difference = false;
	} else {
		// Display difference
		scan.accumulated_image.spectra.params.show_difference = true;
	}
	// Update the display
	chart_spectrum_results();
}

/**
 * Run MELEXIR in a Web Worker
 */
function run_melexir() {
	// If the worker was already created, it must still be running, so just return
	if (melexir_worker) {
		return;
	}
	// If there are no accumulated images made, return
	if (scan.accumulated_image.images.ir_off.length === 0) {
		return;
	}
	//melexir_worker = new Worker("../JS/worker.js");
	melexir_worker = new Worker(path.join("..", "JS", "worker.js"));
	// Disable calculate button
	disable_pes_calculate_button();
	// Prepare data to send
	let sent_data = {
		ir_off: scan.accumulated_image.images.ir_off,
		ir_on: scan.accumulated_image.images.ir_on,
		method: scan.status.method,
	};
	// Send message to worker
	melexir_worker.postMessage(sent_data);
	// Store results
	melexir_worker.onmessage = function (event) {
		let returned_results = event.data;
		// Reset PE Spectra data
		scan.accumulated_image.spectra.reset();
		// Update PE Spectra values
		scan.accumulated_image.spectra.data.radial_values = returned_results.ir_off.spectrum[0];
		scan.accumulated_image.spectra.data.ir_off_intensity = returned_results.ir_off.spectrum[1];
		scan.accumulated_image.spectra.data.ir_off_anisotropy = returned_results.ir_off.spectrum[2];
		scan.accumulated_image.spectra.data.ir_on_intensity = returned_results.ir_on.spectrum[1];
		scan.accumulated_image.spectra.data.ir_on_anisotropy = returned_results.ir_on.spectrum[2];
		// Save results to file
		scan.accumulated_image.spectra.save();
		update_pes_id();
		// Process the results
		process_melexir_results();
		// Terminate worker
		melexir_worker.terminate();
		melexir_worker = null;
		// Re-enable calculate button
		enable_pes_calculate_button();
	};
}

/**
 * Process the PES results from Melexir
 */
function process_melexir_results() {
	// Figure out if eBE should be calculated (i.e. if detachment energy and vmi info is given)
	determine_ebe_calculation();
	// Scale by Jacobian and normalize
	scale_and_normalize_pes();
	// Calculate eBE
	convert_r_to_ebe();
	// Calculate extrema of horizontal axis
	scan.accumulated_image.spectra.extrema.calculate();
	// Display results on spectrum
	chart_spectrum_results();
}

/**
 * Disable PES calculate button while Melexir is running
 */
function disable_pes_calculate_button() {
	const calculate_button = document.getElementById("CalculateSpectrumButton");
	calculate_button.innerText = "Calculating...";
	calculate_button.disabled = true;
}

/**
 * Enable PES calculate button
 */
function enable_pes_calculate_button() {
	const calculate_button = document.getElementById("CalculateSpectrumButton");
	calculate_button.innerText = "Calculate";
	calculate_button.disabled = false;
}

/**
 * Determine whether eBE should be used for PE spectrum or just radial plot
 */
function determine_ebe_calculation() {
	// Check if detachment wavelength is given
	if (laser.detachment.wavelength[laser.detachment.mode] === 0) {
		// No measured wavelength, just use radial plot
		scan.accumulated_image.spectra.params.use_ebe = false;
		return;
	}
	// Make sure VMI calibration constants aren't zero
	if (vmi_info.calibration_constants[vmi_info.selected_setting].a === 0) {
		// Just use radial plot
		scan.accumulated_image.spectra.params.use_ebe = false;
		return;
	}
	// Tell functions to use eBE plot
	scan.accumulated_image.spectra.params.use_ebe = true;
}

/**
 * If showing PES eBE plot, apply Jacobian (to account for R -> eKE conversion) and normalize
 */
function scale_and_normalize_pes() {
	// If eBE array is empty, we'll just show radial plot, no need to scale
	if (!scan.accumulated_image.spectra.params.use_ebe) {
		return;
	}

	const spectra_data = scan.accumulated_image.spectra.data;

	// Check if we need to do ir_on too, or just ir_off
	let scale_ir_on = false;
	if (spectra_data.ir_on_intensity.length > 0) {
		scale_ir_on = true;
	}
	let vmi_a = vmi_info.calibration_constants[vmi_info.selected_setting].a;
	let vmi_b = vmi_info.calibration_constants[vmi_info.selected_setting].b;
	// Copy data to ...data.normalized.(intensity plot) and scale
	// In order to conserve areas of peaks (i.e. Intensity(R)dR == Intensity(eKE)deKE)
	// 	need to divide intensity by deKE/dR = 2 a R + 4 b R^3
	let r;
	let jacobian;
	for (let i = 0; i < spectra_data.ir_off_intensity.length; i++) {
		r = spectra_data.radial_values[i];
		jacobian = 2 * vmi_a * r + 4 * vmi_b * Math.pow(r, 3);
		spectra_data.normalized.ir_off_intensity[i] = spectra_data.ir_off_intensity[i] / jacobian;
		if (scale_ir_on) {
			spectra_data.normalized.ir_on_intensity[i] = spectra_data.ir_on_intensity[i] / jacobian;
		}
	}
	// Now normalize ir_off (and ir_on) by maximum value of ir_off
	let max_intensity = Math.max(...spectra_data.normalized.ir_off_intensity); // "..." turns array into list of arguments
	for (let i = 0; i < spectra_data.normalized.ir_off_intensity.length; i++) {
		spectra_data.normalized.ir_off_intensity[i] /= max_intensity;
		if (scale_ir_on) {
			spectra_data.normalized.ir_on_intensity[i] /= max_intensity;
		}
	}
}

/**
 * Convert PES radial plot to eBE plot
 */
function convert_r_to_ebe() {
	// Make sure radial array is not empty
	if (scan.accumulated_image.spectra.data.radial_values.length === 0) {
		return;
	}
	// Make sure we should use eBE
	if (!scan.accumulated_image.spectra.params.use_ebe) {
		return;
	}

	// Get detachment laser wavelength
	let detachment_wavelength = laser.detachment.wavelength[laser.detachment.mode];
	// Convert to wavenumbers
	let detachment_wavenumber = laser.convert_wn_wl(detachment_wavelength);

	// Get VMI calibration constants
	let vmi_a = vmi_info.calibration_constants[vmi_info.selected_setting].a;
	let vmi_b = vmi_info.calibration_constants[vmi_info.selected_setting].b;

	// Convert R to eBE
	let ebe = scan.accumulated_image.spectra.data.radial_values.map((r) => detachment_wavenumber - (vmi_a * r * r + vmi_b * Math.pow(r, 4)));
	// Round eBE values to 2 decimal places make chart easier to read
	ebe = ebe.map((num) => decimal_round(num, 2));
	scan.accumulated_image.spectra.data.ebe_values = ebe;
	// Since we're using eBE, we need to reverse the x axis
	reverse_pes_x_axis();
}

/**
 * Reverse x axis on PE chart (to account for R -> eBE conversion)
 */
function reverse_pes_x_axis() {
	// Reverse eBE array
	scan.accumulated_image.spectra.data.ebe_values.reverse();
	// Reverse ir_off and ir_on intensities
	scan.accumulated_image.spectra.data.normalized.ir_off_intensity.reverse();
	// If ir_on is empty, this function still behaves fine, so no need to check
	scan.accumulated_image.spectra.data.normalized.ir_on_intensity.reverse();
}

/**
 * Display PE Spectrum
 */
function chart_spectrum_results() {
	// Check if the chart exists
	if (!spectrum_display) {
		return;
	}

	// Used to shorten code
	const pes_spectra = scan.accumulated_image.spectra;

	// Check if eBE should be used
	if (pes_spectra.params.use_ebe) {
		// Use eBE plot
		spectrum_display.data.labels = pes_spectra.data.ebe_values;
		// Update x-axis label
		spectrum_display.options.scales.x.title.text = "eBE ( cm\u207B\u00B9 )";
		// "\u207B" is unicode for superscript "-", and "\u00B9" is for superscript "1"
	} else {
		// eBE was not calculated, show radial plot
		spectrum_display.data.labels = pes_spectra.data.radial_values;
		// Update x-axis label
		spectrum_display.options.scales.x.title.text = "R (px)";
	}

	// Update image ID display text
	let image_id_string = "Displaying Image: i" + ("0" + pes_spectra.params.image_id).slice(-2);
	spectrum_display.options.plugins.title.text = image_id_string;

	if (pes_spectra.params.show_difference) {
		// Show the difference spectrum
		spectrum_display.data.datasets[0].data = pes_spectra.calculate_difference();
		// Update ir_off data
		spectrum_display.data.datasets[1].data = pes_spectra.data.zeroes;
		// Update legend display
		spectrum_display.data.datasets[0].label = "Difference";
		spectrum_display.data.datasets[0].borderColor = "black";
		spectrum_display.data.datasets[1].label = "Zero-line";
		spectrum_display.data.datasets[1].borderColor = "gray";
	} else {
		// Show IR on/off
		if (pes_spectra.params.use_ebe) {
			// Display normalized intensities
			// Update ir_on data
			spectrum_display.data.datasets[0].data = pes_spectra.data.normalized.ir_on_intensity;
			// Update ir_off data
			spectrum_display.data.datasets[1].data = pes_spectra.data.normalized.ir_off_intensity;
		} else {
			// Display raw data
			// Update ir_on data
			spectrum_display.data.datasets[0].data = pes_spectra.data.ir_on_intensity;
			// Update ir_off data
			spectrum_display.data.datasets[1].data = pes_spectra.data.ir_off_intensity;
		}
		// Update legend display
		spectrum_display.data.datasets[0].label = "IR On";
		spectrum_display.data.datasets[0].borderColor = "red";
		spectrum_display.data.datasets[1].label = "IR Off";
		spectrum_display.data.datasets[1].borderColor = "black";
	}

	// Update chart axes displays
	change_spectrum_x_display_range();
	// Update chart
	spectrum_display.update();
}

/**
 * Update horizontal display range of PES Spectrum
 */
function change_spectrum_x_display_range() {
	const x_range_min = parseFloat(document.getElementById("SpectrumXLower").value);
	const x_range_max = parseFloat(document.getElementById("SpectrumXUpper").value);
	if (!spectrum_display) {
		return;
	}
	if (x_range_min) {
		spectrum_display.options.scales.x.min = x_range_min;
	} else {
		spectrum_display.options.scales.x.min = scan.accumulated_image.spectra.extrema.get_min();
	}
	if (x_range_max) {
		spectrum_display.options.scales.x.max = x_range_max;
	} else {
		spectrum_display.options.scales.x.max = scan.accumulated_image.spectra.extrema.get_max();
	}
	spectrum_display.update();
}

/**
 * Add scan information to recent scans section
 * @param {object} scan_information - object containing information about the scan (e.g. from scan_information.json)
 */
function display_scan_information(scan_information) {
	const recent_scans_section = document.getElementById("RecentScansSection");
	let vals_to_add = [];
	let tag, text_node;
	let frame_count, e_count;
	let wavelength, wavenumber;
	// Figure out whether scan was SEVI or IR-SEVI
	let scan_mode = scan_information.image.mode;
	// Get formatted frame and electron counts
	frame_count = scan_information.image.frames_off;
	e_count = scan_information.image.electrons_off;
	if (scan_mode === "sevi") {
		frame_count += scan_information.image.frames_on;
		e_count += scan_information.image.electrons_on;
	}
	if (frame_count > 1000) {
		frame_count = Math.floor(frame_count / 1000) + "k";
	}
	if (e_count > 10000) {
		e_count = e_count.toExponential(3);
	}
	// Get laser energy information (making sure a value was input) and format
	wavelength = scan_information.laser.detachment.wavelength[scan_information.laser.detachment.mode];
	wavenumber = scan_information.laser.detachment.wavenumber[scan_information.laser.detachment.mode];
	if (wavelength > 0) {
		wavelength = wavelength.toFixed(3);
		wavenumber = wavenumber.toFixed(3);
	} else {
		// No value for wavelength was given, leave area blank
		wavelength = "";
		wavenumber = "";
	}
	// Add IR off information
	vals_to_add.push(scan_information.image.file_name);
	vals_to_add.push(wavelength);
	vals_to_add.push(wavenumber);
	vals_to_add.push(frame_count);
	vals_to_add.push(e_count);
	// If mode == IR-SEVI, also add IR excitation information
	if (scan_mode === "ir-sevi") {
		// Get formatted frame and electron counts
		frame_count = scan_information.image.frames_on;
		e_count = scan_information.image.electrons_on;
		if (frame_count > 1000) {
			frame_count = Math.floor(frame_count / 1000) + "k";
		}
		if (e_count > 10000) {
			e_count = e_count.toExponential(3);
		}
		// Get IR laser energy information (making sure a value was input) and format
		wavelength = scan_information.laser.excitation.wavelength[scan_information.laser.excitation.mode];
		wavenumber = scan_information.laser.excitation.wavenumber[scan_information.laser.excitation.mode];
		if (wavelength > 0) {
			wavelength = wavelength.toFixed(3);
			wavenumber = wavenumber.toFixed(3);
		} else {
			// No value for wavelength was given, leave area blank
			wavelength = "";
			wavenumber = "";
		}
		// Add IR on information
		vals_to_add.push(scan_information.image.file_name_ir);
		vals_to_add.push(wavelength);
		vals_to_add.push(wavenumber);
		vals_to_add.push(frame_count);
		vals_to_add.push(e_count);
	}
	// Add information to recent scans section as <p> elements
	for (let i = 0; i < vals_to_add.length; i++) {
		tag = document.createElement("p");
		text_node = document.createTextNode(vals_to_add[i]);
		tag.appendChild(text_node);
		recent_scans_section.appendChild(tag);
	}
}

/**
 * Remove all entries from the recent scans display
 */
function clear_recent_scan_display() {
	const recent_scans_section = document.getElementById("RecentScansSection");
	const display_length = recent_scans_section.children.length;
	for (let i = 0; i < display_length; i++) {
		// Remove the first child from section
		recent_scans_section.removeChild(recent_scans_section.children[0]);
	}
}

/**
 * Add information from all scans saved in scan.previous.all to the recent scans section
 */
function fill_recent_scan_display() {
	// Clear display first
	clear_recent_scan_display();
	const previous_scans_length = scan.previous.all.length;
	// Sort scans by file name first
	scan.previous.sort_scans();
	for (let i = 0; i < previous_scans_length; i++) {
		display_scan_information(scan.previous.all[i]);
	}
}

/*****************************************************************************

							IR ACTION MODE

*****************************************************************************/

/**
 * Disable unused buttons
 */
function disable_action_mode_buttons() {
	const disabled_buttons = [
		document.getElementById("IRActionPauseResume"),
		document.getElementById("IRActionCancel"),
		document.getElementById("IRActionPreviousWavelength"),
		document.getElementById("IRActionNextWavelength"),
		document.getElementById("IRActionTurnAround"),
	];
	for (let i = 0; i < disabled_buttons.length; i++) {
		if (disabled_buttons[i]) {
			disabled_buttons[i].disabled = true;
		}
	}
}

/**
 * Start/Save button for IR Action Mode
 */
function action_start_save_button() {
	// Check whether an action scan is currently being taken
	if (scan.action_mode.status.running) {
		// An action scan is running, stop scan after current image and save
		// Update button text
		update_action_button_to_start();
	} else {
		// An action scan is not running - start one
		// Get scan parameters
		if (!get_action_energy_parameters()) {
			// Energy parameters are invalid, cancel scan
			return;
		}
		if (!get_action_absorption_parameters()) {
			// Absorption parameters are invalid, cancel scan
			return;
		}
		if (!get_action_autostop_parameter()) {
			// Autostop parameters are invalid, cancel scan
			return;
		}
		// Calculate number of data points
		scan.action_mode.status.data_points.calculate();
		// Reset data values
		scan.action_mode.data.reset();
		// Update Absorption chart
		update_absorption_plot();
		// Update button text
		update_action_button_to_save();
		// Start action mode scan
		start_action_scan();
	}
}

/**
 * Update IR Action Mode Start/Save button to say "Start"
 */
function update_action_button_to_start() {
	const start_save_text = document.getElementById("IRActionStartSaveText");
	start_save_text.innerText = "Start";
}

/**
 * Update IR Action Mode Start/Save button to say "Save"
 */
function update_action_button_to_save() {
	const start_save_text = document.getElementById("IRActionStartSaveText");
	start_save_text.innerText = "Save";
}

/**
 * Get energy parameters (start, end, & increment) for IR Action mode
 * @returns {boolean} Success of function call
 */
function get_action_energy_parameters() {
	const range_start = document.getElementById("IRActionRangeStart");
	const range_end = document.getElementById("IRActionRangeEnd");
	const range_increment = document.getElementById("IRActionIncrement");
	let starting_energy = parseFloat(range_start.value);
	let ending_energy = parseFloat(range_end.value);
	let increment = parseFloat(range_increment.value);
	// Check that values are in range
	if (starting_energy > 7400 || ending_energy > 7400) {
		// Energies are too large
		alert("Action Energies out of range");
		return false;
	}
	if (starting_energy < 625 || ending_energy < 625) {
		alert("Action Energies out of range");
		return false;
	}
	if (increment < 1) {
		alert("Action Increment too small");
		return false;
	}
	// If it got this far, the parameters all look fine
	// Update values in action_mode object
	scan.action_mode.params.energy.update(starting_energy, ending_energy, increment);
	return true;
}

/**
 * Get absorption parameters (absorption mode + radii values) for IR Action mode
 * @returns {boolean} Success of function call
 */
function get_action_absorption_parameters() {
	const origin_radius = document.getElementById("IRActionRadius");
	// Fill in with drop-down for depletion or rel. peak height
	//	which would change the "mode" value
	let mode = "depletion"; // or "rel_height"
	let origin_value = parseFloat(origin_radius.value);
	if (origin_value < 0 || isNaN(origin_value)) {
		alert("Action absorption parameters out of range");
		return false;
	}
	// Update values in action_mode object
	scan.action_mode.params.peak_radii.update(mode, origin_value);
	return true;
}

/**
 * Get parameters for when to stop image acquisition
 * @returns {boolean} Success of function call
 */
function get_action_autostop_parameter() {
	// For now, just autostop at 5k frames
	//electrons.total.auto_stop.method = "frames";
	//electrons.total.auto_stop.update(0.5);
	electrons.total.auto_stop.method = "electrons";
	electrons.total.auto_stop.update(0.1);
	return true;
}

/**
 * Start an Action Mode scan
 */
async function start_action_scan() {
	console.time("ActionMode");
	let desired_energy;
	let desired_wl, desired_mode;
	let measured_energies;
	let origin_off_area, origin_on_area, new_peak_area;
	let absorption_value;
	let action_mode_data;
	// Update scan status
	scan.action_mode.status.running = true;
	scan.status.action_image = true;
	scan.status.method = "ir-sevi";
	// Update progress bar (if it shows "complete")
	hide_progress_bar_complete();
	// Set Absorption plot energy display range
	set_absorption_display_range();
	// Get energy bounds
	const energy = scan.action_mode.params.energy;
	// Move to starting wavelength with fast OPO speed
	opo.move_fast();
	[desired_wl, desired_mode] = laser.excitation.get_nir(energy.start);
	await move_ir_and_measure(desired_wl);
	// Switch to moving slowly
	opo.move_slow();
	// Loop over each data point
	for (let point = 0; point <= scan.action_mode.status.data_points.total; point++) {
		console.log(`Point ${point} of ${scan.action_mode.status.data_points.total}`);
		desired_energy = energy.start + point * energy.increment;
		// Update current data point counter
		scan.action_mode.status.data_points.current = point;
		// Update progress display
		update_action_progress();
		// Move nIR wavelength to get desired energy
		measured_energies = await move_to_ir(desired_energy);
		// Update current/next IR energy
		update_action_energy_displays(measured_energies[desired_mode].wavenumber);
		// Start taking data
		start_sevi_scan();
		// Save image ID's for file naming later
		if (point === 0) {
			scan.action_mode.status.first_image = scan.saving.image_id;
		}
		scan.action_mode.status.last_image = scan.saving.image_id;
		// Wait for scan to finish
		console.log("Waiting for SEVI scan to complete");
		await wait_for_sevi_scan();
		// When images are auto-stopped, they are also saved
		// Run MELEXIR and wait for results
		run_melexir();
		console.log("Waiting for Melexir to complete");
		await wait_for_melexir();
		// Calculate peak areas and absorption value
		[origin_off_area, origin_on_area, new_peak_area] = scan.action_mode.data.peak_areas.calculate();
		absorption_value = scan.action_mode.calculate_absorption(origin_off_area, origin_on_area, new_peak_area);
		// Store values
		action_mode_data = {
			energy: measured_energies[desired_mode].wavenumber,
			absorption: absorption_value,
			origin_off: origin_off_area,
			origin_on: origin_on_area,
			new_peak: new_peak_area,
		};
		scan.action_mode.data.update(action_mode_data);
		// Update Absorption Plot display
		update_absorption_plot();
	}
	// Scan is done
	scan.action_mode.status.running = false;
	scan.status.action_image = false;
	// Save data to file
	scan.action_mode.save();
	// Update button text
	update_action_button_to_start();
	show_progress_bar_complete();
	console.timeEnd("ActionMode");
}

/**
 * Update progress display
 */
function update_action_progress() {
	const progress_current = document.getElementById("ProgressTextCurrentImage");
	const progress_total = document.getElementById("ProgressTextTotalImages");
	const progress_bar = document.getElementById("ProgressBar");
	let current = scan.action_mode.status.data_points.current;
	let total = scan.action_mode.status.data_points.total;
	let progress_percentage = Math.round((100 * current) / total);
	// Change text
	progress_current.innerText = current;
	progress_total.innerText = total;
	// Change bar
	if (progress_percentage === 0) {
		progress_bar.style.display = "none";
	} else {
		progress_bar.style.display = "block";
		progress_bar.style.width = progress_percentage + "%";
	}
}

/**
 * Update current/next IR energy display
 * @param {number} - Value of measured IR energy (cm^-1)
 */
function update_action_energy_displays(measured_energy) {
	const current_energy = document.getElementById("IRActionCurrentEnergy");
	const next_energy = document.getElementById("IRActionNextEnergy");
	let current_point = scan.action_mode.status.data_points.current;
	// \u207B is unicode for superscript "-", and \u00B9 is for superscript "1"
	const wn_unit_label = " cm\u207B\u00B9";
	// Update current energy
	current_energy.innerText = measured_energy.toFixed(2) + wn_unit_label;
	// Figure out if there will be a next energy
	if (current_point === scan.action_mode.status.data_points.total) {
		// This is the last energy, just show "-"
		next_energy.innerText = "-";
	} else {
		// Calculate the next energy
		let next_energy_val = scan.action_mode.params.energy.start + (current_point + 1) * scan.action_mode.params.energy.increment;
		next_energy.innerText = next_energy_val.toFixed(2) + wn_unit_label;
	}
}

/**
 * Show "Complete" text on the progress bar
 */
function show_progress_bar_complete() {
	const progress_bar = document.getElementById("ProgressBar");
	progress_bar.innerText = "Complete";
}

/**
 * Erase text on progress bar and hide
 */
function hide_progress_bar_complete() {
	const progress_bar = document.getElementById("ProgressBar");
	progress_bar.style.display = "none";
	progress_bar.innerText = "";
}

/**
 * Move OPO to desired energy including iterations to maximize accuracy
 * @param {number} desired_energy - Desired IR energy in wavenumbers (cm-1)
 * @returns {object} - Object containing desired IR mode and IR energies converted from measured nIR
 */
async function move_to_ir(desired_energy) {
	let desired_wl, desired_mode;
	let measured_wl, measured_energies, energy_difference, wl_difference;

	// Calculate nIR wavelength for desired energy
	[desired_wl, desired_mode] = laser.excitation.get_nir(desired_energy);
	if (!desired_wl) {
		// Couldn't get nIR wavelength - move to next energy
		return false;
	}
	console.log(`Desired energy: ${desired_energy} cm-1 -> nIR: ${desired_wl} nm`);
	// Move OPO to desired energy and measure the wavelength
	console.log("Moving IR, measuring wavelength");
	measured_wl = await move_ir_and_measure(desired_wl);
	if (!measured_wl) {
		// Couldn't get nIR measurement - move to next energy
		return false;
	}
	// Calculate the excitation IR energy (cm^-1)
	measured_energies = convert_nir(measured_wl);
	console.log("Converted energies:", measured_energies);
	// Check that the energy is close enough
	energy_difference = measured_energies[desired_mode].wavenumber - desired_energy;
	wl_difference = desired_wl - measured_wl;
	if (Math.abs(energy_difference) > 0.3) {
		// Too far away, move nIR by difference between desired and measured
		// -> move_to((desired + difference) = (desired + (desired - measured)) = (2*desired - measured))
		console.log("Second iteration of moving IR and measuring");
		opo.move_very_slow();
		measured_wl = await move_ir_and_measure(2 * desired_wl - measured_wl);
		//measured_wl = await move_ir_and_measure(desired_wl + 0.01 * (2 * (wl_difference > 0) - 1));
		if (!measured_wl) {
			// Couldn't get nIR measurement - move to next energy
			return false;
		}
		// Calculate the excitation IR energy (cm^-1)
		measured_energies = convert_nir(measured_wl);
		// Don't want to iterate movement more than once - move on
		opo.move_slow();
	}

	// Add desired mode to measured_energies
	measured_energies.desired_mode = desired_mode;

	return measured_energies;
}

/**
 * Move the nIR to desired value and measure wavelength
 * @param {number} desired_wl - Desired nIR wavelength to move to (nm)
 * @returns {number} Measured wavelength, or 0 if unable to measure
 */
async function move_ir_and_measure(desired_wl) {
	if (!opo.goto_nir(desired_wl)) {
		// Could not move to that wavelength - return 0
		return 0;
	}
	// Wait for OPO/A motors to stop moving
	await wait_for_motors();
	// Get wavelength from OPO
	opo.get_wavelength();
	console.log("Getting wavelength from OPO");
	// Measure wavelength
	let measured_wl = await measure_wavelength(desired_wl);
	console.log(`Measured nIR: ${measured_wl} nm`);
	if (!measured_wl) {
		// Couldn't measure the wavelength - try once more
		measured_wl = await measure_wavelength(desired_wl);
		console.log(`Measured nIR: ${measured_wl} nm`);
		if (!measured_wl) {
			// Still couldn't get a measurement - return 0
			return 0;
		}
	}
	// Return the measured wavelength
	return measured_wl;
}

/**
 * (Async function) Return when OPO motors have stopped moving
 * @returns {true} upon completion
 */
async function wait_for_motors() {
	while (opo.status.motors_moving) {
		// Check every 500ms if motors are still moving
		await new Promise((resolve) =>
			setTimeout(() => {
				opo.get_motor_status();
				resolve();
			}, 500)
		);
	}
	return true;
}

/**
 * (Async function) Measure wavelengths and find reduced average
 * @param {number} expected_wl - wavelength to expect during measurements (nm)
 * @returns {number} wavelength, returns 0 if unable to measure
 */
async function measure_wavelength(expected_wl) {
	const measured_values = [];
	let measured_value_length = 50; // Number of wavelengths to measure
	let minimum_stdev = 0.01; // Reduce wavelength array until stdev is below this value
	let minimum_length = 10; // Minimum number of wavelengths to keep during reduction
	let too_far_val = 1; // nm, wavelength values too_far_val nm away from expected will be removed (if expected_wl given)
	let max_iteration_count = 10; // Maximum number of iterations in reduction
	let fail_count = 0; // Keep track of how many failed measurements there were
	let bad_measurements = 0;
	let wl;

	// Start wavemeter measurement
	wavemeter.startMeasurement();

	while (measured_values.length < measured_value_length) {
		// Get measurement wavelength every IR pulse (100ms / 10Hz)
		await new Promise((resolve) =>
			setTimeout(() => {
				wl = wavemeter.getWavelength();
				// Make sure there actually was a measurement to get
				if (wl > 0) {
					// Make sure we didn't get the same measurement twice by comparing against last measurement
					if (wl !== measured_values["length"]) {
						// If an expected wavelength was given, make sure measured value isn't too far away
						if (expected_wl) {
							if (Math.abs(wl - expected_wl) < too_far_val) {
								measured_values.push(wl);
							} else {
								// This was a bad measurement
								bad_measurements++;
							}
						} else {
							// No expected wavelength given, record all values
							measured_values.push(wl);
						}
					}
				} else {
					// Wavelength was not measured, uptick failure count
					fail_count++;
				}
				resolve();
			}, 100)
		);
		// Check if there were too many failures
		if (fail_count > 0.2 * measured_value_length) {
			// Stop wavemeter measurement
			wavemeter.stopMeasurement();
			console.log(`Wavelength measurement: ${fail_count} failed measurements - Canceled`);
			return 0;
		}
		// Check if there were too many bad measurements
		if (bad_measurements >= 4 * measured_value_length) {
			// Stop wavemeter measurement
			wavemeter.stopMeasurement();
			console.log(`Wavelength measurement: ${bad_measurements} bad measurements - Canceled`);
			return 0;
		}
	}
	// Stop wavemeter measurement
	wavemeter.stopMeasurement();
	// Now we have enough measurements - get rid of outliers until standard deviation is low enough
	let reduced_avg_results = get_reduced_average(measured_values, minimum_stdev, minimum_length, max_iteration_count);
	return reduced_avg_results.final.average; // Return the average wavelength
}

/**
 * Calculate average and filter outliers until standard deviation is small enough
 * @param {array} values - Array of values to evaluate
 * @param {number} minimum_stdev - Standard deviation threshold for reduction (i.e. reduces until stdev below this value)
 * @param {number} minimum_length - Minimum length of final array (i.e. don't reduce too much)
 * @param {number} max_iteration_count - Maximum number of reduction iterations to complete
 * @returns {object} statistical values before and after reduction
 */
function get_reduced_average(values, minimum_stdev, minimum_length, max_iteration_count) {
	let iteration_count = 0; // Keep track of how many iterations were used to get reduced average

	let [avg, stdev] = average(values);
	const reduced_avg_results = {
		initial: {
			average: avg,
			stdev: stdev,
			values: values,
		},
		final: {
			average: 0,
			stdev: 0,
			values: [],
		},
		iteration_count: 0,
	};

	while (stdev > minimum_stdev) {
		// Filter out values more than 1 stdev away from average
		values = values.filter((val) => avg - stdev < val && val < avg + stdev);
		// Uptick reduction iteration counter
		iteration_count++;

		if (values.length < minimum_length || iteration_count > max_iteration_count) {
			break;
		}

		[avg, stdev] = average(values);
	}

	reduced_avg_results.final = {
		average: avg,
		stdev: stdev,
		values: values,
	};
	reduced_avg_results.iteration_count = iteration_count;

	return reduced_avg_results;
}

/**
 *  Get the average and standard deviation of an array
 * @param {array} array
 * @returns {[number, number]} [average, standard deviation]
 */
function average(array) {
	const len = array.length;
	const sum = array.reduce((accumulator, current_value) => {
		return accumulator + current_value;
	});
	const average = sum / len;
	const stdev = Math.sqrt(array.map((x) => Math.pow(x - average, 2)).reduce((a, b) => a + b) / len);
	return [average, stdev];
}

/**
 * Convert nIR wavelength to IR wavelengths/wavenumbers
 * @param {number} nir_wl - nIR wavelength of OPO
 * @returns {object} converted values
 */
function convert_nir(nir_wl) {
	const converted_energies = {
		nir: { wavelength: 0, wavenumber: 0 },
		iir: { wavelength: 0, wavenumber: 0 },
		mir: { wavelength: 0, wavenumber: 0 },
		fir: { wavelength: 0, wavenumber: 0 },
	};
	let input_wn = decimal_round(laser.convert_wn_wl(nir_wl), 3); // Input energy (cm^-1)
	let yag_wl = laser.excitation.wavelength.yag_fundamental; // YAG fundamental (nm)
	let yag_wn = decimal_round(laser.convert_wn_wl(yag_wl), 3); // YAG fundamental (cm^-1)
	// Near-IR, will be the same as input value
	converted_energies.nir.wavelength = nir_wl;
	converted_energies.nir.wavenumber = input_wn;
	// Intermediate-IR, 2 * YAG - nIR (cm^-1)
	let iir_wn = 2 * yag_wn - input_wn; // iIR (cm^-1)
	let iir_wl = laser.convert_wn_wl(iir_wn); // iIR (nm)
	converted_energies.iir.wavelength = decimal_round(iir_wl, 3);
	converted_energies.iir.wavenumber = decimal_round(iir_wn, 3);
	// Mid-IR, YAG - iIR (cm^-1)
	let mir_wn = yag_wn - iir_wn; // mIR (cm^-1)
	let mir_wl = laser.convert_wn_wl(mir_wn); // mIR (nm)
	converted_energies.mir.wavelength = decimal_round(mir_wl, 3);
	converted_energies.mir.wavenumber = decimal_round(mir_wn, 3);
	// Far-IR, iIR - mIR (cm^-1)
	let fir_wn = iir_wn - mir_wn; // fIR (cm^-1)
	let fir_wl = laser.convert_wn_wl(fir_wn); // fIR (nm)
	converted_energies.fir.wavelength = decimal_round(fir_wl, 3);
	converted_energies.fir.wavenumber = decimal_round(fir_wn, 3);
	return converted_energies;
}

/**
 * (Async function) wait for SEVI scan to complete
 */
async function wait_for_sevi_scan() {
	while (scan.status.running) {
		// Check every 500ms if scan is still being taken
		await new Promise((resolve) =>
			setTimeout(() => {
				resolve();
			}, 500)
		);
	}
	return true;
}

/**
 * (Async function) wait for MELEXIR worker to complete computation
 */
async function wait_for_melexir() {
	// When Melexir worker is done processing, it will be set to null
	while (melexir_worker) {
		// Check every 100ms if it's still working
		await new Promise((resolve) =>
			setTimeout(() => {
				resolve();
			}, 100)
		);
	}
	return true;
}

/**
 * Create chart to plot IR Absorption Profile
 */
function create_absorption_plot() {
	if (document.getElementById("IRAbsorptionPlot")) {
		const absorption_display_ctx = document.getElementById("IRAbsorptionPlot").getContext("2d");
		absorption_display = new Chart(absorption_display_ctx, absorption_config);
		update_absorption_plot();
	}
}

/**
 * Destroy IR Absorption chart
 */
function destroy_absorption_plot() {
	if (absorption_display) {
		absorption_display.destroy();
		absorption_display = null;
	}
}

/**
 * Update IR Absorption chart
 */
function update_absorption_plot() {
	if (absorption_display) {
		absorption_display.data.labels = scan.action_mode.data.energies;
		absorption_display.data.datasets[0].data = scan.action_mode.data.absorption;
		absorption_display.update();
	}
}

/**
 * Set the IR Absorption energy display range
 */
function set_absorption_display_range() {
	let start_energy = scan.action_mode.params.energy.start;
	let end_energy = scan.action_mode.params.energy.end;
	let increment = Math.abs(scan.action_mode.params.energy.increment);
	if (start_energy < end_energy) {
		absorption_display.options.scales.x.min = start_energy - increment;
		absorption_display.options.scales.x.max = end_energy + increment;
	} else {
		absorption_display.options.scales.x.min = end_energy - increment;
		absorption_display.options.scales.x.max = start_energy + increment;
	}
	absorption_display.update();
}

/*****************************************************************************


							IPC MESSAGES


*****************************************************************************/

// Recieve setting information and go through startup procedure
ipc.on("settings-information", (event, settings_information) => {
	settings = settings_information;

	// Process settings (should make its own function)
	if (settings.opo.host) {
		opo.network.config.host = settings.opo.host;
	}

	startup();
});

// Recieve message from (eventually) invisible window with camera frame data
ipc.on("new-camera-frame", (event, centroid_results) => {
	// centroid_results is an object containing:
	//		image_buffer			-	Uint8Buffer - Current image frame
	// 		ccl_centers				-	Array		- Connect component labeling centroids
	//		hybrid_centers			-	Array		- Hybrid method centroids
	//		computation_time		-	Float		- Time to calculate centroids (ms)
	//		is_led_on				- 	Boolean		- Whether IR LED was on in image

	// Update electron counters
	//electrons.update(centroid_results);
	//update_counter_displays();
	// Add electrons to accumulated image and update display
	//scan.accumulated_image.update(centroid_results);
	//update_accumulated_image_display();
	// Check if camera frame should be saved to file
	scan.single_shot.check(centroid_results);
	// Check if auto-stop is triggered
	//electrons.total.auto_stop.check();

	// Update accumulated image and electron counters
	electrons.update(centroid_results);
	Images.update(centroid_results);
	update_accumulated_image_display();
	update_counter_displays();
	// Check if auto-stop is triggered
	Images.check_autostop();
});

/*****************************************************************************


							VARIOUS FUNCTIONS 


*****************************************************************************/

/**
 * Round value to specified decimal place
 * @param {number} num - value to round
 * @param {number} d - number of decimal places (default is 3)
 * @returns {number} rounded value
 */
function decimal_round(num, d) {
	let d_val = d || 3;
	let decimal_val = Math.pow(10, d_val);
	// Adding Number.EPSILON prevents floating point errors
	return Math.round((num + Number.EPSILON) * decimal_val) / decimal_val;
}

/* Functions for simulating wavemeter on Mac */

/**
 * This function is called solely from C++ file (wavemeter_mac.cc)
 * 	to simulate the wavemeter
 * Return a wavelength close to OPO's wavelength
 */
function mac_wavelength() {
	// Get the OPO's wavelength
	let wl = opo.status.current_wavelength;
	// Add a bias
	//wl -= 0.2565;
	// Add some noise
	wl += norm_rand(0, 0.001);
	// Small chance of wavelength being very far off
	if (Math.random() < 0.1) {
		wl -= 20;
	}
	return wl;
}

/**
 * Initialize JS function on C++ side
 */
function initialize_mac_fn() {
	wavemeter.setUpFunction(mac_wavelength);
}

/**
 * Random number with normal distribution
 * @param {Number} mu - center of normal distribution (mean)
 * @param {Number} sigma - width of normal distribution (sqrt(variance))
 * @returns {Number} random number
 */
function norm_rand(mu, sigma) {
	let u = 0,
		v = 0;
	while (u === 0) u = Math.random(); //Converting [0,1) to (0,1)
	while (v === 0) v = Math.random();
	return sigma * Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v) + mu;
}

// ----------------------------------------------- //

function add_wl() {
	const current_energy = document.getElementById("IRActionCurrentEnergy");
	const next_energy = document.getElementById("IRActionNextEnergy");

	// \u207B is unicode for superscript "-", and \u00B9 is for superscript "1"
	const wn_unit_label = " cm\u207B\u00B9";

	current_energy.innerText = "1877.00" + wn_unit_label;
	next_energy.innerText = "1878.50" + wn_unit_label;

	add_progress();
}

function add_progress() {
	const current_image = document.getElementById("ProgressTextCurrentImage");
	const total_images = document.getElementById("ProgressTextTotalImages");

	current_image.innerText = "11";
	total_images.innerText = "20";
}

async function run_progress_bar() {
	const progress_bar = document.getElementById("ProgressBar");

	for (let i = 0; i <= 100; i += 10) {
		await new Promise((resolve) => {
			setTimeout(() => {
				if (i === 10) {
					progress_bar.style.display = "block";
				}
				progress_bar.style.width = i.toString() + "%";
				resolve();
			}, 500);
		});
	}
}

async function sleep(delay_ms) {
	return new Promise((resolve) => setTimeout(resolve, delay_ms));
}
