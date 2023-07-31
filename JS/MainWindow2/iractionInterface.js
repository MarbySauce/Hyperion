/************************************************** 

			Control for IR Action UI elements

**************************************************/

/*****************************************************************************

							SCAN CONTROL

*****************************************************************************/

function IRAction_Scan_Control() {}

/*****************************************************************************

							SCAN OPTIONS

*****************************************************************************/

function IRAction_Scan_Options() {}

/*****************************************************************************

							SCAN STATUS

*****************************************************************************/

function IRAction_Scan_Status() {
	// Hide IR Action Status Current Energy and Next Energy elements
	const elements = [
		"IRActionStatusCurrentEnergyNIRLabel",
		"IRActionCurrentWavelength",
		"IRActionStatusNMLabel1",
		"IRActionStatusArrow1",
		"IRActionStatusCurrentEnergyIRLabel",
		"IRActionCurrentWavenumber",
		"IRActionStatusWNLabel1",
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

/*****************************************************************************

						ACCUMULATED IMAGE DISPLAY

*****************************************************************************/

function IRAction_Accumulated_Image_Display(PageInfo) {
	const ipc = require("electron").ipcRenderer;
	const { IPCMessages } = require("../Messages.js");
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

	document.getElementById("IRActionDisplaySlider").oninput = function () {
		const display_slider = document.getElementById("IRActionDisplaySlider");
		IMMessenger.update.image_contrast(display_slider.value);
		// Update image display
		update_iraction_accumulated_image_display();
	};

	/****
			IPC Event Listeners
	****/

	ipc.on(IPCMessages.UPDATE.NEWFRAME, async () => {
		// If user is not on IR Action tab, ignore
		if (PageInfo.current_tab !== Tabs.IRACTION) return;
		// Only update display if image is being taken
		if (IMMessenger.information.status.running) {
			update_iraction_accumulated_image_display();
		}
	});

	/****
			Image Manager Listeners
	****/

	IMMessenger.listen.info_update.image_contrast.on((value) => {
		const display_slider = document.getElementById("IRActionDisplaySlider");
		display_slider.value = value;
	});

	// Update accumulated image display when scan is reset
	IMMessenger.listen.event.scan.reset.on(update_iraction_accumulated_image_display);

	/****
			Functions
	****/

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
}

/*****************************************************************************

						ELECTRON/FRAME COUNTS

*****************************************************************************/

function IRAction_Counts() {
	const { ImageManagerMessenger } = require("./Libraries/ImageManager.js");
	const IMMessenger = new ImageManagerMessenger();

	/****
			Image Manager Listeners
	****/

	IMMessenger.listen.info_update.image.counts.on(update_iraction_counters);

	//IMMessenger.listen.info_update.autostop.progress.on(update_irsevi_image_progress_bar);

	//IMMessenger.listen.event.scan.stop.on(() => {
	//	// Update progress bar to 100% if running
	//});

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

function IRAction_Load_Page(PageInfo) {
	// Wrapping these in try/catch so that rest of program can still load
	//	even if somemodules are buggy
	try {
		IRAction_Scan_Control();
	} catch (error) {
		console.log("Cannot load IR Action tab Scan Controls module:", error);
	}
	try {
		IRAction_Scan_Options();
	} catch (error) {
		console.log("Cannot load IR Action tab Scan Options module:", error);
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
