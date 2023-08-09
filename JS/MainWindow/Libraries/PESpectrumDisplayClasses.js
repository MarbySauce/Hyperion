const { SafePESpectrum, SafeIRPESpectrum } = require("./PESpectrumClasses");
const { SafeIRImage, SafeImage } = require("./ImageClasses.js");

// Class for creating Radio buttons to select image PE spectra for display
class PESRadio {
	/**
	 * @param {SafeImage | SafeIRImage} image
	 */
	constructor(image) {
		this.image = image;
		if (image.is_ir) this.spectrum_display = new IRPESpectrumDisplay(image);
		else this.spectrum_display = new PESpectrumDisplay(image);

		this.radio = this.create_radio();

		this.label = document.createElement("label");
		this.label.innerText = `i${this.image.id_str}`;
		if (this.image.is_ir) this.label.innerText += " (IR)";
		this.label.for = this.radio.id;

		this.wrapper = document.createElement("div");
		this.wrapper.classList.add("spectrum-selection-element");

		this.wrapper.appendChild(this.radio);
		this.wrapper.appendChild(this.label);

		this.callback_fn;
	}

	create_radio() {
		let radio = document.createElement("input");
		radio.type = "radio";
		radio.name = "pe_spectra";
		radio.value = this.image.id_str;
		radio.id = this.image.id_str;

		radio.onclick = () => {
			console.log(this.spectrum_display);
			this.callback_fn(this.spectrum_display);
		};
		return radio;
	}

	set_up_callback(callback_fn) {
		this.callback_fn = callback_fn;
	}

	add_to_div(div) {
		div.appendChild(this.wrapper);
	}
}

class PESpectrumDisplay {
	constructor(image_class) {
		this.image = image_class;

		this.show_radial = true;
		this.show_difference = false;
		this.show_anisotropy = false;
		this.can_show_plot = false;
		this.can_show_ebe = false;
		this.can_show_difference = false;

		// Extract necessary info
		this.vmi_constants = this.image?.vmi_info.calibration_constants;
		this.detachment_hv = this.image?.detachment_wavelength.energy.wavenumber;
		if (this.vmi_constants?.a > 0 && this.detachment_hv > 0) this.can_show_ebe = true;

		this.process_spectrum();
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
		if (this.can_show_plot) {
			if (this.show_radial || !this.can_show_ebe) {
				// Show radial plot
				returned_data.labels = this.radii;
				returned_data.datasets.push({
					label: "Intensity",
					data: this.intensity_r,
					borderColor: "black",
					pointHitRadius: 10,
				});
				// Also show anisotropy
				if (this.show_anisotropy) {
					returned_data.datasets.push({
						label: "Anisotropy",
						data: this.anisotropy_r,
						borderColor: "red",
						pointHitRadius: 5,
					});
				}
			} else {
				// Show eBE plot
				returned_data.labels = this.ebe;
				returned_data.datasets.push({
					label: "Intensity",
					data: this.intensity_ebe,
					borderColor: "black",
					pointHitRadius: 10,
				});
				// Also show anisotropy
				if (this.show_anisotropy) {
					returned_data.datasets.push({
						label: "Anisotropy",
						data: this.anisotropy_ebe,
						borderColor: "red",
						pointHitRadius: 5,
					});
				}
			}
		}
		return returned_data;
	}

	get x_scale() {
		if (!this.can_show_plot) return { type: "linear" };
		let callback_fn = (value) => value;
		let title = "";
		if (this.show_radial || !this.can_show_ebe) {
			callback_fn = (value) => `${Math.round(value)}px`;
			title = "Radius (px)";
		} else {
			callback_fn = (value) => `${Math.round(value)}cm-1`;
			// \u207B is unicode for superscript "-", and \u00B9 is for superscript "1"
			title = "eBE (cm\u207B\u00B9)";
		}
		return {
			type: "linear",
			title: {
				text: title,
				color: "black",
				display: true,
			},
			ticks: {
				callback: callback_fn,
			},
		};
	}

	get y_scale() {
		let title = "Electron Intensity";
		if (this.can_show_difference && this.show_difference) title = "Difference Signal";
		return {
			title: {
				text: title,
				color: "black",
				display: true,
			},
		};
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
		return {
			display: true,
			fullSize: false,
			align: "end",
			text: `Displaying Image: i${this.image.id_str}`,
			padding: 0,
		};
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
		this.zeros = new Array(this.radii.length).fill(0);
		for (let i = 0; i < this.difference_r.length; i++) {
			this.difference_r[i] = this.intensity_on_r[i] - this.intensity_off_r[i];
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
		for (let i = 0; i < this.difference_ebe.length; i++) {
			this.difference_ebe[i] = this.intensity_on_ebe[i] - this.intensity_off_ebe[i];
		}
	}

	get data() {
		const returned_data = {
			labels: [],
			datasets: [],
		};
		if (this.can_show_plot) {
			if (this.show_radial || !this.can_show_ebe) {
				// Show radial plot
				returned_data.labels = this.radii;
				returned_data.datasets.push({
					label: "Intensity",
					data: this.intensity_off_r,
					borderColor: "black",
					pointHitRadius: 10,
				});
				// Also show anisotropy
				if (this.show_anisotropy) {
					returned_data.datasets.push({
						label: "Anisotropy",
						data: this.anisotropy_off_r,
						borderColor: "red",
						pointHitRadius: 5,
					});
				}
			} else {
				// Show eBE plot
				returned_data.labels = this.ebe;
				returned_data.datasets.push({
					label: "Intensity",
					data: this.intensity_off_ebe,
					borderColor: "black",
					pointHitRadius: 10,
				});
				// Also show anisotropy
				if (this.show_anisotropy) {
					returned_data.datasets.push({
						label: "Anisotropy",
						data: this.anisotropy_off_ebe,
						borderColor: "red",
						pointHitRadius: 5,
					});
				}
			}
		}
		return returned_data;
	}

	get x_scale() {
		if (!this.can_show_plot) return { type: "linear" };
		let callback_fn = (value) => value;
		let title = "";
		if (this.show_radial || !this.can_show_ebe) {
			callback_fn = (value) => `${Math.round(value)}px`;
			title = "Radius (px)";
		} else {
			callback_fn = (value) => `${Math.round(value)}cm-1`;
			// \u207B is unicode for superscript "-", and \u00B9 is for superscript "1"
			title = "eBE (cm\u207B\u00B9)";
		}
		return {
			type: "linear",
			title: {
				text: title,
				color: "black",
				display: true,
			},
			ticks: {
				callback: callback_fn,
			},
		};
	}

	get y_scale() {
		let title = "Electron Intensity";
		if (this.can_show_difference && this.show_difference) title = "Difference Signal";
		return {
			title: {
				text: title,
				color: "black",
				display: true,
			},
		};
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
		return {
			display: true,
			fullSize: false,
			align: "end",
			text: `Displaying Image: i${this.image.id_str}`,
			padding: 0,
		};
	}
}

module.exports = { PESRadio, PESpectrumDisplay, IRPESpectrumDisplay };
