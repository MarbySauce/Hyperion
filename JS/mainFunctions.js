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
};

/*		Tabs		*/

document.getElementById("SeviMode").onclick = function () {
	// SEVI mode tab
	switch_tabs(0);
};
document.getElementById("IRSeviMode").onclick = function () {
	// IR SEVI mode tab
	switch_tabs(1);
};
document.getElementById("IRActionMode").onclick = function () {
	// IR Action mode tab
	switch_tabs(2);
};
document.getElementById("Settings").onclick = function () {
	// Settings tab
	switch_tabs(8);
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
	update_scan_id();
};
document.getElementById("ImageCounterUp").onclick = function () {
	uptick_image_counter();
	update_scan_id();
};
document.getElementById("VMIMode").oninput = function () {
	vmi_mode_selection();
};

// Laser control buttons
document.getElementById("WavelengthMode").oninput = function () {
	detachment_mode_selection();
};
// Using input delay class to make sure function only executes if there is no input update for 1s
const detachment_wavelength_input_delay = new input_delay(detachment_energy_input_fn);
document.getElementById("DetachmentWavelength").oninput = function () {
	detachment_wavelength_input_delay.start_timer();
};
document.getElementById("IRWavelengthMode").oninput = function () {
	excitation_mode_selection();
};
// Using input delay class to make sure function only executes if there is no input update for 1s
const excitation_wavelength_input_delay = new input_delay(excitation_energy_input_fn);
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
document.getElementById("AutomaticStop").oninput = function () {
	sevi_automatic_stop_input();
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
const spectrum_x_lower_input_delay = new input_delay(change_spectrum_x_display_range);
document.getElementById("SpectrumXLower").oninput = function () {
	spectrum_x_lower_input_delay.start_timer();
};
// Using input delay class to make sure function only executes if there is no input update for 1s
const spectrum_x_upper_input_delay = new input_delay(change_spectrum_x_display_range);
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

document.getElementById("IRActionStartSave").onclick = function () {
	action_start_save_button();
};

document.getElementById("IRActionPageDown").onclick = function () {
	switch_pages(1); // Switch to second page
	destroy_absorption_plot();
};
document.getElementById("IRActionPageUp").onclick = function () {
	switch_pages(0); // Switch to first page
	create_absorption_plot(); // Create plot for Absorption profile
};

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
	// Go to Sevi Mode tab (ID = 0)
	switch_tabs(0);
	//switch_tabs(2);

	// Start wavemeter application
	wavemeter.startApplication();

	// Update Autosave button On/Off text
	update_autosave_button_text();

	// Generate image file names and display
	scan.saving.get_file_names();
	scan.previous.read();
	display_file_names();

	// Set up Mac wavemeter simulation function
	initialize_mac_fn();
	// Get OPO wavelength
	setTimeout(() => {
		opo.get_wavelength();
	}, 1000);

	disable_action_mode_buttons();

	ipc.send("main-window-loaded", null);
}

/*		Tabs		*/

/**
 * Depress all of the buttons (to behave like a radio button) and then activate the tab 'tab'
 * @param {int} tab - 0 => SEVI mode, 1 => IR-SEVI Mode, 2 => IR Action Mode,
 * 					3 => blank, 4 => blank, 5 => blank, 6 => blank, 7 => blank,
 * 					8 => Settings section
 */
