/*
	This is a list of all functions used in main window Renderer

	For some reason it's necessary to wrap .onclick and .oninput functions with function(){}
*/

/*


*/
/*			Event Listeners			*/
/*


*/

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
	// Save functions as hitting save button but without saving
	sevi_start_save_button(true);
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
};
document.getElementById("ImageCounterUp").onclick = function () {
	uptick_image_counter();
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

document.getElementById("IRActionPageDown").onclick = function () {
	switch_pages(1); // Switch to second page
};
document.getElementById("IRActionPageUp").onclick = function () {
	switch_pages(0); // Switch to first page
};

/*		Settings		*/

document.getElementById("SaveSettingsButton").onclick = function () {
	// Save settings button
	SaveSettings();
};

/*


*/
/*			Event Listener Functions			*/
/*


*/

/*		Startup		*/

// Execute various functions on application startup
function startup() {
	// Go to Sevi Mode tab (ID = 0)
	switch_tabs(0);

	// Update Autosave button On/Off text
	update_autosave_button_text();

	// Generate image file names and display
	scan.saving.get_file_names();
	display_file_names();
}

/*		Tabs		*/

// Depress all of the buttons (to behave like a radio button)
// and then activate the tab 'Tab'
function switch_tabs(tab) {
	// Tab name should be an integer corresponding to the index of tabList
	// 		Some tabs are left empty and can be filled in if a new tab is added in the future
	// 0 => SEVI mode, 1 => IR-SEVI Mode, 2 => IR Action Mode,
	// 3 => blank, 4 => blank, 5 => blank, 6 => blank, 7 => blank,
	// 8 => Settings section
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

	// If a scan is not currently being taken, switch the scan method (if relevant)
	let sevi_methods = ["sevi", "ir-sevi", "ir-action"];
	if (!scan.status.running && sevi_methods[tab]) {
		scan.status.method = sevi_methods[tab];
	}

	// If chosen tab is Sevi or IR-Sevi mode, we have to do a bit more
	// since IR-SEVI is just Sevi with a few more elements shown
	if (tab <= 1) {
		// Remove class of the tab not chosen (e.g. remove "sevi-mode" if ir-sevi chosen)
		content_list[tab].classList.remove(sevi_methods[(tab + 1) % 2] + "-mode");
		// Add class of the chosen tab
		content_list[tab].classList.add(sevi_methods[tab] + "-mode");
	}

	// Lastly, make sure we switch to the first page (if there are two)
	switch_pages(0);
}

// Switch between first and second page
function switch_pages(page_index) {
	// page_index = 0 to switch to first page, 1 to switch to second
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
		if (spectrum_display) {
			destroy_spectrum_plot();
		}
	} else if (page_index === 1) {
		// Display second page
		first_page.style.display = "none";
		second_page.style.display = "grid";
	}
}

/* Sevi and IR-Sevi Modes */

/**
 * Functionality for Sevi Mode Start/Save button
 * @param {bool} dont_save - If true, stops scan as if saving but without saving
 */
function sevi_start_save_button(dont_save) {
	// Since the scan running status gets changed in the process, we need a constant value
	//	that tells whether the scan was just started or ended
	let was_running = scan.status.running;
	// Start or stop the scan (and save if stopped)
	update_scan_running_status(was_running, !dont_save);
	// Change button text appropriately
	update_start_save_button(was_running);
	if (!was_running) {
		// Make sure pause button says "pause" if a scan is started
		update_pause_resume_button("resume");
	}
	update_file_name_display(was_running);
	// Reset electron and frame counts if new scan started
	electrons.total.reset(was_running);
	// Reset accumulated image if new scan started
	scan.accumulated_image.reset(was_running);
	// Start autosave timer if new scan started
	scan.saving.start_timer(was_running);
	// Update scan ID's
	update_scan_id(was_running);
}

