/************************************************** 

	Classes for Wavelength Information/Conversion

**************************************************/

const { LASER } = require("../Messages.js");

// Currently this isn't working correctly and idk why
// wl.nIR shouldn't show _wavelength and _wavenumber properties (if wl = new ExcitationWavelength())
// It works like that in JS Fiddle

// Maybe it doesn't matter but it would be a lot cleaner imo

// TODO: Get wavelength conversion working

class ExcitationWavelength {
	constructor() {
		this.iIR, this.mIR, this.fIR;

		this._nIR = {
			get wavelength() {
				return this._wavelength;
			},
			get wavenumber() {
				return this._wavenumber;
			},
			set wavelength(value) {
				this._wavelength = value;
				this._wavenumber = Math.pow(10, 7) / value;
			},
			set wavenumber(value) {
				this._wavenumber = value;
				this._wavelength = Math.pow(10, 7) / value;
			},
		};

		// Doing this so that _wavelength and _wavenumber don't show up when returning _nIR
		Object.defineProperty(this._nIR, "_wavelength", { enumerable: false, writable: true, value: 0 });
		Object.defineProperty(this._nIR, "_wavenumber", { enumerable: false, writable: true, value: 0 });
	}

	/* Static Methods */
	static get MODE() {
		return { NIR: "nIR", IIR: "iIR", MIR: "mIR", FIR: "fIR", NONE: undefined };
	}

	static get YAG_wl() {
		return this._YAG_wl || 1064; // If the YAG wavelength isn't defined, default to 1064nm
	}

	static set YAG_wl(wavelength) {
		this._YAG_wl = wavelength;
	}

	/**
	 * Convert a desired energy (nm or cm-1) to nIR
	 * @param {Object} energy energy to convert to nIR - needs to contain .wavelength or .wavenumber elements
	 * containing the energy to convert (in nm for .wavelength or in cm-1 for .wavenumber)
	 * @returns {Object} nIR energy as {wavelength: value (nm), wavenumber: value (cm-1), mode: ExcitationWavelength.MODE element}
	 */
	static get_nir(energy) {
		let nir_energy = { wavelength: 0, wavenumber: 0, mode: this.MODE.NONE };
		let given_energy = { wavelength: 0, wavenumber: 0 };
		// Check if the wavelength is given and is nonzero
		if (energy?.wavelength) {
			given_energy.wavelength = energy.wavelength;
			given_energy.wavenumber = Math.pow(10, 7) / energy.wavelength;
		}
		// If not, check if the wavenumber is given and is nonzero
		else if (energy?.wavenumber) {
			given_energy.wavelength = Math.pow(10, 7) / energy.wavenumber;
			given_energy.wavenumber = energy.wavenumber;
		}
		// Neither were given or they were zero, return 0
		else {
			return nir_energy;
		}

		// Working in wavenumbers bc it makes things way easier
		let YAG_wn = Math.pow(10, 7) / this.YAG_wl; // Convert YAG wavelength to wavenumbers
		// Figure out which energy regime wavenumber energy is in
		if (11355 < given_energy.wavenumber && given_energy.wavenumber < 14080) {
			// Near IR
			nir_energy.mode = this.MODE.NIR;
			nir_energy.wavenumber = given_energy.wavenumber;
		} else if (4500 < given_energy.wavenumber && given_energy.wavenumber < 7400) {
			// Intermediate IR
			nir_energy.mode = this.MODE.IIR;
			nir_energy.wavenumber = 2 * YAG_wn - given_energy.wavenumber;
		} else if (2000 < given_energy.wavenumber && given_energy.wavenumber < 4500) {
			// Mid IR
			nir_energy.mode = this.MODE.MIR;
			nir_energy.wavenumber = YAG_wn + given_energy.wavenumber;
		} else if (625 < given_energy.wavenumber && given_energy.wavenumber < 2000) {
			// Far IR
			nir_energy.mode = this.MODE.FIR;
			nir_energy.wavenumber = (3 * YAG_wn - given_energy.wavenumber) / 2;
		} else {
			// Energy is out of range, return 0
			return nir_energy;
		}
		// Convert wavenumber to wavelength
		nir_energy.wavelength = Math.pow(10, 7) / nir_energy.wavenumber;
		return nir_energy;
	}

	/* Dynamic Methods */
	get MODE() {
		return this.constructor.MODE;
	}

	get YAG_wl() {
		return this.constructor.YAG_wl;
	}

	get nIR() {
		return this._nIR;
	}

	set nIR(energy) {
		// energy needs to contain .wavelength or .wavenumber
		if (energy.wavelength && energy.wavenumber) {
			this._nIR.wavelength = energy.wavelength;
			this._nIR.wavenumber = energy.wavenumber;
		} else if (energy.wavelength) {
			this._nIR.wavelength = energy.wavelength;
			this._nIR.wavenumber = Math.pow(10, 7) / energy.wavelength;
		} else if (energy.wavenumber) {
			this._nIR.wavenumber = energy.wavenumber;
			this._nIR.wavelength = Math.pow(10, 7) / energy.wavenumber;
		}
	}

	/**
	 * Convert a desired energy (nm or cm-1) to nIR
	 * @param {Object} energy energy to convert to nIR - needs to contain .wavelength or .wavenumber elements
	 * containing the energy to convert (in nm for .wavelength or in cm-1 for .wavenumber)
	 * @returns {Object} nIR energy as {wavelength: value (nm), wavenumber: value (cm-1), mode: ExcitationWavelength.MODE element}
	 */
	get_nir(energy) {
		return this.constructor.get_nir(energy);
	}
}

module.exports = { ExcitationWavelength };
