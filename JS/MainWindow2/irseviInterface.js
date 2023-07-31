/************************************************** 

			Control for IR-SEVI UI elements

**************************************************/

/*****************************************************************************

							SCAN CONTROL

*****************************************************************************/

function IRSevi_Scan_Control() {
	const { ImageManagerMessenger } = require("./Libraries/ImageManager.js");
	const IMMessenger = new ImageManagerMessenger();
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
		//autosave_button();
	};
	document.getElementById("IRSeviScanReset").onclick = function () {
		IMMessenger.request.scan.reset();
	};
	document.getElementById("IRSeviScanSingleShot").onclick = function () {
		// Single shot
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

function IRSevi_Laser_Control() {}

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

	document.getElementById("IRSeviDisplaySlider").oninput = function () {
		const display_slider = document.getElementById("IRSeviDisplaySlider");
		IMMessenger.update.image_contrast(display_slider.value);
		// Update image display
		update_irsevi_accumulated_image_display();
	};

	/****
			IPC Event Listeners
	****/

	ipc.on(IPCMessages.UPDATE.NEWFRAME, async () => {
		// If user is not on SEVI tab, ignore
		if (PageInfo.current_tab !== Tabs.IRSEVI) return; // PageInfo is from interface.js
		// Only update display if image is being taken
		if (IMMessenger.information.status.running) {
			update_irsevi_accumulated_image_display();
		}
	});

	/****
			Image Manager Listeners
	****/

	IMMessenger.listen.info_update.image_contrast.on((value) => {
		const display_slider = document.getElementById("IRSeviDisplaySlider");
		display_slider.value = value;
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
}

/*****************************************************************************

						ELECTRON/FRAME COUNTS

*****************************************************************************/

function IRSevi_Counts() {
	const { InputDelay } = require("./Libraries/InputDelay.js");
	const { ImageManagerMessenger, AutostopMethod } = require("./Libraries/ImageManager.js");
	const IMMessenger = new ImageManagerMessenger();

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
	IMMessenger.listen.event.scan.stop.on(() => {
		remove_scan_running_from_irsevi_counters();
		hide_irsevi_image_progress_bar();
	});
	IMMessenger.listen.event.scan.cancel.on(() => {
		remove_scan_running_from_irsevi_counters();
		hide_irsevi_image_progress_bar();
	});

	/****
			Functions
	****/

	// Add "scan-running" class to counters section (used for image progress bar)
	function add_scan_running_to_irsevi_counters() {
		const sevi_counters = document.getElementById("IRSeviCounters");
		sevi_counters.classList.add("scan-running");
	}

	// Remove "scan-running" class from counters section (used for image progress bar)
	function remove_scan_running_from_irsevi_counters() {
		const sevi_counters = document.getElementById("IRSeviCounters");
		sevi_counters.classList.remove("scan-running");
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
		const sevi_counters = document.getElementById("IRSeviCounters");
		sevi_counters.classList.remove("hide-progress-bar");
		sevi_counters.classList.add("show-progress-bar");
	}

	function hide_irsevi_image_progress_bar() {
		const sevi_counters = document.getElementById("IRSeviCounters");
		sevi_counters.classList.remove("show-progress-bar");
		sevi_counters.classList.add("hide-progress-bar");
	}
}

/*****************************************************************************

							PAGE CONTROL

*****************************************************************************/

function IRSevi_Load_Page(PageInfo) {
	const irsevi_controls = document.getElementById("IRSeviScanControls");
	if (settings?.image_series.show_menu) irsevi_controls.classList.remove("hide-image-series");
	else irsevi_controls.classList.add("hide-image-series");

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
}

/*****************************************************************************

							EXPORTING

*****************************************************************************/

module.exports = { IRSevi_Load_Page };
