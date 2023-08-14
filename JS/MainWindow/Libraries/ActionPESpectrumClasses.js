const { Chart, registerables } = require("chart.js");
const { zoomPlugin } = require("chartjs-plugin-zoom");
const { Image } = require("./ImageClasses.js");
const { ImageManagerMessenger } = require("./ImageManager.js");
const { IRActionManagerMessenger } = require("./IRActionManager.js");
const { UpdateMessenger } = require("./UpdateMessenger.js");

// Messenger used for displaying update or error messages to the Message Display
const update_messenger = new UpdateMessenger();

if (registerables) Chart.register(...registerables);
if (zoomPlugin) Chart.register(zoomPlugin);

/***************************************************/

class ActionSpectraRow {
	constructor(image, is_checked) {
		this.id = image.id;
		this.id_str = image.id_str;

		this.spectrum_display = new ActionPESpectrumDisplay(image);

		this.outer_wrapper = document.createElement("div");
		this.outer_wrapper.classList.add("action-spectrum-selection-outer");

		this.checkbox = document.createElement("input");
		this.checkbox.type = "checkbox";
		if (is_checked) this.checkbox.checked = true;
		this.checkbox.classList.add("action-spectrum-checkbox");
		this.outer_wrapper.appendChild(this.checkbox);

		this.inner_wrapper = document.createElement("div");
		this.inner_wrapper.classList.add("action-spectrum-selection-inner");

		this.radio = document.createElement("input");
		this.radio.type = "radio";
		this.radio.name = "action_pe_spectra";
		this.inner_wrapper.appendChild(this.radio);

		this.callback_fn;
		this.inner_wrapper.onclick = () => {
			this.radio.checked = true;
			if (this.callback_fn) this.callback_fn(this.spectrum_display);
		};

		this.id_label = document.createElement("label");
		this.id_label.innerText = `i${this.id_str}`;
		this.inner_wrapper.appendChild(this.id_label);

		this.nir_label = document.createElement("label");
		this.inner_wrapper.appendChild(this.nir_label);

		this.stdev_label = document.createElement("label");
		this.inner_wrapper.appendChild(this.stdev_label);

		this.ir_label = document.createElement("label");
		this.inner_wrapper.appendChild(this.ir_label);

		this.outer_wrapper.appendChild(this.inner_wrapper);

		this.get_image_info(image);
	}

	get_image_info(image) {
		this.nir_wl = image.excitation_wavelength.nIR.wavelength;
		if (this.nir_wl > 0) this.nir_label.innerText = this.nir_wl.toFixed(3);

		let stdev = image.excitation_measurement.reduced_stats.stdev;
		if (this.nir_wl > 0) this.stdev_label.innerText = stdev.toFixed(5);

		this.ir_energy = image.excitation_wavelength.energy.wavenumber;
		if (this.ir_energy > 0) this.ir_label.innerText = this.ir_energy.toFixed(3);

		this.electrons = {
			on: image.counts.electrons.on,
			off: image.counts.electrons.off,
		};
	}

	set_up_callback(callback_fn) {
		this.callback_fn = callback_fn;
	}

	add_to_div(div) {
		if (div) div.appendChild(this.outer_wrapper);
	}

	update_image(image) {
		this.get_image_info(image);
		this.spectrum_display = new ActionPESpectrumDisplay(image);
	}
}

class ActionRadiiRow {
	constructor(Ri, Rf) {
		this.Ri = Math.round(Ri - 0.5); // Convert to index
		this.Rf = Math.round(Rf - 0.5); // ( index = R + 0.5 )

		this.wrapper = document.createElement("div");
		this.wrapper.classList.add("action-spectrum-peak-row");

		this.Ri_label = document.createElement("label");
		this.Ri_label.innerText = `Ri: ${this.Ri}`;
		this.wrapper.appendChild(this.Ri_label);

		this.Rf_label = document.createElement("label");
		this.Rf_label.innerText = `Rf: ${this.Rf}`;
		this.wrapper.appendChild(this.Rf_label);

		this.remove_button = document.createElement("button");
		this.remove_button.classList.add("image-id-button");
		this.remove_button.classList.add("delete-peak");
		this.remove_button.innerText = "-";
		this.wrapper.appendChild(this.remove_button);

		this.remove_button_callback;
		this.remove_button.onclick = () => {
			this.remove_button_callback();
		};
	}

	get is_depletion() {
		return false;
	}

	get is_growth() {
		return false;
	}

	set_callback(callback) {
		this.remove_button_callback = callback;
	}

