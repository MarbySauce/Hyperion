/************************************************** 

			Control for IR Action UI elements

**************************************************/

/****
		HTML Element Listeners
****/

/****
		UI Event Listeners
****/

/****
		SEVI Event Listeners
****/

/****
		Functions
****/

/*****************************************************************************

							PAGE CONTROL

*****************************************************************************/

uiEmitter.on(UI.LOAD.IRACTION, load_iraction_info);

function load_iraction_info() {
	// Information to load:
	//		Image ID
	//		VMI Info
	//		Laser Info
	//		Accumulated Image
	//		Electron Info
	//		PES Display

	uiEmitter.emit(UI.QUERY.VMI);
	uiEmitter.emit(UI.QUERY.DISPLAY.SELECTEDINDEX);

	seviEmitter.emit(SEVI.QUERY.COUNTS.TOTAL);
}

/*****************************************************************************

							SCAN CONTROL

*****************************************************************************/

/****
		HTML Element Listeners
****/

/****
		UI Event Listeners
****/

/****
		SEVI Event Listeners
****/

/****
		Functions
****/

/*****************************************************************************

							SCAN OPTIONS

*****************************************************************************/

/****
		HTML Element Listeners
****/

document.getElementById("IRActionVMIMode").oninput = function () {
	const vmi_mode = document.getElementById("IRActionVMIMode");
	uiEmitter.emit(UI.UPDATE.VMI.INDEX, vmi_mode.selectedIndex);
};

/****
		UI Event Listeners
****/

uiEmitter.on(UI.RESPONSE.VMI, update_iraction_vmi);

/****
		SEVI Event Listeners
****/

/****
		Functions
****/

function update_iraction_vmi(vmi_info) {
	const vmi_mode = document.getElementById("IRActionVMIMode");
	vmi_mode.selectedIndex = vmi_info.index;
}

/*****************************************************************************

							SCAN STATUS

*****************************************************************************/

/****
		HTML Element Listeners
****/

/****
		UI Event Listeners
****/

/****
		SEVI Event Listeners
****/

/****
		Functions
****/

/*****************************************************************************

						ACCUMULATED IMAGE DISPLAY

*****************************************************************************/

/****
		HTML Element Listeners
****/

document.getElementById("IRActionImageDisplaySelect").oninput = function () {
	const image_display_select = document.getElementById("IRActionImageDisplaySelect");
	uiEmitter.emit(UI.UPDATE.DISPLAY.SELECTEDINDEX, image_display_select.selectedIndex);
	update_iraction_accumulated_image_display();
};

document.getElementById("IRActionDisplaySlider").oninput = function () {
	const display_slider = document.getElementById("IRActionDisplaySlider");
	uiEmitter.emit(UI.UPDATE.DISPLAY.SLIDERVALUE, display_slider.value);
	// Update image display
	update_iraction_accumulated_image_display();
};

/****
		IPC Event Listeners
****/

ipc.on(IPCMessages.UPDATE.NEWFRAME, async () => {
	// We only want to update the image on a new camera frame if
	// (a) the user is on the IR-SEVI tab AND
	// (b) an image is currently being run AND
	// (c) that image is not currently paused
	let current_tab = once(uiEmitter, UI.RESPONSE.CURRENTTAB); // (a)
	let image_running = once(seviEmitter, SEVI.RESPONSE.SCAN.RUNNING); // (b)
	let image_paused = once(seviEmitter, SEVI.RESPONSE.SCAN.PAUSED); // (c)
	// Send query requests
	uiEmitter.emit(UI.QUERY.CURRENTTAB);
	seviEmitter.emit(SEVI.QUERY.SCAN.RUNNING);
	seviEmitter.emit(SEVI.QUERY.SCAN.PAUSED);
	// Wait for messages to be received (for promises to be resolved)
	// and replace variables with the returned values from each message
	[[current_tab], [image_running], [image_paused]] = await Promise.all([current_tab, image_running, image_paused]);
	// Make sure all values are correct
	if (current_tab !== UI.TAB.IRACTION) return;
	if (!image_running) return;
	if (image_paused) return;
	// If everything passed, update display
	update_iraction_accumulated_image_display();
});

/****
		UI Event Listeners
****/

uiEmitter.on(UI.RESPONSE.DISPLAY.SELECTEDINDEX, (value) => {
	const image_display_select = document.getElementById("IRActionImageDisplaySelect");
	image_display_select.selectedIndex = value;
});

uiEmitter.on(UI.RESPONSE.DISPLAY.SLIDERVALUE, (value) => {
	const display_slider = document.getElementById("IRActionDisplaySlider");
	display_slider.value = value;
});

/****
		SEVI Event Listeners
****/

// Update accumulated image display when scan is reset
seviEmitter.on(SEVI.ALERT.SCAN.RESET, update_iraction_accumulated_image_display);

/****
		Functions
****/

function update_iraction_accumulated_image_display() {
	const image_display = document.getElementById("IRActionDisplay");
	const ctx = image_display.getContext("2d");
	const image_display_select = document.getElementById("IRActionImageDisplaySelect");
	seviEmitter.once(SEVI.RESPONSE.IMAGE, (image_data) => {
		if (!image_data) return; // No ImageData object was sent
		// Clear the current image
		ctx.clearRect(0, 0, image_display.width, image_display.height);
		// Put image_data on the display
		// Have to convert the ImageData object into a bitmap image so that the  image is resized to fill the display correctly
		createImageBitmap(image_data).then(function (bitmap_img) {
			ctx.drawImage(bitmap_img, 0, 0, image_data.width, image_data.height, 0, 0, image_display.width, image_display.height);
		});
	});
	switch (image_display_select.selectedIndex) {
		case 0: // IR Off
			seviEmitter.emit(SEVI.QUERY.IMAGE.IROFF);
			break;
		case 1: // IR On
			seviEmitter.emit(SEVI.QUERY.IMAGE.IRON);
			break;
		case 2: // Difference Positive
			seviEmitter.emit(SEVI.QUERY.IMAGE.DIFFPOS);
			break;
		case 3: // Difference Negative
			seviEmitter.emit(SEVI.QUERY.IMAGE.DIFFNEG);
			break;
	}
}

/*****************************************************************************

						ELECTRON/FRAME COUNTS

*****************************************************************************/

/****
		HTML Element Listeners
****/

/****
		UI Event Listeners
****/

/****
		SEVI Event Listeners
****/

seviEmitter.on(SEVI.RESPONSE.COUNTS.TOTAL, update_iraction_counters);

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

function update_action_image_progress_bar(percent) {
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
