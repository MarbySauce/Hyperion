/************************************************** 

			Control for SEVI UI elements

**************************************************/

const { PESpectrum } = require("./Libraries/PESpectrumClasses.js");

/*************************************************************************************************

								*****************************
								*	SEVI MODE FIRST PAGE	*
								*****************************

*************************************************************************************************/

/*****************************************************************************

							SCAN CONTROL

*****************************************************************************/

function Sevi_Scan_Control() {
	const { UpdateMessenger } = require("./Libraries/UpdateMessenger.js");
	const { ImageManagerMessenger } = require("./Libraries/ImageManager.js");

	const update_messenger = new UpdateMessenger();
	const IMMessenger = new ImageManagerMessenger();

	/* Execute on initial page load */
	if (IMMessenger.information.autosave.params.on) change_sevi_autosave_button_to_on();
	else change_sevi_autosave_button_to_off();

	/****
			HTML Element Listeners
	****/

	document.getElementById("SeviScanStartSave").onclick = function () {
		// Check if there is a scan being taken or not
		if (IMMessenger.information.status.stopped) IMMessenger.request.scan.start();
		else IMMessenger.request.scan.stop();
	};
	document.getElementById("SeviScanPauseResume").onclick = function () {
		if (IMMessenger.information.status.running) IMMessenger.request.scan.pause();
		else IMMessenger.request.scan.resume(true);
	};
	document.getElementById("SeviScanCancel").onclick = function () {
		IMMessenger.request.scan.cancel();
	};
	document.getElementById("SeviScanAutosave").onclick = function () {
		// Toggle autosave
		let autosave_on = IMMessenger.information.autosave.params.on;
		IMMessenger.update.autosave({ on: !autosave_on });
	};
	document.getElementById("SeviScanReset").onclick = function () {
		IMMessenger.request.scan.reset();
	};
	document.getElementById("SeviScanSingleShot").onclick = function () {
		IMMessenger.request.single_shot();
	};

	document.getElementById("SeviImageSeries").oninput = function () {
		IMMessenger.update.image_series(document.getElementById("SeviImageSeries").selectedIndex + 1);
	};

	/****
			Image Manager Listeners
	****/

	// Image has been started
	IMMessenger.listen.event.scan.start.on(() => {
		change_sevi_button_to_save();
		change_sevi_button_to_pause();
		// Add scan-running class to controls section when a scan starts (used for image series collection)
		add_scan_running_to_sevi_controls();
	});

	// Image has been stopped
	IMMessenger.listen.event.scan.stop.on(() => {
		change_sevi_button_to_start();
		change_sevi_button_to_resume();
		// Remove scan-running class from controls section when a scan stops (used for image series collection)
		remove_scan_running_from_sevi_controls();
	});

	IMMessenger.listen.event.scan.pause.on(() => {
		change_sevi_button_to_resume();
	});

	IMMessenger.listen.event.scan.resume.on(() => {
		change_sevi_button_to_save();
		change_sevi_button_to_pause();
		// Add scan-running class to controls section when a scan starts (used for image series collection)
		add_scan_running_to_sevi_controls();
	});

	IMMessenger.listen.event.scan.cancel.on(() => {
		change_sevi_button_to_start();
		change_sevi_button_to_resume();
		// Remove scan-running class from controls section when a scan stops (used for image series collection)
		remove_scan_running_from_sevi_controls();
	});

	IMMessenger.listen.info_update.autosave.params.on((autosave_params) => {
		if (autosave_params.on) change_sevi_autosave_button_to_on();
		else change_sevi_autosave_button_to_off();
	});

	IMMessenger.listen.info_update.image_series.length.on((collection_length) => {
		document.getElementById("SeviImageSeries").selectedIndex = collection_length - 1;
	});

	IMMessenger.listen.info_update.image_series.remaining.on((remaining) => {
		const remaining_text = document.getElementById("SeviImageSeriesRemainingText");
		remaining_text.innerText = `(${remaining})`;
	});

	/****
			Functions
	****/

	// Change SEVI Start/Save button to Start
	function change_sevi_button_to_start() {
		const start_button_text = document.getElementById("SeviScanStartSaveText");
		start_button_text.innerText = "Start";
	}

	// Change SEVI Start/Save button to Save
	function change_sevi_button_to_save() {
		const start_button_text = document.getElementById("SeviScanStartSaveText");
		start_button_text.innerText = "Save";
	}

	// Change SEVI Pause/Resume button to Pause
	function change_sevi_button_to_pause() {
		const pause_button_text = document.getElementById("SeviScanPauseResumeText");
		pause_button_text.innerText = "Pause";
	}

	// Change SEVI Pause/Resume button to Resume
	function change_sevi_button_to_resume() {
		const pause_button_text = document.getElementById("SeviScanPauseResumeText");
		pause_button_text.innerText = "Resume";
	}

	// Change autosave button to On
	function change_sevi_autosave_button_to_on() {
		const autosave_button_text = document.getElementById("SeviScanAutosaveStatusText");
		autosave_button_text.innerText = "On";
	}

	// Change autosave button to Off
	function change_sevi_autosave_button_to_off() {
		const autosave_button_text = document.getElementById("SeviScanAutosaveStatusText");
		autosave_button_text.innerText = "Off";
	}

	// Add "scan-running" class to controls section (used for image series collection)
	function add_scan_running_to_sevi_controls() {
		const sevi_controls = document.getElementById("SeviScanControls");
		sevi_controls.classList.add("scan-running");
	}

	// Remove "scan-running" class from controls section (used for image series collection)
	function remove_scan_running_from_sevi_controls() {
		const sevi_controls = document.getElementById("SeviScanControls");
		sevi_controls.classList.remove("scan-running");
	}
}