	add_to_div(div) {
		if (div) div.appendChild(this.wrapper);
	}
}

class ActionRadiiDepletionRow extends ActionRadiiRow {
	constructor(Ri, Rf) {
		super(Ri, Rf);
	}

	get is_depletion() {
		return true;
	}
}

class ActionRadiiGrowthRow extends ActionRadiiRow {
	constructor(Ri, Rf) {
		super(Ri, Rf);
	}

	get is_growth() {
		return true;
	}
}

/***************************************************/

class ActionPESpectrumDisplay {
	static get show_ebe() {
		return ActionPESpectrumDisplay._show_ebe || false;
	}
	static set show_ebe(bool) {
		ActionPESpectrumDisplay._show_ebe = bool === true;
	}
	static toggle_ebe() {
		ActionPESpectrumDisplay.show_ebe = !ActionPESpectrumDisplay.show_ebe;
	}

	constructor(image) {
		this.image = image;

		// Extract necessary info
		this.vmi_constants = this.image?.vmi_info.calibration_constants;
		this.detachment_hv = this.image?.detachment_wavelength.energy.wavenumber;
		if (this.vmi_constants?.a > 0 && this.detachment_hv > 0) this.can_show_ebe = true;

		this.process_spectrum();
	}

	get can_show_plot() {
		// Defaults to false (instead of undefined)
		return this._can_show_plot || false;
	}

	set can_show_plot(bool) {
		// Set to true if `bool` is true, otherwise set to false
		this._can_show_plot = bool === true;
	}

	get can_show_ebe() {
		return this._can_show_ebe || false;
	}

	set can_show_ebe(bool) {
		this._can_show_ebe = bool === true;
	}

	get show_ebe() {
		if (!this.can_show_plot) return false;
		if (!this.can_show_ebe) return false;
		return ActionPESpectrumDisplay.show_ebe || false;
	}

	process_spectrum() {
		this.radii = this.image?.pe_spectrum.radii_off;
		this.spectrum_off = this.image?.pe_spectrum.spectrum_off;
		this.spectrum_on = this.image?.pe_spectrum.spectrum_on;
		if (this.spectrum_off) {
			this.can_show_plot = true;
			this.intensity_off = this.spectrum_off[0];
			this.anisotropy_off = this.spectrum_off[1];
			this.intensity_on = this.spectrum_on[0];
			this.anisotropy_on = this.spectrum_on[1];
		}
		this.normalize_radial_spectrum();
		this.normalize_ebe_spectrum();
	}

	normalize_radial_spectrum() {
		if (!this.can_show_plot) return;
		let max_val = Math.max(...this.intensity_off) || 1;
		this.intensity_off_r = this.intensity_off.map((el) => el / max_val);
		this.anisotropy_off_r = this.anisotropy_off.map((el) => el / max_val);
		this.intensity_on_r = this.intensity_on.map((el) => el / max_val);
		this.anisotropy_on_r = this.anisotropy_on.map((el) => el / max_val);
		// Calculate difference spectrum
		this.difference_r = new Array(this.radii.length).fill(0);
		this.difference_anisotropy_r = new Array(this.radii.length).fill(0);
		this.zeros = new Array(this.radii.length).fill(0);
		for (let i = 0; i < this.difference_r.length; i++) {
			this.difference_r[i] = this.intensity_on_r[i] - this.intensity_off_r[i];
			this.difference_anisotropy_r[i] = this.anisotropy_on_r[i] - this.anisotropy_off_r[i];
		}
		this.can_show_difference = true;
	}

	normalize_ebe_spectrum() {
		if (!this.can_show_ebe) return;
		// Need to apply transformation Jacobian before normalizing
		const { a, b } = this.vmi_constants;
		const hv = this.detachment_hv;
		let Jacobian = (r) => 2 * a * r + 4 * b * r ** 3;
		let EBE = (r) => hv - (a * r ** 2 + b * r ** 4);

		// Radial values are always the index + 0.5
		this.intensity_off_ebe = this.intensity_off.map((el, i) => el / Jacobian(i + 0.5));
		this.anisotropy_off_ebe = this.anisotropy_off.map((el, i) => el / Jacobian(i + 0.5));
		this.intensity_on_ebe = this.intensity_on.map((el, i) => el / Jacobian(i + 0.5));
		this.anisotropy_on_ebe = this.anisotropy_on.map((el, i) => el / Jacobian(i + 0.5));
		this.ebe = this.radii.map((r) => EBE(r));
		// Normalize
		let max_val = Math.max(...this.intensity_off_ebe) || 1;
		this.intensity_off_ebe = this.intensity_off_ebe.map((el) => el / max_val);
		this.anisotropy_off_ebe = this.anisotropy_off_ebe.map((el) => el / max_val);
		this.intensity_on_ebe = this.intensity_on_ebe.map((el) => el / max_val);
		this.anisotropy_on_ebe = this.anisotropy_on_ebe.map((el) => el / max_val);
		// Calculate difference spectrum
		this.difference_ebe = new Array(this.radii.length).fill(0);
		this.difference_anisotropy_ebe = new Array(this.radii.length).fill(0);
		for (let i = 0; i < this.difference_ebe.length; i++) {
			this.difference_ebe[i] = this.intensity_on_ebe[i] - this.intensity_off_ebe[i];
			this.difference_anisotropy_ebe[i] = this.anisotropy_on_ebe[i] - this.anisotropy_off_ebe[i];
		}
	}

