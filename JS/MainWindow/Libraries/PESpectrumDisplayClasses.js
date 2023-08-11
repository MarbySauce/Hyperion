const { SafePESpectrum, SafeIRPESpectrum } = require("./PESpectrumClasses");
const { SafeIRImage, SafeImage } = require("./ImageClasses.js");

// Class for creating Radio buttons to select image PE spectra for display
class PESRadio {
	/**
	 * @param {SafeImage | SafeIRImage} image
	 * @param {String} radio_name optional - name used to group radio buttons together
	 */
	constructor(image, radio_name) {
		this.image = image;
		if (image.is_ir) this.spectrum_display = new IRPESpectrumDisplay(image);
		else this.spectrum_display = new PESpectrumDisplay(image);

		this.radio = this.create_radio(radio_name);

		this.label = document.createElement("label");
		this.label.innerText = `i${this.image.id_str}`;
		if (this.image.is_ir) this.label.innerText += " (IR)";
		this.label.for = this.radio.id;

		this.wrapper = document.createElement("div");
		this.wrapper.classList.add("spectrum-selection-element");

		this.wrapper.onclick = () => {
			this.radio.checked = true;
			this.callback_fn(this.spectrum_display);
		};

		this.wrapper.appendChild(this.radio);
		this.wrapper.appendChild(this.label);

		this.callback_fn;
	}

	create_radio(radio_name) {
		let radio = document.createElement("input");
		radio.type = "radio";
		if (radio_name) radio.name = radio_name;
		else radio.name = "pe_spectra";
		radio.value = this.image.id_str;
		radio.id = this.image.id_str;

		//radio.onclick = () => {
		//	this.callback_fn(this.spectrum_display);
		//};
		return radio;
	}

	set_up_callback(callback_fn) {
		this.callback_fn = callback_fn;
	}

	add_to_div(div) {
		div.appendChild(this.wrapper);
	}

	update_image(image) {
		if (image.is_ir) this.spectrum_display = new IRPESpectrumDisplay(image);
		else this.spectrum_display = new PESpectrumDisplay(image);
	}
}

class PESpectrumDisplay {
	static get show_anisotropy() {
		return PESpectrumDisplay._show_anisotropy || false;
	}
	static set show_anisotropy(bool) {
		PESpectrumDisplay._show_anisotropy = bool === true;
	}

	static get show_ebe() {
		return PESpectrumDisplay._show_ebe || false;
	}
	static set show_ebe(bool) {
		PESpectrumDisplay._show_ebe = bool === true;
	}

	static get show_difference() {
		return PESpectrumDisplay._show_difference || false;
	}
	static set show_difference(bool) {
		PESpectrumDisplay._show_difference = bool === true;
	}

	static toggle_anisotropy() {
		PESpectrumDisplay.show_anisotropy = !PESpectrumDisplay.show_anisotropy;
	}
	static toggle_ebe() {
		PESpectrumDisplay.show_ebe = !PESpectrumDisplay.show_ebe;
	}
	static toggle_difference() {
		PESpectrumDisplay.show_difference = !PESpectrumDisplay.show_difference;
	}

	constructor(image_class) {
		this.image = image_class;

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

	get can_show_difference() {
		return this._can_show_difference || false;
	}

	set can_show_difference(bool) {
		this._can_show_difference = bool === true;
	}

	get show_anisotropy() {
		if (!this.can_show_plot) return false;
		return PESpectrumDisplay.show_anisotropy || false;
	}

	get show_ebe() {
		if (!this.can_show_plot) return false;
		if (!this.can_show_ebe) return false;
		return PESpectrumDisplay.show_ebe || false;
	}

	get show_difference() {
		if (!this.can_show_plot) return false;
		if (!this.can_show_difference) return false;
		return PESpectrumDisplay.show_difference || false;
	}

	process_spectrum() {
		this.radii = this.image?.pe_spectrum.radii;
		this.spectrum = this.image?.pe_spectrum.spectrum;
		if (this.spectrum) {
			this.can_show_plot = true;
			this.intensity = this.spectrum[0];
			this.anisotropy = this.spectrum[1];
		}
		this.normalize_radial_spectrum();
		this.normalize_ebe_spectrum();
	}

	normalize_radial_spectrum() {
		if (!this.can_show_plot) return;
		let max_val = Math.max(...this.intensity) || 1;
		this.intensity_r = this.intensity.map((el) => el / max_val);
		this.anisotropy_r = this.anisotropy.map((el) => el / max_val);
	}

	normalize_ebe_spectrum() {
		if (!this.can_show_ebe) return;
		// Need to apply transformation Jacobian before normalizing
		const { a, b } = this.vmi_constants;
		const hv = this.detachment_hv;
		let Jacobian = (r) => 2 * a * r + 4 * b * r ** 3;
		let EBE = (r) => hv - (a * r ** 2 + b * r ** 4);

		// Radial values are always the index + 0.5
		this.intensity_ebe = this.intensity.map((el, i) => el / Jacobian(i + 0.5));
		this.anisotropy_ebe = this.anisotropy.map((el, i) => el / Jacobian(i + 0.5));
		this.ebe = this.radii.map((r) => EBE(r));
		// Normalize
		let max_val = Math.max(...this.intensity_ebe) || 1;
		this.intensity_ebe = this.intensity_ebe.map((el) => el / max_val);
		this.anisotropy_ebe = this.anisotropy_ebe.map((el) => el / max_val);
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
			// Show eBE plot
			returned_data.labels = this.ebe;
			returned_data.datasets.push({
				label: "Intensity",
				data: this.intensity_ebe,
				borderColor: "black",
				pointHitRadius: 10,
			});
			if (this.show_anisotropy) {
				// Also show anisotropy eBE plot
				returned_data.datasets.push({
					label: "Anisotropy",
					data: this.anisotropy_ebe,
					borderColor: "red",
					pointHitRadius: 5,
				});
			}
		} else {
			// Show radial plot
			returned_data.labels = this.radii;
			returned_data.datasets.push({
				label: "Intensity",
				data: this.intensity_r,
				borderColor: "black",
				pointHitRadius: 10,
			});
			if (this.show_anisotropy) {
				// Also show anisotropy radial plot
				returned_data.datasets.push({
					label: "Anisotropy",
					data: this.anisotropy_r,
					borderColor: "red",
					pointHitRadius: 5,
				});
			}
			// NOTE TO MARTY: This is a way to fill below the spectra
			let new_arr = new Array(this.radii.length).fill(null);
			for (let i = 140; i < 161; i++) {
				new_arr[i] = this.intensity_r[i];
			}
			returned_data.datasets.push({
				data: new_arr,
				fill: {
					target: "origin",
					above: "darkgray",
				},
			});
		}
		return returned_data;
	}