/*****************************************************************************

							FILE NAMING

*****************************************************************************/

function Sevi_File_Naming() {
	const { ImageManagerMessenger } = require("./Libraries/ImageManager.js");
	const IMMessenger = new ImageManagerMessenger();

	/****
			HTML Element Listeners
	****/

	document.getElementById("SeviImageCounterUp").onclick = function () {
		IMMessenger.update.id.increase();
	};
	document.getElementById("SeviImageCounterDown").onclick = function () {
		IMMessenger.update.id.decrease();
	};
	document.getElementById("SeviVMIMode").oninput = function () {
		const vmi_mode = document.getElementById("SeviVMIMode");
		let index = vmi_mode.selectedIndex;
		IMMessenger.update.vmi_info({ index: index });
	};

	/****
			Image Manager Listeners
	****/

	IMMessenger.listen.info_update.image.id.on((id) => {
		update_sevi_image_id(id);
	});

	IMMessenger.listen.info_update.image.file_name.on((file_name) => {
		update_sevi_filename(file_name);
	});

	IMMessenger.listen.info_update.image.vmi_info.on((vmi_info) => {
		update_sevi_vmi(vmi_info);
	});

	/****
			Functions
	****/

	function update_sevi_image_id(image_id) {
		const image_counter = document.getElementById("SeviImageCounter");
		image_counter.value = image_id;
	}

	function update_sevi_filename(filename) {
		const sevi_filename = document.getElementById("SeviCurrentImageFile");
		sevi_filename.value = filename;
	}

	function update_sevi_vmi(vmi_info) {
		const vmi_mode = document.getElementById("SeviVMIMode");
		vmi_mode.selectedIndex = vmi_info.index;
	}
}

/*****************************************************************************

							LASER CONTROL

*****************************************************************************/