	get data() {
		const returned_data = {
			labels: [],
			datasets: [],
		};
		if (!this.can_show_plot) {
			return returned_data;
		}
		if (this.show_ebe) {
			// Show IR On/Off eBE plot
			returned_data.labels = this.ebe;
			// Push IR On first so that it appears on top of IR Off
			returned_data.datasets.push(
				{
					label: "IR On",
					data: this.intensity_on_ebe,
					borderColor: "red",
					pointHitRadius: 10,
				},
				{
					label: "IR Off",
					data: this.intensity_off_ebe,
					borderColor: "black",
					pointHitRadius: 10,
				}
			);
		} else {
			// Show IR On/Off radial plot
			returned_data.labels = this.radii;
			// Push IR On first so that it appears on top of IR Off
			returned_data.datasets.push(
				{
					label: "IR On",
					data: this.intensity_on_r,
					borderColor: "red",
					pointHitRadius: 10,
				},
				{
					label: "IR Off",
					data: this.intensity_off_r,
					borderColor: "black",
					pointHitRadius: 10,
				}
			);
		}
		return returned_data;
	}

	get displayed_intensity_off() {
		if (!this.can_show_plot) return [];
		if (this.show_ebe) return this.intensity_off_ebe;
		else return this.intensity_off_r;
	}

	get displayed_intensity_on() {
		if (!this.can_show_plot) return [];
		if (this.show_ebe) return this.intensity_on_ebe;
		else return this.intensity_on_r;
	}

	get x_axis_title() {
		// \u207B is unicode for superscript "-", and \u00B9 is for superscript "1"
		if (this.show_ebe) return "eBE (cm\u207B\u00B9)";
		else if (this.can_show_plot) return "Radius (px)";
		else return "";
	}

	get y_axis_title() {
		if (this.can_show_plot) return "Electron Signal";
		else return "";
	}

	get tooltip() {
		return {
			callbacks: {
				title: ([context]) => {
					return `${context.dataset.label}: ${context.raw.toFixed(3)}`;
				},
				label: (context) => {
					if (!this.can_show_plot) return "";
					let r = this.radii[context.dataIndex];
					if (r) return `R: ${r.toFixed(2)} px`;
					else return "";
				},
				afterLabel: (context) => {
					if (!this.can_show_ebe) return "";
					let ebe = this.ebe[context.dataIndex];
					if (ebe) return `eBE: ${ebe.toFixed(3)} cm-1`;
					else return "";
				},
			},
		};
	}

	get plugins_title() {
		if (this.can_show_plot) return `Displaying Image: i${this.image.id_str}`;
		else return "";
	}
}

/***************************************************/

// Classes for cycling through colors
class ActionColors {
	static Depletion = new ActionColors(["darkblue", "darkmagenta", "blue", "darkturquoise", "blueviolet", "dodgerblue"]);
	static Growth = new ActionColors(["red", "firebrick", "deeppink", "tomato", "darkred", "fuchsia", "indianred"]);

	constructor(colors) {
		this.colors = colors;
		this.index = 0;
	}

	get next() {
		let c = this.colors[this.index];
		this.index++;
		this.index %= this.colors.length;
		return c;
	}
}

class ActionSpectrumCalculator {
	constructor(all_spectra, depletion_peaks, growth_peaks) {
		this.all_spectra = all_spectra;
		this.depletion_peaks = depletion_peaks;
		this.growth_peaks = growth_peaks;

		this.energies = []; // Simple array of numbers
		this.intensity_off = [];
		this.image_ids = [];
		this.depletion = []; // { label: "", values: [] } <- for each peak
		this.growth = [];

		this.normalized_depletion = []; // { label: "", values: [] } <- for each peak
		this.normalized_growth = [];

		this.save_id = 1;
	}

