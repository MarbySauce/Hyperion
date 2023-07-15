const { LASER } = require("../Messages.js");

/************************************************** 

	Classes for Wavelength Information/Conversion

**************************************************/

// Essentially a fancier version of {wavelength: val, wavenumber: val}
class LaserModeEnergy {
	constructor(instance, mode) {
		this.instance = instance;
		this.mode = mode;

		this._wavelength = 0;
		this._wavenumber = 0;
	}

	get wavelength() {
		return this._wavelength;
	}
	get wavenumber() {
		return this._wavenumber;
	}

	set wavelength(value) {
		if (value === 0) {
			this.instance.reset();
		} else {
			this._wavelength = value;
			this._wavenumber = 1e7 / value;
			this.instance.convert(this);
		}
	}
	set wavenumber(value) {
		if (value === 0) {
			this.instance.reset();
		} else {
			this._wavenumber = value;
			this._wavelength = 1e7 / value;
			this.instance.convert(this);
		}
	}

	reset() {
		this._wavelength = 0;
		this._wavenumber = 0;
	}
}

/*****************************************************************************

					DETACHMENT WAVELENGTH CLASS

*****************************************************************************/

class DetachmentWavelength {
	constructor() {
		let this_instance = this; // Need to do this so LaserModeEnergy methods can get access to DetachmentWavelength class methods

		this.standard = new LaserModeEnergy(this_instance, this.MODE.STANDARD);
		this.doubled = new LaserModeEnergy(this_instance, this.MODE.DOUBLED);
		this.raman = new LaserModeEnergy(this_instance, this.MODE.RAMAN);
		this.irdfg = new LaserModeEnergy(this_instance, this.MODE.IRDFG);
	}

	/* Static Methods */
	static get MODE() {
		return {
			STANDARD: LASER.MODE.DETACHMENT.STANDARD,
			DOUBLED: LASER.MODE.DETACHMENT.DOUBLED,
			RAMAN: LASER.MODE.DETACHMENT.RAMAN,
			IRDFG: LASER.MODE.DETACHMENT.IRDFG,
			NONE: undefined,
		};
	}

	static get YAG_wl() {
		return this._YAG_wl;
	}

	static get YAG_wn() {
		return this._YAG_wn;
	}

	static get H2_wn() {
		return this._H2_wn;
	}

	static set YAG_wl(wavelength) {
		this._YAG_wl = wavelength;
		this._YAG_wn = 1e7 / wavelength;
	}

	static set H2_wn(wavenumber) {
		this._H2_wn = wavenumber;
	}

	/* Dynamic Methods */
	get MODE() {
		return this.constructor.MODE;
	}

	get YAG_wl() {
		return this.constructor.YAG_wl;
	}

	get YAG_wn() {
		return this.constructor.YAG_wn;
	}

	get H2_wn() {
		return this.constructor.H2_wn;
	}

	get_energy(mode) {
		switch (mode) {
			case LASER.MODE.DETACHMENT.STANDARD:
				return this.standard;
			case LASER.MODE.DETACHMENT.DOUBLED:
				return this.doubled;
			case LASER.MODE.DETACHMENT.RAMAN:
				return this.raman;
			case LASER.MODE.DETACHMENT.IRDFG:
				return this.irdfg;
		}
	}

	reset() {
		this.standard.reset();
		this.doubled.reset();
		this.raman.reset();
		this.irdfg.reset();
	}

	convert(laser_mode_energy) {
		switch (laser_mode_energy.mode) {
			case this.MODE.STANDARD:
				DetachmentWavelength_convert_standard(this, laser_mode_energy);
				break;
			case this.MODE.DOUBLED:
				DetachmentWavelength_convert_doubled(this, laser_mode_energy);
				break;
			case this.MODE.RAMAN:
				DetachmentWavelength_convert_raman(this, laser_mode_energy);
				break;
			case this.MODE.IRDFG:
				DetachmentWavelength_convert_irdfg(this, laser_mode_energy);
				break;
		}
	}
}

/***
		DetachmentWavelength Class Functions
***/