// Update Start/Save button on press
// was_running is bool that says whether a scan was running when button pressed
function update_start_save_button(was_running) {
	const start_button_text = document.getElementById("ScanStartSaveText");

	// If a scan has not been started, change text to "Save"
	//	otherwise change to "Start"
	if (was_running) {
		start_button_text.innerText = "Start";
		// Since we just saved an image, increase the image counter as well
		uptick_image_counter();
		// Change Pause button to say Resume to give user option to resume the scan that was saved
		update_pause_resume_button("pause");
		// If scan was paused while saved, update pause status
		if (scan.status.paused) {
			// Remove gray-out display
			update_pause_screen_overlay("resume");
			// Update display again to get rid of pause icon
			update_accumulated_image_display(true);
			scan.status.paused = false;
		}
	} else {
		start_button_text.innerText = "Save";
	}
}

/**
 * Update the scan "running" status
 * @param {bool} was_running - whether a scan was running when button pressed
 * @param {bool} if_save - whether to save image/spectra to file
 */
function update_scan_running_status(was_running, if_save) {
	// First check if we need to save (i.e. if a scan just finished)
	if (was_running && if_save) {
		scan.accumulated_image.save();
	}
	// Change running status
	scan.status.running = !was_running;
}

/**
 * Pause if a scan is currently being taken, resume if a scan was paused or saved
 */
function sevi_pause_resume_button() {
	// Check if a scan is currently being taken
	if (scan.status.running) {
		// Scan is running. Pause if not already, otherwise un-pause
		if (scan.status.paused) {
			// Update button text
			update_pause_resume_button("resume");
			update_pause_screen_overlay("resume");
			// Resume scan
			scan.status.paused = false;
		} else {
			// Update button text
			update_pause_resume_button("pause");
			update_pause_screen_overlay("pause");
			// Pause scan
			scan.status.paused = true;
		}
	} else {
		// A scan was not running. If an earlier scan is in memory, resume it
		if (scan.accumulated_image.images.ir_off.length > 0 && electrons.total.e_count.ir_off > 0) {
			// Update button text
			update_start_save_button(false);
			update_pause_resume_button("resume");
			// Downtick counter to match earlier image
			downtick_image_counter();
			// Start autosave timer if new scan started
			scan.saving.start_timer(false);
			// Update scan ID's
			update_scan_id(false);
			// Change running status
			scan.status.running = true;
		}
		// If there is not an earlier scan in memory, do nothing
	}
}

/**
 * Change Pause button text
 * @param {string} action - Either "pause" if scan was just paused or "resume" if just resumed
 * (Button text will be changed to the opposite of action)
 */
function update_pause_resume_button(action) {
	const pause_button_text = document.getElementById("ScanPauseResumeText");

	if (action === "pause") {
		// The scan was paused, change text to "Resume"
		pause_button_text.innerHTML = "Resume";
	} else if (action === "resume") {
		// Scan was resumed, change text to "Pause"
		pause_button_text.innerHTML = "Pause";
	}
}

/**
 * Gray out display if paused
 * @param {string} action - Either "pause" if scan was just paused or "resume" if just resumed
 * (Will gray out for "pause" and remove for "resume")
 */
function update_pause_screen_overlay(action) {
	const sevi_content = document.getElementById("SeviModeContent");

	if (action === "pause") {
		// Scan was paused, gray out display to make this clear
		sevi_content.classList.add("paused");
		// Add pause icon
		draw_pause_icon();
	} else if (action === "resume") {
		// Scan was resumed, take away gray-out
		sevi_content.classList.remove("paused");
	}
}

/**
 * Draw a pause icon on the canvas
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
 * If a scan is running, continuously show the filename(s) that will be saved (only for Sevi and IR-Sevi)
 * @param {boolean} was_running - Whether a scan was running when function executed
 */