function Sevi_Laser_Control() {
	const { InputDelay } = require("./Libraries/InputDelay.js");
	const { DetachmentMode } = require("./Libraries/WavelengthClasses.js");
	const { DetachmentLaserManagerMessenger } = require("./Libraries/DetachmentLaserManager.js");
	const DLMMessenger = new DetachmentLaserManagerMessenger();

	/****
			HTML Element Listeners
	****/

	document.getElementById("SeviWavelengthMode").oninput = function () {
		update_sevi_detachment_mode();
	};

	document.getElementById("SeviMeasureDetachmentWavelength").onclick = function () {
		DLMMessenger.wavemeter.request.measurement.start();
	};

	document.getElementById("SeviMeasureDetachmentWavelengthCancel").onclick = function () {
		DLMMessenger.wavemeter.request.measurement.cancel();
	};

	// Putting timers on typed inputs so that the functions are only run if the user hasn't updated the input in the last second
	// (that way it doesn't execute for each character inputted)

	const update_sevi_detachment_wavelength_delay = new InputDelay(update_sevi_detachment_wavelength);
	document.getElementById("SeviDetachmentWavelength").oninput = function () {
		update_sevi_detachment_wavelength_delay.start_timer();
	};

	/****
			Detachment Laser Manager Listeners
	****/

	DLMMessenger.listen.info_update.energy.on(update_sevi_detachment_energies);

	DLMMessenger.wavemeter.listen.event.measurement.start.on(() => {
		// Disable measure button and show cancel measurement button when measurement is started
		const measure_button = document.getElementById("SeviMeasureDetachmentWavelength");
		const cancel_button = document.getElementById("SeviMeasureDetachmentWavelengthCancel");
		measure_button.disabled = true;
		cancel_button.classList.remove("hidden");
	});

	DLMMessenger.wavemeter.listen.event.measurement.stop.on(() => {
		// Re-enable measure button and hide cancel measurement button when measurement is stopped
		const measure_button = document.getElementById("SeviMeasureDetachmentWavelength");
		const cancel_button = document.getElementById("SeviMeasureDetachmentWavelengthCancel");
		measure_button.disabled = false;
		cancel_button.classList.add("hidden");
	});

	/****
			Functions
	****/

	function update_sevi_detachment_wavelength() {
		const detachment_wavelength = document.getElementById("SeviDetachmentWavelength");
		DLMMessenger.update.standard_wavelength(parseFloat(detachment_wavelength.value));
	}

	function update_sevi_detachment_mode() {
		const detachment_mode = document.getElementById("SeviWavelengthMode");
		const mode_list = [DetachmentMode.STANDARD, DetachmentMode.DOUBLED, DetachmentMode.RAMAN, DetachmentMode.IRDFG];
		DLMMessenger.update.standard_mode(mode_list[detachment_mode.selectedIndex]);
	}

	function update_sevi_detachment_energies(detachment_wl_class) {
		const input_wavelength = document.getElementById("SeviDetachmentWavelength");
		const converted_wavelength = document.getElementById("SeviConvertedWavelength");
		const converted_wavenumber = document.getElementById("SeviDetachmentWavenumber");
		const detachment_mode = document.getElementById("SeviWavelengthMode");
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

		// Update the input box too (in case the values were changed on the IR-SEVI tab)
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
}

/*****************************************************************************

						ACCUMULATED IMAGE DISPLAY

*****************************************************************************/

function Sevi_Accumulated_Image_Display(PageInfo) {
	const ipc = require("electron").ipcRenderer;
	const { IPCMessages } = require("../Messages.js");
	const { ImageType } = require("./Libraries/ImageClasses.js");
	const { Tabs } = require("./Libraries/Tabs.js");
	const { ImageManagerMessenger } = require("./Libraries/ImageManager.js");

	const IMMessenger = new ImageManagerMessenger();

	/****
			HTML Element Listeners
	****/

	document.getElementById("SeviDisplay").onclick = function () {
		const large_display = document.getElementById("LargeDisplaySection");
		large_display.classList.remove("large-display-hidden");
	};

	document.getElementById("SeviDisplaySlider").oninput = function () {
		const display_slider = document.getElementById("SeviDisplaySlider");
		IMMessenger.update.image_contrast(display_slider.value);
		// Update image display
		update_sevi_accumulated_image_display();
	};

	/****
			Image Manager Listeners
	****/

	IMMessenger.listen.info_update.image_contrast.on((value) => {
		const display_slider = document.getElementById("SeviDisplaySlider");
		display_slider.value = value;
	});

	// Update accumulated image when alert is sent
	IMMessenger.listen.info_update.accumulated_image.on(() => {
		// If user is not on SEVI tab, ignore
		if (PageInfo.current_tab !== Tabs.SEVI) return;
		//console.log("Updating");
		update_sevi_accumulated_image_display();
	});

	// Update accumulated image display when scan is reset
	IMMessenger.listen.event.scan.reset.on(update_sevi_accumulated_image_display);

	/****
			Functions
	****/

	function update_sevi_accumulated_image_display() {
		const image_display = document.getElementById("SeviDisplay");
		const ctx = image_display.getContext("2d");
		// Also put image on expanded accumulated image display
		const large_display = document.getElementById("LargeDisplay");
		const large_ctx = large_display.getContext("2d");
		// Get image data
		let image_data = IMMessenger.information.get_image_display(ImageType.IROFF);
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

function Sevi_Counts() {
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
	document.getElementById("SeviCounters").onmouseenter = function () {
		hide_sevi_image_progress_bar();
	};
	document.getElementById("SeviCounters").onmouseleave = function () {
		send_sevi_autostop_value_update(); // In case user updated autostop value while mouse hovering over box
		show_sevi_image_progress_bar();
	};

	// Putting timers on typed inputs so that the functions are only run if the user hasn't updated the input in the last second
	// (that way it doesn't execute for each character inputted)
	const send_sevi_autostop_value_update_delay = new InputDelay(send_sevi_autostop_value_update);
	document.getElementById("SeviAutomaticStop").oninput = function () {
		send_sevi_autostop_value_update_delay.start_timer();
	};

	document.getElementById("SeviAutomaticStopUnit").oninput = function () {
		send_sevi_autostop_unit_update();
	};

	/****
			Image Manager Listeners
	****/

	IMMessenger.listen.info_update.image.counts.on(update_sevi_counters);

	IMMessenger.listen.info_update.autostop.params.on(update_sevi_autostop);
	IMMessenger.listen.info_update.autostop.progress.on(update_sevi_image_progress_bar);

	// Add scan-running class to counters section when a scan starts (used for image progress bar)
	IMMessenger.listen.event.scan.start.on(() => {
		add_scan_running_to_sevi_counters();
		show_sevi_image_progress_bar();
	});
	IMMessenger.listen.event.scan.resume.on(() => {
		add_scan_running_to_sevi_counters();
		show_sevi_image_progress_bar();
	});
	// Remove scan-running class from counters section when a scan stops (used for image progress bar)
	IMMessenger.listen.event.scan.stop.on(() => {
		remove_scan_running_from_sevi_counters();
		hide_sevi_image_progress_bar();
	});
	IMMessenger.listen.event.scan.cancel.on(() => {
		remove_scan_running_from_sevi_counters();
		hide_sevi_image_progress_bar();
	});

	/****
			Average Electron Manager Listeners
	****/

	EAMMessenger.listen.info_update.rolling_20frames.on(update_sevi_average_counters);

	/****
			Functions
	****/

	// Add "scan-running" class to counters section (used for image progress bar)
	function add_scan_running_to_sevi_counters() {
		const sevi_counters = document.getElementById("SeviCounters");
		sevi_counters.classList.add("scan-running");
	}

	// Remove "scan-running" class from counters section (used for image progress bar)
	function remove_scan_running_from_sevi_counters() {
		const sevi_counters = document.getElementById("SeviCounters");
		sevi_counters.classList.remove("scan-running");
	}

	function update_sevi_counters(counts) {
		// counts should look like Image.counts
		// (i.e. counts = { electrons: { on: 0, off: 0, total: 0 }, frames: { on: 0, off: 0, total: 0 } }
		const total_frames = document.getElementById("SeviTotalFrames");
		const total_electrons = document.getElementById("SeviTotalECount");
		let formatted_electrons;
		if (counts.electrons.total > 10000) {
			formatted_electrons = counts.electrons.total.toExponential(3);
		} else {
			formatted_electrons = counts.electrons.total.toString();
		}

		total_frames.value = counts.frames.total;
		total_electrons.value = formatted_electrons;
	}

	/**
	 * @param {Rolling20Frames} r2f_results
	 */
	function update_sevi_average_counters(r2f_results) {
		const avg_electrons = document.getElementById("SeviAvgECount");
		avg_electrons.value = r2f_results.total.total.average.toFixed(2);
	}

	function send_sevi_autostop_value_update() {
		const autostop_value = document.getElementById("SeviAutomaticStop");
		let value = autostop_value.value;
		IMMessenger.update.autostop({ value: value });
	}

	function send_sevi_autostop_unit_update() {
		const autostop_unit = document.getElementById("SeviAutomaticStopUnit");
		const methods = [AutostopMethod.NONE, AutostopMethod.ELECTRONS, AutostopMethod.FRAMES];
		let method = methods[autostop_unit.selectedIndex] || AutostopMethod.NONE; // If selectedIndex is (somehow) out of range, send NONE as method
		IMMessenger.update.autostop({ method: method });
	}

	function update_sevi_autostop(autostop_params) {
		const autostop_value = document.getElementById("SeviAutomaticStop");
		const autostop_unit = document.getElementById("SeviAutomaticStopUnit");
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

	function update_sevi_image_progress_bar(percent) {
		const progress_bar = document.getElementById("SeviImageProgressBar");
		const percent_label = document.getElementById("SeviImageProgressPercentLabel");
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

	function show_sevi_image_progress_bar() {
		// Only show the image progress bar if the current scan is a SEVI scan
		if (IMMessenger.information.image_info.is_ir) return; // Currently an IR-SEVI scan
		// Only show the image progress bar if autostop is in use
		if (!IMMessenger.information.autostop.in_use) return;
		// Show image progress bar
		const sevi_counters = document.getElementById("SeviCounters");
		sevi_counters.classList.remove("hide-progress-bar");
		sevi_counters.classList.add("show-progress-bar");
	}

	function hide_sevi_image_progress_bar() {
		const sevi_counters = document.getElementById("SeviCounters");
		sevi_counters.classList.remove("show-progress-bar");
		sevi_counters.classList.add("hide-progress-bar");
	}
}

/*****************************************************************************

							PAGE CONTROL

*****************************************************************************/

function Sevi_Change_Pages() {
	const { Tabs } = require("./Libraries/Tabs.js");

	/****
			HTML Element Listeners
	****/

	document.getElementById("SeviPageDown").onclick = function () {
		load_sevi_second_page();
	};

	document.getElementById("SeviPageUp").onclick = function () {
		load_sevi_first_page();
	};

	function load_sevi_first_page() {
		const first_page = document.getElementById(Tabs.SEVI.first_page);
		const second_page = document.getElementById(Tabs.SEVI.second_page);
		// Hide second page and show first page
		second_page.style.display = "none";
		first_page.style.display = "grid";
	}

	function load_sevi_second_page() {
		const first_page = document.getElementById(Tabs.SEVI.first_page);
		const second_page = document.getElementById(Tabs.SEVI.second_page);
		// Hide first page and show second page
		first_page.style.display = "none";
		second_page.style.display = "grid";
	}
}

/*************************************************************************************************

								*****************************
								*	SEVI MODE SECOND PAGE	*
								*****************************

*************************************************************************************************/

/*****************************************************************************

					PHOTOELECTRON SPECTRUM DISPLAY

*****************************************************************************/

function Sevi_PESpectrum_Display() {
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

	const radio_name = "SEVI_pe_spectra";

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

	const chart = new Chart(document.getElementById("SeviPESpectrum").getContext("2d"), {
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

	document.getElementById("SeviResetZoom").onclick = function () {
		chart.resetZoom();
	};

	document.getElementById("SeviChangeBasis").onclick = function () {
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

	document.getElementById("SeviShowDifference").onclick = function () {
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

	document.getElementById("SeviShowAnisotropy").onclick = function () {
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

	document.getElementById("SeviCalculateSpectrumButton").onclick = function () {
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

	function clear_sevi_pe_spectra_display() {
		const spectra_selection = document.getElementById("SeviSpectrumSelection");
		const display_length = spectra_selection.children.length;
		for (let i = 0; i < display_length; i++) {
			// Remove the first child from section
			spectra_selection.removeChild(spectra_selection.children[0]);
		}
	}

	function add_radio_button(image) {
		const spectra_selection = document.getElementById("SeviSpectrumSelection");

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
		const basis_button = document.getElementById("SeviChangeBasis");
		basis_button.innerText = "Show R Plot";
	}

	function change_basis_button_to_eBE() {
		const basis_button = document.getElementById("SeviChangeBasis");
		basis_button.innerText = "Show eBE Plot";
	}

	function change_difference_button_to_difference() {
		const difference_button = document.getElementById("SeviShowDifference");
		difference_button.innerText = "Show Difference";
	}

	function change_difference_button_to_ir_on_off() {
		const difference_button = document.getElementById("SeviShowDifference");
		difference_button.innerText = "Show IR On/Off";
	}

	function change_anisotropy_button_to_show() {
		const anisotropy_button = document.getElementById("SeviShowAnisotropy");
		anisotropy_button.innerText = "Show Anisotropy";
	}

	function change_anisotropy_button_to_hide() {
		const anisotropy_button = document.getElementById("SeviShowAnisotropy");
		anisotropy_button.innerText = "Hide Anisotropy";
	}

	function disable_calculate_button() {
		const calculate_button = document.getElementById("SeviCalculateSpectrumButton");
		calculate_button.disabled = true;
	}

	function enable_calculate_button() {
		const calculate_button = document.getElementById("SeviCalculateSpectrumButton");
		calculate_button.disabled = false;
	}
}

/*****************************************************************************

							RECENT SCANS

*****************************************************************************/

function Sevi_Recent_Scans() {
	const { RecentScansRow } = require("./Libraries/RecentScansClasses.js");
	const { ImageManagerMessenger } = require("./Libraries/ImageManager.js");
	const IMMessenger = new ImageManagerMessenger();

	const AllRecentScans = [];

	/****
			Image Manager Listeners
	****/

	IMMessenger.listen.event.scan.stop.on(() => {
		let image = IMMessenger.information.last_image;
		// Check if this image is already in recent scans list
		for (scan of AllRecentScans) {
			if (image.id === scan.id) {
				// Update that image and re-fill recent scans section
				scan.update_info(image);
				clear_recent_scan_display();
				fill_recent_scan_display();
				return;
			}
		}
		// If we're here, then this image has not been in the recent scans section
		let row = new RecentScansRow(image);
		AllRecentScans.push(row);
		row.add_to_div(document.getElementById("SeviRecentScansSection"));
	});

	/****
			Functions
	****/

	function clear_recent_scan_display() {
		const recent_scans = document.getElementById("SeviRecentScansSection");
		const display_length = recent_scans.children.length;
		for (let i = 0; i < display_length; i++) {
			// Remove the first child from section
			recent_scans.removeChild(recent_scans.children[0]);
		}
	}

	function fill_recent_scan_display() {
		const recent_scans = document.getElementById("SeviRecentScansSection");
		for (scan of AllRecentScans) {
			scan.add_to_div(recent_scans);
		}
	}
}

/*****************************************************************************

						LASER ENERGY CONVERSION

*****************************************************************************/

/*****************************************************************************

							PAGE LOADING

*****************************************************************************/

function Sevi_Load_Page(PageInfo) {
	const { Tabs } = require("./Libraries/Tabs.js");
	const { ImageManagerMessenger } = require("./Libraries/ImageManager.js");
	const IMMessenger = new ImageManagerMessenger();

	// Show/hide image series button based on settings
	const sevi_controls = document.getElementById("SeviScanControls");
	if (sevi_controls) {
		if (settings?.image_series.show_menu) sevi_controls.classList.remove("hide-image-series");
		else sevi_controls.classList.add("hide-image-series");
	}

	// Show tab highlight if SEVI scan is being taken
	IMMessenger.listen.event.scan.start.on(() => {
		// Make sure it's not an IR-SEVI scan
		if (!IMMessenger.information.image_info.is_ir) {
			let tab = document.getElementById(Tabs.SEVI.tab);
			if (tab) tab.classList.add("highlighted-tab");
		}
	});
	// Remove tab highlight if SEVI scan is stopped or canceled
	IMMessenger.listen.event.scan.stop_or_cancel.on(() => {
		let tab = document.getElementById(Tabs.SEVI.tab);
		if (tab) tab.classList.remove("highlighted-tab");
	});

	// Wrapping these in try/catch so that rest of program can still load
	//	even if some modules are buggy
	/*		First Page		*/
	try {
		Sevi_Scan_Control();
	} catch (error) {
		console.log("Cannot load SEVI tab Scan Controls module:", error);
	}
	try {
		Sevi_File_Naming();
	} catch (error) {
		console.log("Cannot load SEVI tab File Naming module:", error);
	}
	try {
		Sevi_Laser_Control();
	} catch (error) {
		console.log("Cannot load SEVI tab Laser Controls module:", error);
	}
	try {
		Sevi_Accumulated_Image_Display(PageInfo);
	} catch (error) {
		console.log("Cannot load SEVI tab Accumulated Image Display module:", error);
	}
	try {
		Sevi_Counts();
	} catch (error) {
		console.log("Cannot load SEVI tab Electron/Frame Counts module:", error);
	}
	try {
		Sevi_Change_Pages();
	} catch (error) {
		console.log("Cannot load SEVI tab page up/down buttons:", error);
	}
	/*		Second Page		*/
	try {
		Sevi_PESpectrum_Display();
	} catch (error) {
		console.log("Cannot load SEVI tab PE Spectra Display module:", error);
	}
	try {
		Sevi_Recent_Scans();
	} catch (error) {
		console.log("Cannot load SEVI tab Recent Scans module:", error);
	}
}

/**
 * Functions to execute every time the SEVI tab is loaded - should only be used by Tab Manager
 */
function Sevi_Load_Tab() {
	const { ImageType } = require("./Libraries/ImageClasses.js");

	function update_sevi_accumulated_image_display() {
		const image_display = document.getElementById("SeviDisplay");
		const ctx = image_display.getContext("2d");
		let image_data = IMMessenger.information.get_image_display(ImageType.IROFF);
		if (!image_data) return; // No ImageData object was sent
		// Clear the current image
		ctx.clearRect(0, 0, image_display.width, image_display.height);
		// Put image_data on the display
		// Have to convert the ImageData object into a bitmap image so that the  image is resized to fill the display correctly
		createImageBitmap(image_data).then(function (bitmap_img) {
			ctx.drawImage(bitmap_img, 0, 0, image_data.width, image_data.height, 0, 0, image_display.width, image_display.height);
		});
	}

	update_sevi_accumulated_image_display();
}

/*****************************************************************************

							EXPORTING

*****************************************************************************/

module.exports = { Sevi_Load_Page, Sevi_Load_Tab };