// Convert standard detachment energy to doubled, raman, and irdfg
function DetachmentWavelength_convert_standard(instance, standard_energy) {
	// (Need to edit underscored version (e.g. standard._wavenumber) so that conversions aren't retriggered)
	// First working in wavenumbers since the math is easier
	instance.doubled._wavenumber = 2 * standard_energy._wavenumber; // Convert to doubled energy
	instance.raman._wavenumber = standard_energy._wavenumber - instance.H2_wn; // Convert to Raman shifted energy
	instance.irdfg._wavenumber = standard_energy._wavenumber - instance.YAG_wn; // Convert to IRDFG energy
	// Next, convert wavenumber to wavelength
	instance.doubled._wavelength = 1e7 / instance.doubled._wavenumber;
	instance.raman._wavelength = 1e7 / instance.raman._wavenumber;
	instance.irdfg._wavelength = 1e7 / instance.irdfg._wavenumber;
}

// Convert doubled detachment energy to standard, raman, and irdfg
function DetachmentWavelength_convert_doubled(instance, doubled_energy) {
	// (Need to edit underscored version (e.g. standard._wavenumber) so that conversions aren't retriggered)
	// First working in wavenumbers since the math is easier
	instance.standard._wavenumber = doubled_energy._wavenumber / 2; // Convert to standard energy
	// Instead of halving the doubled energy each time, just going to work with standard energy now
	instance.raman._wavenumber = instance.standard._wavenumber - instance.H2_wn; // Convert to Raman shifted energy
	instance.irdfg._wavenumber = instance.standard._wavenumber - instance.YAG_wn; // Convert to IRDFG energy
	// Next, convert wavenumber to wavelength
	instance.standard._wavelength = 1e7 / instance.standard._wavenumber;
	instance.raman._wavelength = 1e7 / instance.raman._wavenumber;
	instance.irdfg._wavelength = 1e7 / instance.irdfg._wavenumber;
}

// Convert Raman shifted energy to standard, doubled, and irdfg
function DetachmentWavelength_convert_raman(instance, raman_energy) {
	// (Need to edit underscored version (e.g. standard._wavenumber) so that conversions aren't retriggered)
	// First working in wavenumbers since the math is easier
	instance.standard._wavenumber = raman_energy._wavenumber + instance.H2_wn; // Convert to standard energy
	// Instead of adding the Raman shift energy each time, just going to work with standard energy now
	instance.doubled._wavenumber = 2 * instance.standard._wavenumber; // Convert to doubled energy
	instance.irdfg._wavenumber = instance.standard._wavenumber - instance.YAG_wn; // Convert to IRDFG energy
	// Next, convert wavenumber to wavelength
	instance.standard._wavelength = 1e7 / instance.standard._wavenumber;
	instance.doubled._wavelength = 1e7 / instance.doubled._wavenumber;
	instance.irdfg._wavelength = 1e7 / instance.irdfg._wavenumber;
}

// Convert IRDFG energy to standard, doubled, and raman
function DetachmentWavelength_convert_irdfg(instance, irdfg_energy) {
	// (Need to edit underscored version (e.g. standard._wavenumber) so that conversions aren't retriggered)
	// First working in wavenumbers since the math is easier
	instance.standard._wavenumber = irdfg_energy._wavenumber + instance.YAG_wn; // Convert to standard energy
	// Instead of adding the YAG energy each time, just going to work with standard energy now
	instance.doubled._wavenumber = 2 * instance.standard._wavenumber; // Convert to doubled energy
	instance.raman._wavenumber = instance.standard._wavenumber - instance.H2_wn; // Convert to Raman shifted energy
	// Next, convert wavenumber to wavelength
	instance.standard._wavelength = 1e7 / instance.standard._wavenumber;
	instance.doubled._wavelength = 1e7 / instance.doubled._wavenumber;
	instance.raman._wavelength = 1e7 / instance.raman._wavenumber;
}

/*****************************************************************************

					IR EXCITATION WAVELENGTH CLASS

*****************************************************************************/

class ExcitationWavelength {
	constructor() {
		let this_instance = this; // Need to do this so LaserModeEnergy methods can get access to ExcitationWavelength class methods

		this.nIR = new LaserModeEnergy(this_instance, this.MODE.NIR);
		this.iIR = new LaserModeEnergy(this_instance, this.MODE.IIR);
		this.mIR = new LaserModeEnergy(this_instance, this.MODE.MIR);
		this.fIR = new LaserModeEnergy(this_instance, this.MODE.FIR);
	}

