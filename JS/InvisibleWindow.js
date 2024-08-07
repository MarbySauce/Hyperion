const ipc = require("electron").ipcRenderer;
const EventEmitter = require("events").EventEmitter;
const camera = require("bindings")("camera");
const { IPCMessages } = require("../JS/Libraries/Messages.js");
const { Settings } = require("../JS/Libraries/SettingsClasses.js");
const { GetErrorFromCode } = require("../JS/Libraries/uEyeErrorCodes.js");

/*****************************************************************************

									STARTUP

*****************************************************************************/

let settings = new Settings(); // Where all settings parameters will be stored (initialize as blank)

// Tell Main that this window is ready
// (Startup procedure will happen once settings are sent)
window.onload = function () {
	ipc.send(IPCMessages.READY.INVISIBLE);
};

function startup() {
	set_up_emitter();

	open_camera();

	start_image_capture();
}

// Set up Event Emitter to communicate between C++ and JS
function set_up_emitter() {
	const emitter = new EventEmitter();

	// Set up listener for messages from C++
	emitter.on("new-image", (centroid_results) => {
		if (!centroid_results) {
			// Messsage is blank
			return;
		}

		// Send data to Main (and from there to other renderer windows)
		ipc.send(IPCMessages.UPDATE.NEWFRAME, centroid_results);
	});

	// Initialize emitter on C++ side
	camera.initEmitter(emitter.emit.bind(emitter));
}

// Connect to camera and apply settings
function open_camera() {
	let ReturnCode;

	if (settings.ISBLANK) {
		// Settings have not been filled in yet, send an error and return
		console.error("Settings have not been initialized! Cannot connect to camera");
		return;
	}

	// Create WinAPI Window (to recieve camera trigger messages)
	camera.createWinAPIWindow();

	// Connect to the camera
	ReturnCode = camera.connect();
	console.log(`Connect to camera: ${ReturnCode} - ${GetErrorFromCode(ReturnCode)}`);

	// Get camera info
	// Also applies certain settings like image size and color mode
	let CameraInfo = camera.getInfo();
	console.log("Camera info:", CameraInfo);

	// Initialize image buffer
	camera.initBuffer();

	// Apply camera settings
	apply_camera_settings();
}

function apply_camera_settings() {
	let C = settings.camera; // Camera settings

	// Apply default camera settings (the ones that I don't think need to be adjustable in Hyperion settings)
	// These include: Color mode, Display mode, and memory allocation
	camera.applyDefaultSettings();

	// Centroiding Area of Interest (only looks in this area for electron spots)
	// NOTE: As of this writing (July 2024), putting left offset = 140 centers the phosphor screen on the accumulated image
	camera.setAoI(C.AoI_width, C.AoI_height, C.x_offset, C.y_offset); // (AoI-Width, AoI-Height, left-offset, top-offset)

	// LED area is part of screen where IR On/Off LED appears (should not be in area of interest)
	camera.setLEDArea(C.LED_area.x_start, C.LED_area.x_end, C.LED_area.y_start, C.LED_area.y_end); // (x-start, x-end, y-start, y-end)

	// Noise area is part of screen outside of area of interest where only noisy pixels appear (to compare against LED)
	camera.setNoiseArea(C.Noise_area.x_start, C.Noise_area.x_end, C.Noise_area.y_start, C.Noise_area.y_end); // (x-start, x-end, y-start, y-end)

	// uEye recommends applying settings in order as 1) Pixel clock, 2) Frame rate, 3) Exposure
	// We don't need to apply frame rate
	camera.setPixelClock(C.pixel_clock);
	camera.setExposure(C.exposure_time);

	// Set gain percentage and gain boost
	camera.setGain(C.gain);
	camera.setGainBoost(C.gain_boost);

	// Set trigger mode (0 - No trigger, 1 - Falling edge, 2 - Rising edge, 3 - Software trigger)
	camera.setTrigger(C.trigger);

	// Whether to use Hybrid centroiding method (HGCM) or just CoM method
	camera.useHybridMethod(settings.centroid.use_hybrid_method);
}

// Start image capture and processing
function start_image_capture() {
	// Start image capture
	camera.startCapture();

	// Start processing images
	if (camera.enableMessages()) {
		console.log("Messages enabled!");
		check_messages = true;
		message_loop();
	} else {
		console.error("Cannot enable messages!");
	}
}

/*****************************************************************************

								MESSAGE LOOP

*****************************************************************************/

let check_messages = false; // Boolean used to check whether to stay in message loop

// At the end of the event loop cycle, check if there is a new camera frame from the uEye camera
// If there is one, C++ code (camera_[OS].cc) will centroid the image and return the centroids
// 	using the EventEmitter.
function message_loop() {
	if (check_messages) {
		setTimeout(() => {
			message_loop();
		}, 0);
		camera.checkMessages(); // Check for new camera frame
	}
}

// End message loop and close the camera
function close_camera() {
	check_messages = false;
	camera.close(); // Error codes will be printed to terminal on C++ side
}

/*****************************************************************************

								IPC MESSAGES

*****************************************************************************/

// Recieve setting information and go through startup procedure
ipc.once(IPCMessages.INFORMATION.SETTINGS, (event, settings_information) => {
	settings = settings_information;
	startup();
	ipc.on(IPCMessages.INFORMATION.SETTINGS, (event, settings_information) => {
		settings = settings_information;
		apply_camera_settings();
	});
});

// Close camera and notify Main that camera has been closed
ipc.on(IPCMessages.UPDATE.CLOSECAMERA, function (event, message) {
	close_camera();
	ipc.send(IPCMessages.UPDATE.CAMERACLOSED);
});