	/**
	 * Calculate sum of elements in array starting from index `a` and ending at index `b`
	 * @param {Array} array
	 * @param {Number} a
	 * @param {Number} b
	 * @returns {Number}
	 */
	sum(array, a, b) {
		let s = 0;
		let value;
		for (let i = a; i <= b; i++) {
			value = array[i];
			if (value) s += value;
		}
		return s;
	}

	get_energies() {
		this.energies = [];
		for (let row of this.all_spectra) {
			if (!row.checkbox.checked) {
				// Ignore this spectrum
				continue;
			}
			this.energies.push(row.ir_energy);
			this.image_ids.push(row.id_str);
		}
	}

	calculate_depletion() {
		this.depletion = [];
		this.intensity_off = [];
		let label, peak_intensity_off, peak_depletion, Ri, Rf, sum_off, sum_on, max_intensity;
		let max_intensity_off = 0;
		for (let peak of this.depletion_peaks) {
			Ri = peak.Ri;
			Rf = peak.Rf;
			label = `${Ri}-${Rf}px`;
			peak_intensity_off = [];
			peak_depletion = { label: label, values: [] };
			for (let row of this.all_spectra) {
				if (!row.checkbox.checked) {
					// Ignore this spectrum
					continue;
				}
				sum_off = this.sum(row.spectrum_display.intensity_off, Ri, Rf);
				peak_intensity_off.push(sum_off);
				sum_on = this.sum(row.spectrum_display.intensity_on, Ri, Rf);
				peak_depletion.values.push(1 - sum_on / sum_off);
			}
			// We want to normalize the growth peaks to the largest intensity IR Off peak
			// Figure out which peak shows the highest intensity and save that to this.intensity_off
			max_intensity = Math.max(...peak_intensity_off);
			if (max_intensity > max_intensity_off) {
				max_intensity_off = max_intensity;
				this.intensity_off = [...peak_intensity_off];
			}
			this.depletion.push(peak_depletion);
		}
	}

	calculate_growth() {
		this.growth = [];
		let label, peak_growth, Ri, Rf, sum_off, sum_on, dividend, row;
		for (let peak of this.growth_peaks) {
			Ri = peak.Ri;
			Rf = peak.Rf;
			label = `${Ri}-${Rf}px`;
			peak_growth = { label: label, values: [] };
			for (let i = 0; i < this.all_spectra.length; i++) {
				row = this.all_spectra[i];
				if (!row.checkbox.checked) {
					// Ignore this spectrum
					continue;
				}
				sum_off = this.sum(row.spectrum_display.intensity_off, Ri, Rf);
				sum_on = this.sum(row.spectrum_display.intensity_on, Ri, Rf);
				dividend = this.intensity_off[i] || row.electrons.off || 1; // Default to 1 if value is not defined
				peak_growth.values.push((sum_on - sum_off) / dividend);
			}
			this.growth.push(peak_growth);
		}
	}

	calculate() {
		this.get_energies();
		this.calculate_depletion();
		this.calculate_growth();
		this.sort_arrays();
		this.normalize();
	}

	// Sort all values together based on energy
	sort_arrays() {
		// Combine arrays together
		let list = [];
		let element;
		for (let i = 0; i < this.energies.length; i++) {
			element = { energy: this.energies[i], id_str: this.image_ids[i], depletion: [], growth: [] };
			for (let peak of this.depletion) {
				element.depletion.push(peak.values[i]);
			}
			for (let peak of this.growth) {
				element.growth.push(peak.values[i]);
			}
			list.push(element);
		}
		// Sort list by energy
		list.sort(function (a, b) {
			return a.energy < b.energy ? -1 : a.energy == b.energy ? 0 : 1;
		});
		// Unpack list
		for (let i = 0; i < list.length; i++) {
			this.energies[i] = list[i].energy;
			this.image_ids[i] = list[i].id_str;
			for (let j = 0; j < list[i].depletion.length; j++) {
				this.depletion[j].values[i] = list[i].depletion[j];
			}
			for (let j = 0; j < list[i].growth.length; j++) {
				this.growth[j].values[i] = list[i].growth[j];
			}
		}
	}

	normalize() {
		this.normalized_depletion = [];
		this.normalized_growth = [];
		let norm_peak, max_val;
		for (let peak of this.depletion) {
			norm_peak = { label: peak.label };
			max_val = Math.max(...peak.values);
			norm_peak.values = peak.values.map((e) => e / max_val);
			this.normalized_depletion.push(norm_peak);
		}
		for (let peak of this.growth) {
			norm_peak = { label: peak.label };
			max_val = Math.max(...peak.values);
			norm_peak.values = peak.values.map((e) => e / max_val);
			this.normalized_growth.push(norm_peak);
		}
	}

