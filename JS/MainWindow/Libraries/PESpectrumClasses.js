/************************************************** 

		Photoelectron Spectrum Classes

**************************************************/

class PESpectrum {
	constructor() {
		this.radii;
		this.spectrum;
		this.residuals;
		this.best_fit;

		this.save_spectrum = false;
		this.save_residuals = false;
		this.save_best_fit = false;
	}

	get id() {
		if (this._id) return this._id;
		else return (this._id = 1);
	}

	set id(val) {
		this._id = val;
	}

	get id_str() {
		if (this.id < 10) return `0${this.id}`;
		else return this.id.toString();
	}

	get formatted_date() {
		let today = new Date();
		let day = ("0" + today.getDate()).slice(-2);
		let month = ("0" + (today.getMonth() + 1)).slice(-2);
		let year = today.getFullYear().toString().slice(-2);
		return month + day + year;
	}

	/** PE spectrum file name */
	get pes_file_name() {
		return `${this.formatted_date}m${this.id_str}_pes.dat`;
	}

	/** PE spectrum best fit file name */
	get sim_file_name() {
		return `${this.formatted_date}m${this.id_str}_sim.dat`;
	}

	/** PE spectrum residuals file name */
	get sim_file_name() {
		return `${this.formatted_date}m${this.id_str}_res.dat`;
	}

	/** IR PE spectrum file name */
	get pes_file_name_ir() {
		return "";
	}

	/** IR PE spectrum best fit file name */
	get sim_file_name_ir() {
		return "";
	}

	/** IR PE spectrum residuals file name */
	get sim_file_name_ir() {
		return "";
	}

	update(melexir_results) {
		if (melexir_results?.radii) this.radii = melexir_results.radii;
		if (melexir_results?.spectrum) this.spectrum = melexir_results.spectrum;
		if (melexir_results?.residuals) this.residuals = melexir_results.residuals;
		if (melexir_results?.best_fit) this.best_fit = melexir_results.best_fit;
	}

	update_settings(settings) {
		if (settings?.save_spectrum !== undefined) this.save_spectrum = settings.save_spectrum;
		if (settings?.save_residuals !== undefined) this.save_residuals = settings.save_residuals;
		if (settings?.save_best_fit !== undefined) this.save_best_fit = settings.save_best_fit;
	}
}

module.exports = { PESpectrum };