function switch_tabs(tab) {
	// Tab name should be an integer corresponding to the index of tabList
	// 		Some tabs are left empty and can be filled in if a new tab is added in the future
	//
	// If you only want to hide all tabs and show nothing,
	// call the function with no parameters

	// List of each tab section
	const tab_list = [
		document.getElementById("SeviMode"),
		document.getElementById("IRSeviMode"),
		document.getElementById("IRActionMode"),
		null,
		null,
		null,
		null,
		null,
		document.getElementById("Settings"),
	];

	// Content corresponding to each tab
	const content_list = [
		document.getElementById("SeviModeContent"),
		document.getElementById("SeviModeContent"),
		document.getElementById("IRActionModeContent"),
		null,
		null,
		null,
		null,
		null,
		document.getElementById("SettingsContent"),
	];

	// Depress the current tab and hide content
	tab_list[page_info.current_tab].classList.remove("pressed-tab");
	content_list[page_info.current_tab].style.display = "none";

	// Make sure the tab argument passed is an integer corresponding to a real tab
	if (!tab_list[tab]) {
		console.log("Returned");
		return;
	}

	// Store the current tab info
	page_info.current_tab = tab;

	// Activate selected tab and show content
	tab_list[tab].classList.add("pressed-tab");
	content_list[tab].style.display = "grid";

	// If chosen tab is Sevi or IR-Sevi mode, we have to do a bit more
	// since IR-SEVI is just Sevi with a few more elements shown
	let sevi_methods = ["sevi", "ir-sevi"];
	if (tab <= 1) {
		// Remove class of the tab not chosen (e.g. remove "sevi-mode" if ir-sevi chosen)
		content_list[tab].classList.remove(sevi_methods[(tab + 1) % 2] + "-mode");
		// Add class of the chosen tab
		content_list[tab].classList.add(sevi_methods[tab] + "-mode");
	}

	// If moving to IR Action tab, create Absorption chart, otherwise destroy it if it exists
	if (tab === 2) {
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
	if (page_info.current_tab <= 1) {
		// Currently on Sevi or IR-Sevi tab
		page_prefix = "Sevi";
	} else if (page_info.current_tab == 2) {
		// Currently on IR Action tab
		page_prefix = "IRAction";
	} else {
		// Currently on a tab without pages, just return
		// Note: need to add another "else if" if you add another tab with two pages
		return;
	}

	const first_page = document.getElementById(page_prefix + "FirstPage");
	const second_page = document.getElementById(page_prefix + "SecondPage");

	if (page_index === 0) {
		// Display first page
		first_page.style.display = "grid";
		second_page.style.display = "none";

		// PE Spectrum is on second page, and needs to be destroyed if moving to first page
		//	(if it exists)
		destroy_spectrum_plot();
	} else if (page_index === 1) {
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
	if (scan.status.running) {
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
		// Check whether it should be SEVI or IR-SEVI scan (based on current tab)
		let sevi_methods = ["sevi", "ir-sevi"];
		scan.status.method = sevi_methods[page_info.current_tab];
		// Start the scan
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
	electrons.total.reset();
	scan.accumulated_image.reset();
	scan.saving.start_timer();
	// Save image ID for scan
	update_scan_id();
	//update_pes_id();
	// Update scan running status
	scan.status.running = true;
	scan.status.paused = false;
}

/**
 * Stop SEVI or IR-SEVI scan
 * @param {bool} save_image - Whether to save image to file
 */
function stop_sevi_scan(save_image) {
	// Update scan running status
	scan.status.running = false;
	scan.status.paused = false;
	// Save image to file (if selected)
	if (save_image) {
		scan.previous.add_scan();
		scan.accumulated_image.save();
	}
}

/**
 * Change SEVI Mode Start button text to say Start
 */
function change_sevi_start_button_to_start() {
	const start_button_text = document.getElementById("ScanStartSaveText");
	start_button_text.innerText = "Start";
}

/**
 * Change SEVI Mode Start button text to say Save
 */
function change_sevi_start_button_to_save() {
	const start_button_text = document.getElementById("ScanStartSaveText");
	start_button_text.innerText = "Save";
}

function sevi_pause_resume_button() {
	// Check if a scan is running
	if (scan.status.running) {
		// Scan is running, pause if not already, otherwise resume scan
		if (scan.status.paused) {
			// Resume scan
			scan.status.paused = false;
			// Update button text and remove pause overlay
			change_sevi_pause_button_to_pause();
			remove_pause_screen_overlay();
		} else {
			// Pause scan
			scan.status.paused = true;
			// Update button text and add pause overlay
			change_sevi_pause_button_to_resume();
			add_pause_screen_overlay();
		}
	} else {
		// Scan was not running
		// If an earlier scan is still in memory, give option to resume that scan
		// Otherwise do nothing
		if (scan.accumulated_image.images.ir_off.length > 0 && electrons.total.e_count.ir_off > 0) {
			// Update button text
			change_sevi_start_button_to_save();
			change_sevi_pause_button_to_pause();
			// Downtick counter to match earlier image
			downtick_image_counter();
			// Start autosave timer
			scan.saving.start_timer();
			// Update scan ID
			update_scan_id();
			// Resume scan
			scan.status.running = true;
			scan.status.paused = false;
		}
	}
}

/**
 * Change SEVI Mode Pause button text to say Pause
 */
function change_sevi_pause_button_to_pause() {
	const pause_button_text = document.getElementById("ScanPauseResumeText");
	pause_button_text.innerText = "Pause";
}

/**
 * Change SEVI Mode Pause button text to say Resume
 */
function change_sevi_pause_button_to_resume() {
	const pause_button_text = document.getElementById("ScanPauseResumeText");
	pause_button_text.innerText = "Resume";
}

/**
 * Gray out display to show scan is paused
 */
function add_pause_screen_overlay() {
	const sevi_content = document.getElementById("SeviModeContent");
	// Gray out sections
	sevi_content.classList.add("paused");
	// Add pause icon on accumulated image display
	draw_pause_icon();
}

/**
 * Remove pause screen display
 */
function remove_pause_screen_overlay() {
	const sevi_content = document.getElementById("SeviModeContent");
	sevi_content.classList.remove("paused");
}

/**
 * Draw a pause icon on the accumulated image display
 */
function draw_pause_icon() {
	const image_display = document.getElementById("Display");
	const ctx = image_display.getContext("2d");

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
	if (!scan.status.running) {
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
	if (scan.saving.autosave) {
		// Autosaving is now turned on
		autosave_on_off_text.innerText = "On";
	} else {
		// Autosaving is now turned off
		autosave_on_off_text.innerText = "Off";
	}
}

/**
 * Reset accumulated image and electron counters
 */
function sevi_scan_reset() {
	electrons.total.reset();
	scan.accumulated_image.reset();
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
	if (scan.status.method === "sevi") {
		if (scan.status.running) {
			// Sevi mode scan just started, add CSS class to ir_on file name s.t. it doesn't show even on IR-Sevi tab
			ir_on_file.classList.add("do-not-show-file");
		} else {
			// Sevi mode scan just ended, take away above CSS class
			ir_on_file.classList.remove("do-not-show-file");
		}
	} else if (scan.status.method === "ir-sevi") {
		if (scan.status.running) {
			// IR-Sevi mode scan just started, add CSS class to ir_on file name s.t. it always shows even on Sevi tab
			ir_on_file.classList.add("always-show-file");
		} else {
			// IR-Sevi mode scan just ended, take away above CSS class
			ir_on_file.classList.remove("always-show-file");
		}
	}
}

/**
 * Display the image file names for ir_off and ir_on
 */
function display_file_names() {
	const ir_off_file = document.getElementById("CurrentImageFile");
	const ir_on_file = document.getElementById("CurrentImageFileIR");
	ir_off_file.value = scan.saving.file_name;
	ir_on_file.value = scan.saving.file_name_ir;
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
	update_scan_id();
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
	update_scan_id();
	display_file_names();
}

/**
 * Update the ID used for scan saving
 */
function update_scan_id() {
	const image_counter = document.getElementById("ImageCounter");
	let image_id = parseInt(image_counter.value);
	// Update the scan saving ID
	scan.saving.image_id = image_id;
	// Update file names in scan.saving
	scan.saving.get_file_names();
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
		if (!scan.status.running || scan.status.paused) {
			// Don't update the images
			return;
		}
	}
	const image_select = document.getElementById("ImageDisplaySelect");
	const image_display = document.getElementById("Display");
	const ctx = image_display.getContext("2d");
	const display_slider_value = parseFloat(document.getElementById("DisplaySlider").value);
	let image_height = scan.accumulated_image.params.accumulation_height;
	let image_width = scan.accumulated_image.params.accumulation_width;
	let image_data = new ImageData(image_width, image_height); //ctx.getImageData(0, 0, image_width, image_height);
	let displayed_image;
	let image_pixel;
	let display_positive = true; // If false, display only negative values (for difference image)

	// Clear the current image
	ctx.clearRect(0, 0, image_display.width, image_display.height);

	if (page_info.current_tab === 0) {
		// On Sevi Mode tab, display ir_off + ir_on
		for (let Y = 0; Y < image_height; Y++) {
			for (let X = 0; X < image_width; X++) {
				image_pixel = scan.accumulated_image.images.ir_off[Y][X];
				image_pixel += scan.accumulated_image.images.ir_on[Y][X];
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
					image_data.data[4 * (image_width * Y + X) + i] = image_pixel;
				}
			}
		}
	} else if (page_info.current_tab === 1) {
		// On IR-Sevi tab, display selected image
		switch (image_select.selectedIndex) {
			case 0:
				// IR Off
				displayed_image = scan.accumulated_image.images.ir_off;
				break;
			case 1:
				// IR On
				displayed_image = scan.accumulated_image.images.ir_on;
				break;
			case 2:
				// Difference positive (need to calculate difference first)
				displayed_image = scan.accumulated_image.images.difference;
				break;
			case 3:
				// Difference negative (need to calculate difference first)
				display_positive = false;
				displayed_image = scan.accumulated_image.images.difference;
				break;
			default:
				// Just display IR Off
				displayed_image = scan.accumulated_image.images.ir_off;
				break;
		}
		for (let Y = 0; Y < image_height; Y++) {
			for (let X = 0; X < image_width; X++) {
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
					image_data.data[4 * (image_width * Y + X) + i] = image_pixel;
				}
			}
		}
	}
	// Put image_data on the display
	// Have to do this bullshit so that the image is resized to fill the display correctly
	// (turning the ImageData object into a BMP image and then using drawImage to put it on the canvas)
	createImageBitmap(image_data).then(function (bitmap_img) {
		ctx.drawImage(bitmap_img, 0, 0, image_width, image_height, 0, 0, image_display.width, image_display.height);
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

	let frame_count_off = electrons.total.frame_count.ir_off;
	let frame_count_on = electrons.total.frame_count.ir_on;
	let avg_off = electrons.average.mode.ir_off_value;
	let avg_on = electrons.average.mode.ir_on_value;

	// If on Sevi mode tab, total values = ir_off + ir_on
	if (page_info.current_tab === 0) {
		total_frames.value = frame_count_off + frame_count_on;
		total_e_count.value = electrons.total.e_count.get_count("total");
		avg_e_count.value = ((avg_off + avg_on) / 2).toFixed(2);
	} else {
		total_frames.value = frame_count_off;
		total_frames_ir.value = frame_count_on;
		total_e_count.value = electrons.total.e_count.get_count("ir_off");
		total_e_count_ir.value = electrons.total.e_count.get_count("ir_on");
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
	electrons.total.auto_stop.update(value);
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
			electrons.total.auto_stop.method = "none";
			auto_stop.value = "";
			break;
		case 1:
			// Electrons (x1e5)
			electrons.total.auto_stop.method = "electrons";
			auto_stop.value = electrons.total.auto_stop.electrons || "";
			break;
		case 2:
			// Frames (x1000)
			electrons.total.auto_stop.method = "frames";
			auto_stop.value = electrons.total.auto_stop.frames || "";
			break;
		default:
			// None
			electrons.total.auto_stop.method = "none";
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
		disabled_buttons[i].disabled = true;
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
		alert("Action Energies too large");
		return false;
	}
	if (starting_energy < 625 || ending_energy < 625) {
		alert("Action Energies too small");
		return false;
	}
	/*if (increment < 1) {
		alert("Action Increment too small");
		return false;
	}*/
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
	const collection_length = document.getElementById("IRActionCollectionLength");
	const collection_unit = document.getElementById("IRActionCollectionUnit");
	// Get value for collection length
	let collection_val = parseFloat(collection_length.value);
	// Figure out collection unit (frames or electrons)
	let collection_method;
	switch (collection_unit.selectedIndex) {
		case 0: // Electrons
			collection_method = "electrons";
			break;
		case 1:
			collection_method = "frames";
			break;
		default:
			collection_method = "electrons";
			break;
	}
	// Update values
	electrons.total.auto_stop.method = collection_method;
	electrons.total.auto_stop.update(collection_val);
	console.log(collection_val, collection_method);
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
	//opo.set_speed();
	[desired_wl, desired_mode] = laser.excitation.get_nir(energy.start);
	//await move_ir_and_measure(desired_wl);
	// Switch to moving slowly
	//opo.set_speed(0.05);
	scan.action_mode.timer.start();
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
		// Update laser excitation values in laser module
		laser.excitation.wavelength.input = decimal_round(measured_energies.nir.wavelength, 3);
		laser.excitation.convert();
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
	scan.action_mode.timer.end();
	// Save data to file
	scan.action_mode.save();
	// Update button text
	update_action_button_to_start();
	show_progress_bar_complete();
	console.timeEnd("ActionMode");
	// Reset automatic stop
	sevi_automatic_stop_selection()
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
/*async function move_to_ir(desired_energy) {
	let desired_wl, desired_mode;
	let measured_wl, measured_energies, energy_difference, wl_difference;
	let false_measurement = {
		nir: { wavelength: 0, wavenumber: 0 },
		iir: { wavelength: 0, wavenumber: 0 },
		mir: { wavelength: 0, wavenumber: 0 },
		fir: { wavelength: 0, wavenumber: 0 },
	};

	// Calculate nIR wavelength for desired energy
	[desired_wl, desired_mode] = laser.excitation.get_nir(desired_energy);
	if (!desired_wl) {
		// Couldn't get nIR wavelength - move to next energy
		return false_measurement;
	}
	console.log(`Desired energy: ${desired_energy} cm-1 -> nIR: ${desired_wl} nm`);
	// Move OPO to desired energy and measure the wavelength
	console.log("Moving IR, measuring wavelength");
	measured_wl = await move_ir_and_measure(desired_wl);
	if (!measured_wl) {
		// Couldn't get nIR measurement - move to next energy
		return false_measurement;
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
		opo.move_slow();
		//opo.move_very_slow();
		measured_wl = await move_ir_and_measure(2 * desired_wl - measured_wl);
		//measured_wl = await move_ir_and_measure(desired_wl + 0.01 * (2 * (wl_difference > 0) - 1));
		if (!measured_wl) {
			// Couldn't get nIR measurement - move to next energy
			return false_measurement;
		}
		// Calculate the excitation IR energy (cm^-1)
		measured_energies = convert_nir(measured_wl);
		// Don't want to iterate movement more than once - move on
		opo.move_fast();
	}

	// Add desired mode to measured_energies
	measured_energies.desired_mode = desired_mode;

	return measured_energies;
}*/

/**
 * Move OPO to desired energy including iterations to maximize accuracy
 * @param {number} desired_energy - Desired IR energy in wavenumbers (cm-1)
 * @returns {object} - Object containing desired IR mode and IR energies converted from measured nIR
 */
async function move_to_ir(energy) {
	let false_measurement = {
		desired_mode: "nir",
		nir: { wavelength: 0, wavenumber: 0 },
		iir: { wavelength: 0, wavenumber: 0 },
		mir: { wavelength: 0, wavenumber: 0 },
		fir: { wavelength: 0, wavenumber: 0 },
	};
	// First, need to figure out the discrepancy between the wavelength the OPO/A thinks it is at vs where it actually is
	// Ask OPO what wavelength it is at
	let opo_wavelength = await new Promise((resolve) => {
		wmEmitter.once(wmMessages.Alert.Current_Wavelength, (value) => {
			resolve(value);
		});
		opo.get_wavelength();
	});
	// Measure actual wavelength
	let current_wavelength = await measure_wavelength(opo_wavelength);
	let wl_difference = current_wavelength - opo_wavelength || 0; // Set the wl difference as 0 in case there was a problem measuring wavelength

	// Next, calculate the wavelength we want to move to
	let [desired_nir, desired_mode] = laser.excitation.get_nir(energy);
	if (!desired_nir) return false_measurement; // Desired energy is not achievable, return

	// If the wavelength is near where we currently are, have the OPO move slowly (otherwise move at default speed)
	if (Math.abs(desired_nir - opo_wavelength) < 5) opo.set_speed(0.05);
	else opo.set_speed(); // Set to default value

	// Move OPO to desired wavelength, accounting for wavelength discrepancy
	console.log("Go To parameter:", desired_nir - wl_difference, desired_nir, wl_difference);
	if (Math.abs(wl_difference) > 10) wl_difference = 0;
	opo.goto_nir(desired_nir - wl_difference);
	await wait_for_motors(); // Wait for motors to finish moving
	// Measure current wavelength
	let final_wavelength = await measure_wavelength(desired_nir);
	let measured_energies = convert_nir(final_wavelength);
	// Add desired mode to measured_energies
	measured_energies.desired_mode = desired_mode;

	// Finally, reset OPO speed to default value
	opo.set_speed();

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
					if (wl !== measured_values[measured_values.length - 1]) {
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
		if (fail_count > measured_value_length) {
			// Stop wavemeter measurement
			wavemeter.stopMeasurement();
			console.log(`Wavelength measurement: ${fail_count} failed measurements - Canceled`);
			return 0;
		}
		// Check if there were too many bad measurements
		if (bad_measurements >= 10 * measured_value_length) {
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
	const absorption_display_ctx = document.getElementById("IRAbsorptionPlot").getContext("2d");
	absorption_display = new Chart(absorption_display_ctx, absorption_config);
	update_absorption_plot();
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
	electrons.update(centroid_results);
	update_counter_displays();
	// Add electrons to accumulated image and update display
	scan.accumulated_image.update(centroid_results);
	update_accumulated_image_display();
	// Check if camera frame should be saved to file
	scan.single_shot.check(centroid_results);
	// Check if auto-stop is triggered
	electrons.total.auto_stop.check();
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

async function sleep(delay_ms) {
	return new Promise(resolve => {
		setTimeout(resolve, delay_ms);
	});
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
/*function run_progress_bar() {
	const progress_bar = document.getElementById("ProgressBar");
	progress_bar.style.width = "100%";

	for (let i = 0; i <= 100; i += 10) {

	}
}*/

async function action_mode_step(ir_energy) {
	// Update scan status
	scan.action_mode.status.running = true;
	scan.status.action_image = true;
	scan.status.method = "ir-sevi";

	electrons.total.auto_stop.method = "electrons";
	electrons.total.auto_stop.update(1);

	opo.move_fast();
	[desired_wl, desired_mode] = laser.excitation.get_nir(ir_energy);
	if (!desired_wl) {
		console.log(`Could not move to ${ir_enrgy} cm-1`);
		return;
	}
	await move_ir_and_measure(desired_wl);
	// Switch to moving slowly
	opo.move_slow();
	// Move nIR wavelength to get desired energy
	let measured_energies = await move_to_ir(ir_energy);
	// Start taking data
	console.log("Starting an IR SEVI scan");
	start_sevi_scan();
	// Wait for scan to finish
	console.log("Waiting for SEVI scan to complete");
	await wait_for_sevi_scan();
	console.log("SEVI scan completed!");
	console.log(measured_energies[desired_mode]);

	// Update scan status
	scan.action_mode.status.running = false;
	scan.status.action_image = false;
}

/*

	R2PD Action Mode

*/

const R2PD = {
	data: {
		energies: [],
		electrons_off: [],
		electrons_on: [],
		current: {
			off: 0,
			on: 0,
			off_frames: 0,
			on_frames: 0,
		},
	},
	params: {
		start_energy: 0,
		end_energy: 0,
		spacing: 0,
		frames: 0,
	},
	status: {
		running: false,
		paused: false,
		cancel: false,
	},
	reset: () => {
		R2PD.data.energies = [];
		R2PD.data.electrons_off = [];
		R2PD.data.electrons_on = [];
		R2PD.reset_current();
	},
	reset_current: () => {
		R2PD.data.current.on = 0;
		R2PD.data.current.off = 0;
		R2PD.data.current.frames_on = 0;
		R2PD.data.current.frames_off = 0;
	},
	save: (file_name) => {
		let file = file_name || "R2PD_Action.txt";
		let save_path = path.join(settings.save_directory.full_dir, file);
		let save_str = `Start: ${R2PD.params.start_energy} cm-1, end: ${R2PD.params.end_energy} cm-1, spacing: ${R2PD.params.spacing} cm-1, frames: ${R2PD.params.frames} \n`;
		save_str += "mIR energy (cm-1) \t | electrons on \t | electrons off \n";
		for (let i = 0; i < R2PD.data.energies.length; i++) {
			save_str += `${R2PD.data.energies[i].toFixed(3)} \t ${R2PD.data.electrons_on[i]} \t ${R2PD.data.electrons_off[i]} \n`;
		}
		fs.writeFile(save_path, save_str, (error) => {
			if (error) console.log(error);
			else console.log(`R2PD spectrum saved under ${file}`);
		});
	},
};

async function R2PD_scan(starting_energy, ending_energy, spacing = 1, frames = 30) {
	// Save parameters
	R2PD.params.start_energy = starting_energy;
	R2PD.params.end_energy = ending_energy;
	R2PD.params.spacing = spacing;
	R2PD.params.frames = frames;
	R2PD.reset();
	// Scan
	let energy = starting_energy;
	let this_energy;
	while (energy <= ending_energy) {
		if (R2PD.status.cancel) {
			return;
		}
		console.log(`R2PD: Moving to ${energy}`);
		// Move laser to proper energy
		let measured_energies = await move_to_ir(energy);
		this_energy = measured_energies[measured_energies.desired_mode].wavenumber;
		R2PD.data.energies.push(this_energy);
		console.log(`R2PD: Measured energy: ${this_energy}`);
		// Set up event listener to catch new camera frames
		ipc.on("new-camera-frame", R2PD_camera_frame);
		console.log("R2PD: Collecting electrons...");
		await wait_for_R2PD_step();
		R2PD.reset_current();
		ipc.removeListener("new-camera-frame", R2PD_camera_frame);
		energy += spacing;
	}
	R2PD.save();
}

function R2PD_camera_frame(event, centroid_results) {
	let electrons;
	if (R2PD.status.paused) {
		return;
	}
	if (centroid_results.is_led_on) {
		// IR On frame
		if (R2PD.data.current.frames_on < R2PD.params.frames) {
			electrons = centroid_results.ccl_centers.length + centroid_results.hybrid_centers.length;
			R2PD.data.current.on += electrons;
			R2PD.data.current.frames_on++;
		}
	} else {
		// IR Off frame
		if (R2PD.data.current.frames_off < R2PD.params.frames) {
			electrons = centroid_results.ccl_centers.length + centroid_results.hybrid_centers.length;
			R2PD.data.current.off += electrons;
			R2PD.data.current.frames_off++;
		}
	}
	if (R2PD.data.current.frames_on >= R2PD.params.frames && R2PD.data.current.frames_off >= R2PD.params.frames) {
		R2PD.data.electrons_on.push(R2PD.data.current.on);
		R2PD.data.electrons_off.push(R2PD.data.current.off);
		wmEmitter.emit("R2PD-done");
	}
}

async function wait_for_R2PD_step() {
	await new Promise((resolve) => {
		wmEmitter.once("R2PD-done", resolve);
	});
}


const power_measurement = {
	data: {
		energies: [],
		power: [],
		stdev: [],
	},
	params: {
		start_energy: 0,
		end_energy: 0,
		spacing: 0,
		measurements: 50,
	},
	status: {
		running: false,
		paused: false,
		cancel: false,
	},
	reset: () => {
		power_measurement.data.energies = [];
		power_measurement.data.power = [];
		power_measurement.data.stdev = [];
	},
	save: (file_name) => {
		let file = file_name || "Power_measurement.txt";
		let save_path = path.join(settings.save_directory.full_dir, file);
		let save_str = `Start: ${power_measurement.params.start_energy} cm-1, end: ${power_measurement.params.end_energy} cm-1, spacing: ${power_measurement.params.spacing} cm-1, measurements: ${power_measurement.params.measurements} \n`;
		save_str += "mIR energy (cm-1) \t | power \t | st. dev. \n";
		for (let i = 0; i < power_measurement.data.energies.length; i++) {
			save_str += `${power_measurement.data.energies[i].toFixed(3)} \t ${power_measurement.data.power[i].toFixed(4)} \t ${power_measurement.data.stdev[i].toFixed(6)} \n`;
		}
		fs.writeFile(save_path, save_str, (error) => {
			if (error) console.log(error);
			else console.log(`Power Measurement saved under ${file}`);
		});
	},
}

async function get_opo_power(measurements) {
	let power_array = [];
	let count = measurements || 50;
	for (let i = 0; i < count; i++) {
		await new Promise((resolve) => {
			opoEmitter.once(opoMessages.Alert.Power, (power) => {
				if (power && !isNaN(power)) {
					power_array.push(power);
				}
				resolve();
			});
			opo.network.client.write(opo.network.command.get_power, () => {});
		});
		await sleep(100);
	}
	return average(power_array);
}

async function power_measurement_scan(starting_energy, ending_energy, spacing = 1, measurements = 50) {
	if (!opo.status.connected) {
		opo.network.connect();
	}
	console.time("Power");
	// Save parameters
	power_measurement.params.start_energy = starting_energy;
	power_measurement.params.end_energy = ending_energy;
	power_measurement.params.spacing = spacing;
	power_measurement.params.measurements = measurements;
	power_measurement.reset();
	// Scan
	let energy = starting_energy;
	let this_energy;
	while (energy <= power_measurement.params.end_energy) {
		if (power_measurement.status.cancel) {
			return;
		}
		while (power_measurement.status.paused) {
			await sleep(1000);
		}
		console.log(`Power measurement: Moving to ${energy}`);
		// Move laser to proper energy
		let measured_energies = await move_to_ir(energy);
		this_energy = measured_energies[measured_energies.desired_mode].wavenumber;
		power_measurement.data.energies.push(this_energy);
		console.log(`power_measurement: Measured energy: ${this_energy}`);
		// Measure power
		let [avg, stdev] = await get_opo_power(power_measurement.params.measurements);
		power_measurement.data.power.push(avg);
		power_measurement.data.stdev.push(stdev);
		energy += power_measurement.params.spacing;
	}
	console.timeEnd("Power");
	power_measurement.save();
}