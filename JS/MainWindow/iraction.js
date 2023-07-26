/************************************************** 

			Control for IR Action Mode

**************************************************/

class ActionImage {
	constructor() {
		this.excitation_energy = new ExcitationWavelength();
		this.expected_excitation_energy = new ExcitationWavelength();
		this.image_id; // Image ID
		this.step_image_number = 0; // Image number within set of images / step
		//this.radial_values;						// Filled with analysis radial values
	}
}

/*****************************************************************************

								IMAGE MANAGER

*****************************************************************************/

const ActionManager = {
	params: {
		initial_energy: 0, // cm-1
		final_energy: 0, // cm-1
		step_size: 0, // cm-1
		images_per_step: 1,
	},
	status: {
		running: false,
		paused: false,
		cancel: false,
	},
	duration: {
		start_time: 0,
		end_time: 0,
		length: 0, // Elapsed time in ms
		update: {
			frequency: 100,
			count: 0,
		},
		start: () => {
			ActionManager.duration.start_time = performance.now();
		},
		end: () => {
			ActionManager.duration.end_time = performance.now();
			ActionManager.duration.length = ActionManager.duration.end_time - ActionManager.duration.start_time;
			return ActionManager.duration.length;
		},
		convert: () => {
			let time = ActionManager.duration.length;
			let hours = Math.floor(time / (60 * 60 * 1000));
			let hours_remainder = time % (60 * 60 * 1000);
			let minutes = Math.floor(hours_remainder / (60 * 1000));
			let minutes_remainder = hours_remainder % (60 * 1000);
			let seconds = Math.floor(minutes_remainder / 1000);
			let ms = minutes_remainder % 1000;
			return [ms, seconds, minutes, hours];
		},
	},
	image_queue: [],
	completed_images: [],
	start_scan: () => ActionManager_start_scan(),
	stop_scan: () => ActionManager_stop_scan(),
};

/****
		IPC Event Listeners
****/

ipc.on(IPCMessages.UPDATE.NEWFRAME, (event, centroid_results) => {
	if (!ActionManager.status.running) {
		return; // Don't update if an image is not running or is paused
	}
	if (ActionManager.duration.update.count >= ActionManager.duration.update.frequency) {
		// Send update with current action scan duration
		ActionManager.duration.end();
		actionEmitter.emit(IRACTION.RESPONSE.DURATION, ActionManager.duration.convert());
		ActionManager.duration.update.count = 0;
	}
	ActionManager.duration.update.count++;
});

/****
		UI Event Listeners
****/

/****
		IR Action Event Listeners
****/

/* Scan Control */

actionEmitter.on(IRACTION.UPDATE.OPTIONS, (action_options) => {
	if (action_options.initial_energy) ActionManager.params.initial_energy = action_options.initial_energy;
	if (action_options.final_energy) ActionManager.params.final_energy = action_options.final_energy;
	if (action_options.step_size) ActionManager.params.step_size = action_options.step_size;
	if (action_options.images_per_step) ActionManager.params.images_per_step = action_options.images_per_step;
});
actionEmitter.on(IRACTION.SCAN.START, ActionManager.start_scan);
actionEmitter.on(IRACTION.SCAN.STOP, ActionManager.stop_scan);

/* Scan Status */

actionEmitter.on(IRACTION.QUERY.SCAN.RUNNING, () => {
	actionEmitter.emit(IRACTION.RESPONSE.SCAN.RUNNING, ActionManager.status.running);
});

/****
		SEVI Event Listeners
****/

seviEmitter.on(SEVI.ALERT.SCAN.STARTED, () => {
	if (ActionManager.status.running) actionEmitter.emit(IRACTION.ALERT.SEVI.STARTED);
});
seviEmitter.on(SEVI.ALERT.SCAN.STOPPED, () => {
	if (ActionManager.status.running) actionEmitter.emit(IRACTION.ALERT.SEVI.STOPPED);
});

/****
		Laser Event Listeners
****/

laserEmitter.on(LASER.ALERT.GOTO.STARTED, () => {
	if (ActionManager.status.running) actionEmitter.emit(IRACTION.ALERT.GOTO.STARTED);
});
laserEmitter.on(LASER.ALERT.GOTO.STOPPED, () => {
	if (ActionManager.status.running) actionEmitter.emit(IRACTION.ALERT.GOTO.STOPPED);
});