function update_file_name_display(was_running) {
	const ir_on_file = document.getElementById("CurrentImageFileIR");
	if (scan.status.method === "sevi") {
		if (!was_running) {
			// Sevi mode scan just started, add CSS class to ir_on file name s.t. it doesn't show even on IR-Sevi tab
			ir_on_file.classList.add("do-not-show-file");
		} else {
			// Sevi mode scan just ended, take away above CSS class
			ir_on_file.classList.remove("do-not-show-file");
		}
	} else if (scan.status.method === "ir-sevi") {
		if (!was_running) {
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

// Increment the image counter up by one
function uptick_image_counter() {
	const image_counter = document.getElementById("ImageCounter");
	let current_counter_val = parseInt(image_counter.value);
	current_counter_val++;
	image_counter.value = current_counter_val;
	// Update the image ID in scan.saving
	update_scan_id(true);
	// Update file names
	display_file_names();
}

// Decrement the image counter by one
function downtick_image_counter() {
	const image_counter = document.getElementById("ImageCounter");
	let current_counter_val = parseInt(image_counter.value);
	if (current_counter_val === 1) {
		// Don't lower below 1
		return;
	}
	current_counter_val--;
	image_counter.value = current_counter_val;
	// Update the image ID in scan.saving
	update_scan_id(true);
	// Update file names
	display_file_names();
}

// Update the ID used for scan saving and PE Spectrum display
function update_scan_id(was_running) {
	const image_counter = document.getElementById("ImageCounter");
	let image_id = parseInt(image_counter.value);
	if (was_running) {
		// Image was just saved, update the scan saving ID
		scan.saving.image_id = image_id;
		// Also update file names in scan.saving
		scan.saving.get_file_names();
	} else {
		// A new image just started, update the PE Spectrum ID
		scan.accumulated_image.spectra.params.image_id = image_id;
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
	converted_wavelength.value = laser.excitation.wavelength[laser.excitation.mode].toFixed(3);
	converted_wavenumber.value = laser.excitation.wavenumber[laser.excitation.mode].toFixed(3);
	// If nIR mode was chosen, shouldn't show converted wavelength
	if (laser.excitation.mode === "nir") {
		converted_wavelength.value = "";
	}
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

// Update electron counter displays
function update_counter_displays() {
	const total_frames = document.getElementById("TotalFrames");
	const total_frames_ir = document.getElementById("TotalFramesIROn");
	const total_e_count = document.getElementById("TotalECount");
	const total_e_count_ir = document.getElementById("TotalECountIROn");
	const avg_e_count = document.getElementById("AvgECount");
	const avg_e_count_ir = document.getElementById("AvgECountIROn");

	let frame_count_off = electrons.total.frame_count.ir_off;
	let frame_count_on = electrons.total.frame_count.ir_on;
	let e_count_off = electrons.total.e_count.ir_off;
	let e_count_on = electrons.total.e_count.ir_on;
	let avg_off = electrons.average.mode.ir_off_value;
	let avg_on = electrons.average.mode.ir_on_value;

	// If on Sevi mode tab, total values = ir_off + ir_on
	if (page_info.current_tab === 0) {
		total_frames.value = frame_count_off + frame_count_on;
		//total_e_count.value = e_count_off + e_count_on;
		total_e_count.value = electrons.total.e_count.get_count("total");
		avg_e_count.value = ((avg_off + avg_on) / 2).toFixed(2);
	} else {
		total_frames.value = frame_count_off;
		total_frames_ir.value = frame_count_on;
		//total_e_count.value = e_count_off;
		//total_e_count_ir.value = e_count_on;
		total_e_count.value = electrons.total.e_count.get_count("ir_off");
		total_e_count_ir.value = electrons.total.e_count.get_count("ir_on");
		avg_e_count.value = avg_off.toFixed(2);
		avg_e_count_ir.value = avg_on.toFixed(2);
	}
}

function sevi_automatic_stop_input() {
	const auto_stop = document.getElementById("AutomaticStop");
	let value = parseFloat(auto_stop.value);
	electrons.total.auto_stop.update(value);
}

function sevi_automatic_stop_selection() {
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

// Create chart to plot PE Spectrum
function create_spectrum_plot() {
	const spectrum_display_ctx = document.getElementById("PESpectrum").getContext("2d");
	spectrum_display = new Chart(spectrum_display_ctx, spectrum_config);
	process_melexir_results();
}

// Destroy PE Spectrum chart
function destroy_spectrum_plot() {
	spectrum_display.destroy();
	spectrum_display = null;
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

// NOTE TO MARTY: Maybe have the scaling done in a fn in scan that returns the arrays to plot

// Run Melexir in Web Worker
function run_melexir() {
	// If the worker was already created, it must still be running, so just return
	if (melexir_worker) {
		return;
	}
	// If there are no accumulated images made, return
	if (scan.accumulated_image.images.ir_off.length === 0) {
		return;
	}
	melexir_worker = new Worker("../JS/worker.js");
	// Disable calculate button
	change_pes_calculate_text(true);
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
		// Process the results
		process_melexir_results();
		// Terminate worker
		melexir_worker.terminate();
		melexir_worker = null;
		// Re-enable calculate button
		change_pes_calculate_text(false);
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

// Change PES Calculate button display while calculating
function change_pes_calculate_text(is_still_calculating) {
	const calculate_button = document.getElementById("CalculateSpectrumButton");
	if (is_still_calculating) {
		// Calculation is running
		calculate_button.innerText = "Calculating...";
		// Disable button
		calculate_button.disabled = true;
	} else {
		// Calculation is finished
		calculate_button.innerText = "Calculate";
		// Enable button
		calculate_button.disabled = false;
	}
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

// If showing PES eBE plot, apply Jacobian (to account for R -> eKE conversion) and normalize
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

// Convert PES radial plot to eBE plot
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

// Reverse the x axis (to account for R -> eBE conversion)
function reverse_pes_x_axis() {
	// Reverse eBE array
	scan.accumulated_image.spectra.data.ebe_values.reverse();
	// Reverse ir_off and ir_on intensities
	scan.accumulated_image.spectra.data.normalized.ir_off_intensity.reverse();
	// If ir_on is empty, this function still behaves fine, so no need to check
	scan.accumulated_image.spectra.data.normalized.ir_on_intensity.reverse();
}

// Display PE Spectrum on chart
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

// Update x display range of PES Spectrum
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

/*


*/
/*			IPC Messages			*/
/*


*/

// Recieve setting information and go through startup procedure
ipc.on("settings-information", (event, settings_information) => {
	settings = settings_information;
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

/*


*/
/*			Various Functions			*/
/*


*/

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

/* Should move functions to the most related section */

// Format current date as MMDDYY
function getFormattedDate() {
	let today = new Date();
	let formattedDay = ("0" + today.getDate()).slice(-2);
	let formattedMonth = ("0" + (today.getMonth() + 1)).slice(-2);
	let formattedYear = today.getFullYear().toString().slice(-2);
	return formattedMonth + formattedDay + formattedYear;
}

// Format file name as MMDDYY_iXX_1024.i0N
function getCurrentFileName(ionCounter) {
	let todaysDate = getFormattedDate();
	// Slice here makes sure 0 is not included if ionCounter > 9
	let increment = ("0" + ionCounter).slice(-2);
	let fileString = `${todaysDate}i${increment}_1024.i0N`;
	let fileStringIR = `${todaysDate}i${increment}_IR_1024.i0N`;

	// Update file name in scan information
	scanInfo.fileName = fileString;
	scanInfo.fileNameIR = fileStringIR;

	// Check if that image already exists
	checkCurrentFile();

	return fileString;
}

// Check if file in Current File exists
function checkCurrentFile() {
	const currentFile = document.getElementById("CurrentFile");
	let fileName = settings.saveDirectory.currentScan + "/" + scanInfo.fileName;
	let fileNameIR = settings.saveDirectory.currentScan + "/" + scanInfo.fileNameIR;
	if (fs.existsSync(fileName) || fs.existsSync(fileNameIR)) {
		currentFile.title = "File already exists!";
		currentFile.style.color = "red";
		currentFile.style.border = "1pt solid red";
	} else {
		currentFile.title = null;
		currentFile.style.color = "white";
		currentFile.style.border = "1px solid rgb(62, 71, 95)";
	}
}

// ----------------------------------------------- //