	get data() {
		// Reset color cycle
		ActionColors.Depletion.index = 0;
		ActionColors.Growth.index = 0;
		const returned_data = {
			datasets: [],
		};
		let d, color;
		for (let peak of this.depletion) {
			d = this.energies.map((val, i) => {
				return { x: val, y: peak.values[i] };
			});
			color = ActionColors.Depletion.next;
			returned_data.datasets.push({
				label: `D: ${peak.label}`,
				data: d,
				borderColor: color,
				backgroundColor: color,
				pointHitRadius: 5,
			});
		}
		for (let peak of this.growth) {
			d = this.energies.map((val, i) => {
				return { x: val, y: peak.values[i] };
			});
			color = ActionColors.Growth.next;
			returned_data.datasets.push({
				label: `G: ${peak.label}`,
				data: d,
				borderColor: color,
				backgroundColor: color,
				pointHitRadius: 5,
			});
		}
		return returned_data;
	}

	get norm_data() {
		// Reset color cycle
		ActionColors.Depletion.index = 0;
		ActionColors.Growth.index = 0;
		const returned_data = {
			datasets: [],
		};
		let d, color;
		for (let peak of this.normalized_depletion) {
			d = this.energies.map((val, i) => {
				return { x: val, y: peak.values[i] };
			});
			color = ActionColors.Depletion.next;
			returned_data.datasets.push({
				label: `D: ${peak.label}`,
				data: d,
				borderColor: color,
				backgroundColor: color,
				pointHitRadius: 5,
			});
		}
		for (let peak of this.normalized_growth) {
			d = this.energies.map((val, i) => {
				return { x: val, y: peak.values[i] };
			});
			color = ActionColors.Growth.next;
			returned_data.datasets.push({
				label: `G: ${peak.label}`,
				data: d,
				borderColor: color,
				backgroundColor: color,
				pointHitRadius: 5,
			});
		}
		return returned_data;
	}

	get tooltip() {
		return {
			callbacks: {
				beforeTitle: ([context]) => {
					let label = context.dataset.label;
					let id_str = this.all_spectra[context.dataIndex]?.id_str;
					let new_label;
					if (label[0] === "D") new_label = "Depletion ";
					else if (label[0] === "G") new_label = "Growth ";
					else new_label = "";
					if (id_str) new_label += `(i${id_str})`;
					return new_label;
				},
				title: ([context]) => {
					let label = context.dataset.label;
					if (label[0] === "D" || label[0] === "G") return `R${label.slice(1)}`;
					else return label;
				},
				afterTitle: ([context]) => {
					let data_index = context.dataIndex;
					return `E: ${this.energies[data_index].toFixed(3)}cm-1`;
				},
				label: (context) => {
					let dataset_index = context.datasetIndex;
					let data_index = context.dataIndex;
					let depl_length = this.depletion.length;
					let val;
					if (dataset_index >= depl_length) {
						// Growth peak
						val = this.growth[dataset_index - depl_length].values[data_index] * 100;
					} else {
						// Depletion peak
						val = this.depletion[dataset_index].values[data_index] * 100;
					}
					return `Raw: ${val.toFixed(1)}%`;
				},
				afterLabel: (context) => {
					let dataset_index = context.datasetIndex;
					let data_index = context.dataIndex;
					let depl_length = this.depletion.length;
					let val;
					if (dataset_index >= depl_length) {
						// Growth peak
						val = this.normalized_growth[dataset_index - depl_length].values[data_index] * 100;
					} else {
						// Depletion peak
						val = this.normalized_depletion[dataset_index].values[data_index] * 100;
					}
					return `Norm'd: ${val.toFixed(1)}%`;
				},
			},
		};
	}

	get file_name() {
		return `${this.formatted_date}a${this.save_id_str}.dwt`;
	}

	/** Current date, formatted as MMDDYY */
	get formatted_date() {
		let today = new Date();
		let day = ("0" + today.getDate()).slice(-2);
		let month = ("0" + (today.getMonth() + 1)).slice(-2);
		let year = today.getFullYear().toString().slice(-2);
		return month + day + year;
	}

	get save_id_str() {
		if (this.save_id < 10) return `0${this.save_id}`;
		else return this.save_id.toString();
	}

	set_save_id_input(input) {
		this.save_id_input = input;
	}