/****
		Functions
****/

// # of images will be length(completed_images) + length(image_queue)

function ActionManager_start_scan() {
	// Reset completed image list and image queue
	ActionManager.completed_images = [];
	ActionManager.image_queue = [];
	// Make sure image series collection length is set to 1
	seviEmitter.emit(SEVI.UPDATE.SERIES, 1);
	initialize_action_queue();
	run_action_scan();
}

function ActionManager_stop_scan() {
	// Reset image queue so no more images are taken
	ActionManager.image_queue = [];
	// If we're in a GoTo movement, we should cancel
	// If we're collecting an IR-SEVI image, we should stop it
	laserEmitter.emit(LASER.GOTO.CANCEL);
	seviEmitter.emit(SEVI.SCAN.STOP);
}

// Action queue should not be reset until after the current image is done!
function initialize_action_queue() {
	// If we're initializing the queue for the first time (i.e. completed images is empty)
	//	then we just look at action parameters
	// If not, we need to figure out where in the queue we are and where to go next
	let completed_length = ActionManager.completed_images.length;
	let initial_energy, final_energy, step_size;
	let step_image_number = 0;
	if (completed_length === 0) {
		initial_energy = ActionManager.params.initial_energy;
	} else {
		initial_energy = ActionManager.completed_images[completed_length - 1].expected_excitation_energy.energy.wavenumber;
		step_image_number = ActionManager.completed_images[completed_length - 1].step_image_number + 1;
	}
	final_energy = ActionManager.params.final_energy;
	step_size = ActionManager.params.step_size;
	// If we're moving from lower to higher energy, need to make sure step size is >0
	if (final_energy > initial_energy && step_size < 0) step_size *= -1;
	// If we're moving from higher to lower energy, need to make sure step size is <0
	else if (final_energy < initial_energy && step_size > 0) step_size *= -1;
	// Reset image queue
	ActionManager.image_queue = [];
	// Add the remaining images
	let action_image;
	for (
		let energy = initial_energy;
		Math.abs(energy - initial_energy) < Math.abs(final_energy - initial_energy + step_size / 2);
		energy += step_size
	) {
		for (let i = step_image_number; i < ActionManager.params.images_per_step; i++) {
			action_image = new ActionImage();
			action_image.expected_excitation_energy.get_nir({ wavenumber: energy });
			console.log(energy);
			console.log(action_image.expected_excitation_energy.energy);
			console.log(" ");
			action_image.step_image_number = i;
			ActionManager.image_queue.push(action_image);
		}
		step_image_number = 0;
	}
}