	/* Static Methods */
	static get MODE() {
		return {
			NIR: LASER.MODE.EXCITATION.NIR,
			IIR: LASER.MODE.EXCITATION.IIR,
			MIR: LASER.MODE.EXCITATION.MIR,
			FIR: LASER.MODE.EXCITATION.FIR,
			NONE: undefined,
		};
	}

	static get YAG_wl() {
		return this._YAG_wl;
	}

	static get YAG_wn() {
		return this._YAG_wn;
	}

	static set YAG_wl(wavelength) {
		this._YAG_wl = wavelength;
		this._YAG_wn = 1e7 / wavelength;
	}

	/* Dynamic Methods */
	get MODE() {
		return this.constructor.MODE;
	}

	get YAG_wl() {
		return this.constructor.YAG_wl;
	}

	get YAG_wn() {
		return this.constructor.YAG_wn;
	}

	/**
	 * Convert a desired energy (nm or cm-1) to nIR
	 * @param {Object} energy energy to convert to nIR - needs to contain .wavelength or .wavenumber elements
	 * containing the energy to convert (in nm for .wavelength or in cm-1 for .wavenumber)
	 * @returns {Object} nIR energy as {wavelength: value (nm), wavenumber: value (cm-1), mode: ExcitationWavelength.MODE element}
	 */
	get_nir(energy) {
		let nir_energy = { wavelength: 0, wavenumber: 0, mode: this.MODE.NONE };
		let given_energy = { wavelength: 0, wavenumber: 0 };
		// Check if the wavelength is given and is nonzero
		if (energy?.wavelength) {
			given_energy.wavelength = energy.wavelength;
			given_energy.wavenumber = 1e7 / energy.wavelength;
		}
		// If not, check if the wavenumber is given and is nonzero
		else if (energy?.wavenumber) {
			given_energy.wavelength = 1e7 / energy.wavenumber;
			given_energy.wavenumber = energy.wavenumber;
		}
		// Neither were given or they were zero, return 0
		else {
			return nir_energy;
		}

		// Working in wavenumbers bc it makes things way easier
		// Figure out which energy regime wavenumber energy is in
		if (11355 < given_energy.wavenumber && given_energy.wavenumber < 14080) {
			// Near IR
			nir_energy.mode = this.MODE.NIR;
			nir_energy.wavenumber = given_energy.wavenumber;
		} else if (4500 < given_energy.wavenumber && given_energy.wavenumber < 7400) {
			// Intermediate IR
			nir_energy.mode = this.MODE.IIR;
			nir_energy.wavenumber = 2 * this.YAG_wn - given_energy.wavenumber;
		} else if (2000 < given_energy.wavenumber && given_energy.wavenumber < 4500) {
			// Mid IR
			nir_energy.mode = this.MODE.MIR;
			nir_energy.wavenumber = this.YAG_wn + given_energy.wavenumber;
		} else if (625 < given_energy.wavenumber && given_energy.wavenumber < 2000) {
			// Far IR
			nir_energy.mode = this.MODE.FIR;
			nir_energy.wavenumber = (3 * this.YAG_wn - given_energy.wavenumber) / 2;
		} else {
			// Energy is out of range, return 0
			return nir_energy;
		}
		// Convert wavenumber to wavelength
		nir_energy.wavelength = 1e7 / nir_energy.wavenumber;
		return nir_energy;
	}

	get_energy(mode) {
		switch (mode) {
			case LASER.MODE.EXCITATION.NIR:
				return this.nIR;
			case LASER.MODE.EXCITATION.IIR:
				return this.iIR;
			case LASER.MODE.EXCITATION.MIR:
				return this.mIR;
			case LASER.MODE.EXCITATION.FIR:
				return this.fIR;
		}
	}

	reset() {
		this.nIR.reset();
		this.iIR.reset();
		this.mIR.reset();
		this.fIR.reset();
	}

	convert(laser_mode_energy) {
		switch (laser_mode_energy.mode) {
			case this.MODE.NIR:
				ExcitationWavelength_convert_nir(this, laser_mode_energy);
				break;
			case this.MODE.IIR:
				ExcitationWavelength_convert_iir(this, laser_mode_energy);
				break;
			case this.MODE.MIR:
				ExcitationWavelength_convert_mir(this, laser_mode_energy);
				break;
			case this.MODE.FIR:
				ExcitationWavelength_convert_fir(this, laser_mode_energy);
				break;
		}
	}
}