	decrease_save_id() {
		if (this.save_id > 1) {
			this.save_id--;
		}
		this.update_save_id_display();
	}

	increase_save_id() {
		this.save_id++;
		this.update_save_id_display();
	}

	update_save_id_display() {
		if (this.save_id_input) this.save_id_input.value = this.save_id;
	}

	save_spectrum() {
		if (this.energies.length === 0) return; // Nothing to save
		//if (Image.do_not_save_to_file) return; // Override save
		const fs = require("fs");
		const path = require("path");
		// Get save directory (I know this isn't a great way to do it but w/ever)
		let save_dir = Image.save_directory;
		// Convert spectrum to string
		let spectrum_str = this.#convert_spectrum_to_text();
		// Save to file
		fs.writeFile(path.join(save_dir, this.file_name), spectrum_str, (error) => {
			if (error) {
				update_messenger.error(`IR Action Spectrum a${this.save_id_str} could not be saved! Error logged to console`);
				console.log(`Could not save IR Action Spectrum a${this.save_id_str}:`, error);
			} else {
				update_messenger.update(`IR Action Spectrum a${this.save_id_str} has been saved to ${this.file_name}!`);
				// Uptick save id
				this.increase_save_id();
			}
		});
	}

	#convert_spectrum_to_text() {
		function pad_left(string, length) {
			while (string.length < length) string = " " + string;
			return string;
		}

		let header = "Img,   IR(cm-1),    e- on,   e- off";
		for (let peak of this.depletion) {
			header += `, ${pad_left(`D:${peak.label}`, 11)}`;
		}
		for (let peak of this.growth) {
			header += `, ${pad_left(`G:${peak.label}`, 11)}`;
		}

		let body = "";
		let e_on, e_off, e_on_str, e_off_str, depl_str, growth_str;
		for (let i = 0; i < this.energies.length; i++) {
			body += " \n";
			body += `i${this.image_ids[i]}`;
			body += `, ${pad_left(this.energies[i].toFixed(3), 10)}`;
			e_on = this.all_spectra[i].electrons.on;
			e_off = this.all_spectra[i].electrons.off;
			e_on_str = `${e_on > 1e4 ? e_on.toExponential(2) : e_on.toString()}`;
			e_off_str = `${e_off > 1e4 ? e_off.toExponential(2) : e_off.toString()}`;
			body += `, ${pad_left(e_on_str, 8)}`;
			body += `, ${pad_left(e_off_str, 8)}`;
			for (let peak of this.depletion) {
				body += `, ${pad_left(peak.values[i].toFixed(4), 11)}`;
			}
			for (let peak of this.growth) {
				body += `, ${pad_left(peak.values[i].toFixed(4), 11)}`;
			}
		}
		return header + body;
	}
}

/***************************************************/

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
		size: 14,
	},
};

const pes_chart_options = {
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
				font: {
					size: 10,
				},
			},
			legend: {
				display: false,
			},
		},
		elements: {
			point: {
				radius: 0,
			},
		},
	},
};

const action_chart_options = {
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
				suggestedMin: 0,
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
		},
		elements: {
			point: {
				radius: 3,
			},
		},
	},
};

/***************************************************/

class ActionModeAnalyzer {
	static get auto_check() {
		return ActionModeAnalyzer._auto_check || false;
	}
	static set auto_check(bool) {
		ActionModeAnalyzer._auto_check = bool === true;
	}

