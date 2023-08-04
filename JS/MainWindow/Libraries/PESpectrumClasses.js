/************************************************** 

		Photoelectron Spectrum Classes

**************************************************/

class PESpectrum {
	static get save_directory() {
		return PESpectrum._save_directory || "";
	}

	static set save_directory(dir_string) {
		PESpectrum._save_directory = dir_string;
	}

	constructor() {
		//this.radii;
		//this.spectrum;
		//this.residuals;
		//this.best_fit;

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
	get res_file_name() {
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
	get res_file_name_ir() {
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

	save_files() {
		const fs = require("fs");
		const path = require("path");

		const zip = (...arr) =>
			Array(Math.max(...arr.map((a) => a.length)))
				.fill()
				.map((_, i) => arr.map((a) => a[i]));

		if (this.save_spectrum && this.radii && this.spectrum) {
			let file_name = path.join(PESpectrum.save_directory, this.pes_file_name);
			let spectrum = zip(this.radii, ...this.spectrum);
			let pes_string = spectrum.map((row) => row.map((e) => e.toExponential(8)).join(" ")).join("\n");
			fs.writeFile(file_name, pes_string, (error) => {
				if (error) console.log(`Could not save PE Spectrum m${this.id_str}:`, error);
			});
		}
		if (this.save_best_fit && this.radii && this.best_fit) {
			let file_name = path.join(PESpectrum.save_directory, this.sim_file_name);
			let best_fit = zip(this.radii, ...this.best_fit);
			let sim_string = best_fit.map((row) => row.map((e) => e.toExponential(8)).join(" ")).join("\n");
			fs.writeFile(file_name, sim_string, (error) => {
				if (error) console.log(`Could not save PE Spectrum Best Fit m${this.id_str}:`, error);
			});
		}
		if (this.save_residuals && this.radii && this.residuals) {
			let file_name = path.join(PESpectrum.save_directory, this.res_file_name);
			let residuals = zip(this.radii, ...this.residuals);
			let res_string = residuals.map((row) => row.map((e) => e.toExponential(8)).join(" ")).join("\n");
			fs.writeFile(file_name, res_string, (error) => {
				if (error) console.log(`Could not save PE Spectrum Residuals m${this.id_str}:`, error);
			});
		}
	}
}

class IRPESpectrum extends PESpectrum {
	constructor() {
		super();
	}

	/** IR PE spectrum file name */
	get pes_file_name_ir() {
		return `${this.formatted_date}m${this.id_str}_IR_pes.dat`;
	}

	/** IR PE spectrum best fit file name */
	get sim_file_name_ir() {
		return `${this.formatted_date}m${this.id_str}_IR_sim.dat`;
	}

	/** IR PE spectrum residuals file name */
	get res_file_name_ir() {
		return `${this.formatted_date}m${this.id_str}_IR_res.dat`;
	}

	update(melexir_results_off, melexir_results_on) {
		if (melexir_results_off?.radii) this.radii_off = melexir_results_off.radii;
		if (melexir_results_off?.spectrum) this.spectrum_off = melexir_results_off.spectrum;
		if (melexir_results_off?.residuals) this.residuals_off = melexir_results_off.residuals;
		if (melexir_results_off?.best_fit) this.best_fit_off = melexir_results_off.best_fit;

		if (melexir_results_on?.radii) this.radii_on = melexir_results_on.radii;
		if (melexir_results_on?.spectrum) this.spectrum_on = melexir_results_on.spectrum;
		if (melexir_results_on?.residuals) this.residuals_on = melexir_results_on.residuals;
		if (melexir_results_on?.best_fit) this.best_fit_on = melexir_results_on.best_fit;
	}

	save_files() {
		const fs = require("fs");
		const path = require("path");

		const zip = (...arr) =>
			Array(Math.max(...arr.map((a) => a.length)))
				.fill()
				.map((_, i) => arr.map((a) => a[i]));

		if (this.save_spectrum) {
			if (this.radii_off && this.spectrum_off) {
				let file_name = path.join(PESpectrum.save_directory, this.pes_file_name);
				let spectrum_off = zip(this.radii_off, ...this.spectrum_off);
				let pes_string = spectrum_off.map((row) => row.map((e) => e.toExponential(8)).join(" ")).join("\n");
				fs.writeFile(file_name, pes_string, (error) => {
					if (error) console.log(`Could not save IR PE Spectrum m${this.id_str} (IR Off):`, error);
				});
			}
			if (this.radii_on && this.spectrum_on) {
				let file_name_ir = path.join(PESpectrum.save_directory, this.pes_file_name_ir);
				let spectrum_on = zip(this.radii_on, ...this.spectrum_on);
				let pes_string_ir = spectrum_on.map((row) => row.map((e) => e.toExponential(8)).join(" ")).join("\n");
				fs.writeFile(file_name_ir, pes_string_ir, (error) => {
					if (error) console.log(`Could not save IR PE Spectrum m${this.id_str} (IR On):`, error);
				});
			}
		}
		if (this.save_best_fit) {
			if (this.radii_off && this.best_fit_off) {
				let file_name = path.join(PESpectrum.save_directory, this.sim_file_name);
				let best_fit_off = zip(this.radii_off, ...this.best_fit_off);
				let sim_string = best_fit_off.map((row) => row.map((e) => e.toExponential(8)).join(" ")).join("\n");
				fs.writeFile(file_name, sim_string, (error) => {
					if (error) console.log(`Could not save IR PE Spectrum Best Fit m${this.id_str} (IR Off):`, error);
				});
			}
			if (this.radii_on && this.best_fit_on) {
				let file_name_ir = path.join(PESpectrum.save_directory, this.sim_file_name_ir);
				let best_fit_on = zip(this.radii_on, ...this.best_fit_on);
				let sim_string_ir = best_fit_on.map((row) => row.map((e) => e.toExponential(8)).join(" ")).join("\n");
				fs.writeFile(file_name_ir, sim_string_ir, (error) => {
					if (error) console.log(`Could not save IR PE Spectrum Best Fit m${this.id_str} (IR On):`, error);
				});
			}
		}
		if (this.save_residuals) {
			if (this.radii_off && this.residuals_off) {
				let file_name = path.join(PESpectrum.save_directory, this.res_file_name);
				let residuals_off = zip(this.radii_off, ...this.residuals_off);
				let res_string = residuals_off.map((row) => row.map((e) => e.toExponential(8)).join(" ")).join("\n");
				fs.writeFile(file_name, res_string, (error) => {
					if (error) console.log(`Could not save IR PE Spectrum Residuals m${this.id_str} (IR Off):`, error);
				});
			}
			if (this.radii_on && this.residuals_on) {
				let file_name_ir = path.join(PESpectrum.save_directory, this.res_file_name_ir);
				let residuals_on = zip(this.radii_on, ...this.residuals_on);
				let res_string_ir = residuals_on.map((row) => row.map((e) => e.toExponential(8)).join(" ")).join("\n");
				fs.writeFile(file_name_ir, res_string_ir, (error) => {
					if (error) console.log(`Could not save IR PE Spectrum Residuals m${this.id_str} (IR On):`, error);
				});
			}
		}
	}
}

module.exports = { PESpectrum, IRPESpectrum };