/***
		ExcitationWavelength Class Functions
***/

// Convert nIR energies to iIR, mIR, and fIR
function ExcitationWavelength_convert_nir(instance, nir_energy) {
	// (Need to edit underscored version (e.g. nIR._wavenumber) so that conversions aren't retriggered)
	// First working in wavenumbers since the math is easier
	instance.iIR._wavenumber = 2 * instance.YAG_wn - nir_energy._wavenumber; // Convert to iIR
	instance.mIR._wavenumber = nir_energy._wavenumber - instance.YAG_wn; // Convert to mIR
	instance.fIR._wavenumber = 3 * instance.YAG_wn - 2 * nir_energy._wavenumber; // Convert to fIR
	// Next, convert wavenumber to wavelength
	instance.iIR._wavelength = 1e7 / instance.iIR._wavenumber;
	instance.mIR._wavelength = 1e7 / instance.mIR._wavenumber;
	instance.fIR._wavelength = 1e7 / instance.fIR._wavenumber;
}

// Convert iIR energies to nIR, mIR, and fIR
function ExcitationWavelength_convert_iir(instance, iir_energy) {
	// (Need to edit underscored version (e.g. nIR._wavenumber) so that conversions aren't retriggered)
	// First working in wavenumbers since the math is easier
	instance.nIR._wavenumber = 2 * instance.YAG_wn - iir_energy._wavenumber; // Convert to nIR
	instance.mIR._wavenumber = instance.YAG_wn - iir_energy._wavenumber; // Convert to mIR
	instance.fIR._wavenumber = 2 * iir_energy._wavenumber - instance.YAG_wn; // Convert to fIR
	// Next, convert wavenumber to wavelength
	instance.nIR._wavelength = 1e7 / instance.nIR._wavenumber;
	instance.mIR._wavelength = 1e7 / instance.mIR._wavenumber;
	instance.fIR._wavelength = 1e7 / instance.fIR._wavenumber;
}

// Convert mIR energies to nIR, iIR, and fIR
function ExcitationWavelength_convert_mir(instance, mir_energy) {
	// (Need to edit underscored version (e.g. nIR._wavenumber) so that conversions aren't retriggered)
	// First working in wavenumbers since the math is easier
	instance.nIR._wavenumber = instance.YAG_wn + mir_energy._wavenumber; // Convert to nIR
	instance.iIR._wavenumber = instance.YAG_wn - mir_energy._wavenumber; // Convert to iIR
	instance.fIR._wavenumber = instance.YAG_wn - 2 * mir_energy._wavenumber; // Convert to fIR;
	// Next, convert wavenumber to wavelength
	instance.nIR._wavelength = 1e7 / instance.nIR._wavenumber;
	instance.iIR._wavelength = 1e7 / instance.iIR._wavenumber;
	instance.fIR._wavelength = 1e7 / instance.fIR._wavenumber;
}

// Convert fIR energies to nIR, iIR, and mIR
function ExcitationWavelength_convert_fir(instance, fir_energy) {
	// (Need to edit underscored version (e.g. nIR._wavenumber) so that conversions aren't retriggered)
	// First working in wavenumbers since the math is easier
	instance.nIR._wavenumber = (3 * instance.YAG_wn - fir_energy._wavenumber) / 2; // Convert to nIR
	instance.iIR._wavenumber = (instance.YAG_wn + fir_energy._wavenumber) / 2; // Convert to iIR
	instance.mIR._wavenumber = (instance.YAG_wn - fir_energy._wavenumber) / 2; // Convert to mIR
	// Next, convert wavenumber to wavelength
	instance.nIR._wavelength = 1e7 / instance.nIR._wavenumber;
	instance.iIR._wavelength = 1e7 / instance.iIR._wavenumber;
	instance.mIR._wavelength = 1e7 / instance.mIR._wavenumber;
}

/***************************************************************************/

// Set YAG wavelength default values to 1064nm
DetachmentWavelength.YAG_wl = 1064;
ExcitationWavelength.YAG_wl = 1064;
// Set H2 Raman frequency
DetachmentWavelength.H2_wn = 4055.201;

module.exports = { DetachmentWavelength, ExcitationWavelength };