	constructor(pes_chart_ctx, action_chart_ctx) {
		this.pes_chart_ctx = pes_chart_ctx;
		this.action_chart_ctx = action_chart_ctx;
		this.pes_chart = new Chart(pes_chart_ctx, pes_chart_options);
		this.action_chart = new Chart(action_chart_ctx, action_chart_options);

		this.IMMessenger = new ImageManagerMessenger();
		this.IRAMMessenger = new IRActionManagerMessenger();

		this.displayed_spectrum;
		this.all_spectra = [];
		this.depletion_peaks = [];
		this.growth_peaks = [];

		this.spectrum_calculator = new ActionSpectrumCalculator(this.all_spectra, this.depletion_peaks, this.growth_peaks);

		this.show_depletion = false;
		this.show_growth = false;

		this.show_lines = true;

		this.show_normalized = false;

		this.IMMessenger.listen.event.melexir.stop.on((image) => {
			if (!image.is_ir) {
				return;
			}
			// Check if this image is already in list
			let is_not_in_list = true;
			for (let row of this.all_spectra) {
				if (row.id === image.id) {
					// Update that image and end loop
					row.update_image(image);
					// If the updated image is also displayed (i.e. the radio is checked) then update plot
					if (row.radio.checked) {
						this.displayed_spectrum = row.spectrum_display;
						this.#update_pes_plot();
					}
					is_not_in_list = false;
					break;
				}
			}
			if (is_not_in_list) {
				// Create new row and add to list
				let row = new ActionSpectraRow(image, ActionModeAnalyzer.auto_check);
				row.set_up_callback((spectrum_display) => {
					this.displayed_spectrum = spectrum_display;
					this.#update_pes_plot();
				});
				this.all_spectra.push(row);
				row.add_to_div(this.images_div);
				// If that is the only image so far, display it
				if (this.all_spectra.length === 1) {
					this.all_spectra[0].radio.checked = true;
					this.displayed_spectrum = row.spectrum_display;
					this.#update_pes_plot();
				}
			}
		});

		// Have images taken during IR Action scan be used for action spectrum automatically
		this.IRAMMessenger.listen.event.scan.start.on(() => {
			ActionModeAnalyzer.auto_check = true;
		});
		this.IRAMMessenger.listen.event.scan.stop_or_cancel.on(() => {
			// 5s delay to give MLXR time to process
			setTimeout(() => {
				ActionModeAnalyzer.auto_check = false;
			}, 5000);
		});
	}

	reset_pes_zoom() {
		this.pes_chart.resetZoom();
	}
	reset_action_zoom() {
		this.action_chart.resetZoom();
	}
	toggle_ebe_plot() {
		ActionPESpectrumDisplay.toggle_ebe();
		this.#update_pes_plot();
		return this.displayed_spectrum.show_ebe;
	}
	toggle_normalize() {
		this.show_normalized = !this.show_normalized;
		this.#update_action_plot();
		return this.show_normalized;
	}

	toggle_lines() {
		this.show_lines = !this.show_lines;
		if (this.show_lines) action_chart_options.type = "line";
		else action_chart_options.type = "scatter";
		if (this.action_chart) {
			// Need to reset zoom first or else it can't be reset
			this.action_chart.resetZoom();
			this.action_chart.destroy();
		}
		this.action_chart = new Chart(this.action_chart_ctx, action_chart_options);
		this.#update_action_plot();
		return this.show_lines;
	}

	set_depletion_div(div) {
		this.depletion_div = div;
	}
	set_growth_div(div) {
		this.growth_div = div;
	}
	set_images_div(div) {
		this.images_div = div;
	}
	set_save_id_input(input) {
		this.spectrum_calculator.set_save_id_input(input);
	}

	add_depletion_peak(Ri, Rf) {
		let depl_peak;
		if (Rf > Ri) depl_peak = new ActionRadiiDepletionRow(Ri, Rf);
		else depl_peak = new ActionRadiiDepletionRow(Rf, Ri);
		this.depletion_peaks.push(depl_peak);
		depl_peak.set_callback(() => {
			// Delete this peak from depletion_peaks
			const index = this.depletion_peaks.indexOf(depl_peak);
			if (index > -1) {
				// only splice array when item is found
				this.depletion_peaks.splice(index, 1);
			}
			// Clear and re-fill displays
			this.#clear_depletion_div();
			this.#fill_depletion_div();
			// Update plot
			this.#update_pes_plot();
		});
		// Update display
		depl_peak.add_to_div(this.depletion_div);
		// Update plot
		this.#update_pes_plot();
	}
	add_growth_peak(Ri, Rf) {
		let growth_peak;
		if (Rf > Ri) growth_peak = new ActionRadiiGrowthRow(Ri, Rf);
		else growth_peak = new ActionRadiiGrowthRow(Rf, Ri);
		this.growth_peaks.push(growth_peak);
		growth_peak.set_callback(() => {
			// Delete this peak from growth peaks
			const index = this.growth_peaks.indexOf(growth_peak);
			if (index > -1) {
				// only splice array when item is found
				this.growth_peaks.splice(index, 1);
			}
			// Clear and re-fill displays
			this.#clear_growth_div();
			this.#fill_growth_div();
			// Update plot
			this.#update_pes_plot();
		});
		// Update display
		growth_peak.add_to_div(this.growth_div);
		// Update plot
		this.#update_pes_plot();
	}
	toggle_depletion_peaks() {
		this.show_depletion = !this.show_depletion;
		this.#update_pes_plot();
		return this.show_depletion;
	}
	toggle_growth_peaks() {
		this.show_growth = !this.show_growth;
		this.#update_pes_plot();
		return this.show_growth;
	}