// Before this function, the image queue will already have been set up
async function run_action_scan() {
	ActionManager.status.running = true;
	actionEmitter.emit(IRACTION.ALERT.SCAN.STARTED);
	ActionManager.duration.start();
	// Send update about next wavelength
	actionEmitter.emit(IRACTION.RESPONSE.ENERGY.NEXT, ActionManager.image_queue[0]?.expected_excitation_energy);

	let current_image;
	let last_image = ActionManager.completed_images[ActionManager.completed_images.length - 1];
	let last_energy = last_image?.excitation_energy.energy.wavenumber; // Will be undefined if completed_images is blank
	let desired_energy;
	let move_wavelength = true;
	while (ActionManager.image_queue.length > 0) {
		// Get current image by removing it from beginning of queue
		current_image = ActionManager.image_queue.shift();
		// Update image ID info and send info
		uiEmitter.once(UI.RESPONSE.IMAGEID, (id) => {
			current_image.image_id = id;
			let completed_image_length = ActionManager.completed_images.length;
			let image_queue_length = ActionManager.image_queue.length;
			let image_amount_info = {
				current_image_id: id,
				current_image_number: completed_image_length + 1,
				total_image_number: completed_image_length + image_queue_length + 1, // +1 to account for this image
			};
			actionEmitter.emit(IRACTION.RESPONSE.IMAGEAMOUNT, image_amount_info);
		});
		uiEmitter.emit(UI.QUERY.IMAGEID);
		// Check whether to move OPO wavelength
		desired_energy = current_image.expected_excitation_energy.energy.wavenumber;
		if (settings.action.move_wavelength_every_time) {
			// If wavelength is close enough, don't move
			let acceptance_range = settings?.laser.excitation.acceptance_range;
			if (desired_energy - acceptance_range <= last_energy && last_energy <= desired_energy + acceptance_range) {
				// Close enough, no need to move wavelength
				move_wavelength = false;
			} else {
				// Not close enough
				move_wavelength = true;
			}
		} else {
			// Only want to move if we're on the first image in the series of images / step (i.e. step_image_number = 0)
			if (current_image.step_image_number === 0) {
				move_wavelength = true;
			} else {
				move_wavelength = false;
			}
		}
		if (move_wavelength) {
			// Tell OPO to move to desired wavelength and wait for it to finish
			laserEmitter.emit(LASER.GOTO.EXCITATION, desired_energy);
			let current_wavelength = once(laserEmitter, LASER.RESPONSE.EXCITATION.INFO);
			// GoTo Movement might be canceled, so we need to check for that
			[current_wavelength] = await Promise.race([current_wavelength, once(laserEmitter, LASER.ALERT.GOTO.CANCELED)]);
			if (!current_wavelength) {
				// GoTo was canceled, check if we should cancel action scan
				if (ActionManager.status.cancel) {
					// NOTE TO MARTY: Add cancel stuff in
					console.log("Action scan canceled!");
					break;
				} else {
					// NOTE TO MARTY: Add stop stuff in
					console.log("Action scan stopped!");
					break;
				}
			}
			// current_wavelength is a reference to ExcitationLaserManager.stored
			// So whenever .stored is updated, so will current_wavelength
			// Therefore we should just take the nIR wavelength from current_wavelength and update current_image
			current_image.excitation_energy.nIR.wavelength = current_wavelength.nIR.wavelength;
			current_image.excitation_energy.selected_mode = current_wavelength.selected_mode;
		} else {
			// Update excitation_energy with that of the last image
			last_image = ActionManager.completed_images[ActionManager.completed_images.length - 1];
			current_image.excitation_energy.nIR.wavelength = last_image?.excitation_energy.nIR.wavelength;
			current_image.excitation_energy.selected_mode = last_image?.excitation_energy.selected_mode;
		}
		// Send info about current and next IR energies
		actionEmitter.emit(IRACTION.RESPONSE.ENERGY.CURRENT, current_image.excitation_energy);
		actionEmitter.emit(IRACTION.RESPONSE.ENERGY.NEXT, ActionManager.image_queue[0]?.expected_excitation_energy);
		// Start an IR SEVI scan and wait for it to complete (or be canceled)
		seviEmitter.emit(SEVI.SCAN.STARTIR);
		//seviEmitter.emit(SEVI.SCAN.START); // If, for whatever reason, you want to take SEVI images instead, this will work
		await Promise.any([once(seviEmitter, SEVI.ALERT.SCAN.STOPPED), once(seviEmitter, SEVI.ALERT.SCAN.CANCELED)]);
		// Check if action scan was canceled
		if (ActionManager.status.cancel) {
			// NOTE TO MARTY: Add cancel stuff in
			console.log("Action scan canceled!");
			break;
		}
		// Add current image to completed_image list and move on
		ActionManager.completed_images.push(current_image);
	}

	ActionManager.duration.end();
	ActionManager.status.running = false;
	actionEmitter.emit(IRACTION.ALERT.SCAN.STOPPED);
	actionEmitter.emit(IRACTION.RESPONSE.DURATION, ActionManager.duration.convert());
}

async function bs_test() {
	laserEmitter.emit(LASER.GOTO.EXCITATION, 1000);
	let current_wavelength = once(laserEmitter, LASER.RESPONSE.EXCITATION.INFO);
	let canceled = once(laserEmitter, LASER.ALERT.GOTO.CANCELED);
	//let [ret_val] = await Promise.race([current_wavelength, canceled]);
	let [ret_val] = await Promise.race([current_wavelength, once(laserEmitter, LASER.ALERT.GOTO.CANCELED)]);
	if (ret_val) {
		console.log(ret_val);
	} else {
		console.log("Canceled!");
	}
}
