/************************************************** 

			Control for IR Action Mode

**************************************************/

class ActionImage {
	constructor() {
		this.excitation_energy = new ExcitationWavelength();
		this.expected_excitation_energy = new ExcitationWavelength();
		this.image_id_str; // Image ID string
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
	},
	image_queue: [],
	completed_images: [],
};

// # of images will be length(completed_images) + length(image_queue)

// Action queue should not be reset until after the current image is done!
function initialize_action_queue() {
	// If we're initializing the queue for the first time (i.e. completed images is empty)
	//	then we just look at action parameters
	// If not, we need to figure out where in the queue we are and where to go next
	let completed_length = ActionManager.completed_images.length;
	let starting_energy;
	let step_image_number = 0;
	if (completed_length === 0) {
		starting_energy = ActionManager.params.initial_energy;
	} else {
		starting_energy = ActionManager.completed_images[completed_length - 1].expected_excitation_energy.energy.wavenumber;
		step_image_number = ActionManager.completed_images[completed_length - 1].step_image_number % ActionManager.params.images_per_step;
	}
	// Reset image queue
	ActionManager.image_queue = [];
	// Add the remaining images
	let action_image;
	for (let energy = starting_energy; energy <= ActionManager.params.final_energy; energy += ActionManager.params.step_size) {
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
	// Steps:
	// - Check if OPO should be moved
	// - Move OPO to desired wavelength
	// - Accumulate image
	// - Move ActionImage from queue to completed

	// If we're moving the image from queue to completed, we don't actually want to
	// iterate through the array, but rather just look at the first image in queue
	// (something like while (queue.length > 0))
	let current_image;
	let last_image = ActionManager.completed_images[ActionManager.completed_images.length - 1];
	let last_energy = last_image?.excitation_energy.energy.wavenumber; // Will be undefined if completed_images is blank
	let desired_energy;
	let move_wavelength = true;
	while (ActionManager.image_queue.length > 0) {
		// Get current image by removing it from beginning of queue
		current_image = ActionManager.image_queue.shift();
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
				}
			}
			// current_wavelength is a reference to ExcitationLaserManager.stored
			// So whenever .stored is updated, so will current_wavelength
			// Therefore we should just take the nIR wavelength from current_wavelength and update current_image
			current_image.excitation_energy.nIR.wavelength = current_wavelength.nIR.wavelength;
		}
		// Start an IR SEVI scan and wait for it to complete (or be canceled)
		seviEmitter.emit(SEVI.SCAN.STARTIR);
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