	decrease_save_id() {
		this.spectrum_calculator.decrease_save_id();
	}

	increase_save_id() {
		this.spectrum_calculator.increase_save_id();
	}

	calculate_spectrum() {
		this.spectrum_calculator.calculate();
		this.#update_action_plot();
	}
	save_spectrum() {
		this.spectrum_calculator.save_spectrum();
	}

	/* Functions Used Internally */
	#clear_depletion_div() {
		if (this.depletion_div) {
			const length = this.depletion_div.children.length;
			for (let i = 0; i < length; i++) {
				this.depletion_div.removeChild(this.depletion_div.children[0]);
			}
		}
	}
	#fill_depletion_div() {
		for (let row of this.depletion_peaks) {
			row.add_to_div(this.depletion_div);
		}
	}
	#clear_growth_div() {
		if (this.growth_div) {
			const length = this.growth_div.children.length;
			for (let i = 0; i < length; i++) {
				this.growth_div.removeChild(this.growth_div.children[0]);
			}
		}
	}
	#fill_growth_div() {
		for (let row of this.growth_peaks) {
			row.add_to_div(this.growth_div);
		}
	}

	#update_pes_plot() {
		if (this.displayed_spectrum) {
			this.pes_chart.data = this.displayed_spectrum.data;
			this.pes_chart.options.plugins.tooltip = this.displayed_spectrum.tooltip;
			this.pes_chart.options.plugins.title.text = this.displayed_spectrum.plugins_title;
			this.pes_chart.options.scales.x.title.text = this.displayed_spectrum.x_axis_title;
			this.pes_chart.options.scales.y.title.text = this.displayed_spectrum.y_axis_title;
			if (this.show_depletion) this.#show_depletion_peaks();
			if (this.show_growth) this.#show_growth_peaks();
			this.pes_chart.update();
		}
	}

	#show_depletion_peaks() {
		let peak_data, intensity;
		// Fill area under IR On peak(s)
		for (let peak of this.depletion_peaks) {
			peak_data = new Array(this.displayed_spectrum.radii.length).fill(null);
			for (let r = peak.Ri; r <= peak.Rf; r++) {
				intensity = this.displayed_spectrum.displayed_intensity_on[r];
				if (intensity) peak_data[r] = intensity;
			}
			this.pes_chart.data.datasets.push({
				data: peak_data,
				fill: {
					target: "origin",
					above: "hsla(0, 100%, 50%, 0.5)",
				},
			});
		}
		// Fill area under IR Off peak(s)
		for (let peak of this.depletion_peaks) {
			peak_data = new Array(this.displayed_spectrum.radii.length).fill(null);
			for (let r = peak.Ri; r <= peak.Rf; r++) {
				intensity = this.displayed_spectrum.displayed_intensity_off[r];
				if (intensity) peak_data[r] = intensity;
			}
			this.pes_chart.data.datasets.push({
				data: peak_data,
				fill: {
					target: "origin",
					above: "hsla(0, 0%, 0%, 0.5)",
				},
			});
		}
	}

	#show_growth_peaks() {
		let peak_data, intensity;
		// Fill area under IR Off peak(s)
		for (let peak of this.growth_peaks) {
			peak_data = new Array(this.displayed_spectrum.radii.length).fill(null);
			for (let r = peak.Ri; r <= peak.Rf; r++) {
				intensity = this.displayed_spectrum.displayed_intensity_off[r];
				if (intensity) peak_data[r] = intensity;
			}
			this.pes_chart.data.datasets.push({
				data: peak_data,
				fill: {
					target: "origin",
					above: "hsla(0, 0%, 0%, 0.5)",
				},
			});
		}
		// Fill area under IR On peak(s)
		for (let peak of this.growth_peaks) {
			peak_data = new Array(this.displayed_spectrum.radii.length).fill(null);
			for (let r = peak.Ri; r <= peak.Rf; r++) {
				intensity = this.displayed_spectrum.displayed_intensity_on[r];
				if (intensity) peak_data[r] = intensity;
			}
			this.pes_chart.data.datasets.push({
				data: peak_data,
				fill: {
					target: "origin",
					above: "hsla(0, 100%, 50%, 0.5)",
				},
			});
		}
	}

	#update_action_plot() {
		if (this.show_normalized) this.action_chart.data = this.spectrum_calculator.norm_data;
		else this.action_chart.data = this.spectrum_calculator.data;
		this.action_chart.options.plugins.tooltip = this.spectrum_calculator.tooltip;
		this.action_chart.update();
	}
}

module.exports = { ActionModeAnalyzer };