	get x_axis_title() {
		// \u207B is unicode for superscript "-", and \u00B9 is for superscript "1"
		if (this.show_ebe) return "eBE (cm\u207B\u00B9)";
		else if (this.can_show_plot) return "Radius (px)";
		else return "";
	}

	get y_axis_title() {
		if (this.show_difference) return "Difference Signal";
		else if (this.can_show_plot) return "Electron Signal";
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

class IRPESpectrumDisplay extends PESpectrumDisplay {
	constructor(image_class) {
		super(image_class);
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
		if (this.show_ebe) {
			// Show eBE plot
			returned_data.labels = this.ebe;
			if (this.show_difference) {
				// Show difference spectrum eBE plot and zero line
				returned_data.datasets.push({
					label: "Difference",
					data: this.difference_ebe,
					borderColor: "black",
					pointHitRadius: 10,
				});
				if (this.show_anisotropy) {
					// Show difference anisotropy eBE plot
					returned_data.datasets.push({
						label: "Anisotropy",
						data: this.difference_anisotropy_ebe,
						borderColor: "red",
						pointHitRadius: 5,
					});
				}
				returned_data.datasets.push({
					label: "Zero Line",
					data: this.zeros,
					borderColor: "gray",
					pointHitRadius: 0,
				});
			} else {
				// Show IR On/Off eBE plot
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
				if (this.show_anisotropy) {
					// Show IR On/Off anisotropy eBE plot
					returned_data.datasets.push(
						{
							label: "IR On Anisotropy",
							data: this.anisotropy_on_ebe,
							borderColor: "darkred",
							pointHitRadius: 5,
						},
						{
							label: "IR Off Anisotropy",
							data: this.anisotropy_off_ebe,
							borderColor: "dimgray",
							pointHitRadius: 5,
						}
					);
				}
			}
		} else {
			// Show radial plot
			returned_data.labels = this.radii;
			if (this.show_difference) {
				// Show difference spectrum radial plot and zero line
				returned_data.datasets.push({
					label: "Difference",
					data: this.difference_r,
					borderColor: "black",
					pointHitRadius: 10,
				});
				if (this.show_anisotropy) {
					// Show difference anisotropy radial plot
					returned_data.datasets.push({
						label: "Anisotropy",
						data: this.difference_anisotropy_r,
						borderColor: "red",
						pointHitRadius: 5,
					});
				}
				returned_data.datasets.push({
					label: "Zero Line",
					data: this.zeros,
					borderColor: "gray",
					pointHitRadius: 0,
				});
			} else {
				// Show IR On/Off radial plot
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
				if (this.show_anisotropy) {
					// Show IR On/Off anisotropy radial plot
					returned_data.datasets.push(
						{
							label: "IR On Anisotropy",
							data: this.anisotropy_on_r,
							borderColor: "darkred",
							pointHitRadius: 5,
						},
						{
							label: "IR Off Anisotropy",
							data: this.anisotropy_off_r,
							borderColor: "dimgray",
							pointHitRadius: 5,
						}
					);
				}
				// NOTE TO MARTY: This is a way to fill below the spectra
				let new_arr1 = new Array(this.radii.length).fill(null);
				let new_arr2 = new Array(this.radii.length).fill(null);
				for (let i = 140; i < 161; i++) {
					new_arr1[i] = this.intensity_off_r[i];
				}
				for (let i = 390; i < 411; i++) {
					new_arr2[i] = this.intensity_on_r[i];
				}
				returned_data.datasets.push(
					{
						data: new_arr1,
						fill: {
							target: "origin",
							above: "hsla(0, 0%, 0%, 0.5)",
						},
					},
					{
						data: new_arr2,
						fill: {
							target: "origin",
							above: "hsla(0, 100%, 50%, 0.5)",
						},
					}
				);
			}
		}
		return returned_data;
	}
}

module.exports = { PESRadio, PESpectrumDisplay, IRPESpectrumDisplay };
