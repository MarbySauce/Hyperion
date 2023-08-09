const { SafePESpectrum, SafeIRPESpectrum } = require("./PESpectrumClasses");
const { SafeIRImage, SafeImage } = require("./ImageClasses.js");

// Class for creating Radio buttons to select image PE spectra for display
class PESRadio {
	/**
	 * @param {SafeImage | SafeIRImage} image
	 */
	constructor(image) {
		this.image = image;
		this.pe_spectrum = image.pe_spectrum;
		this.radio = this.create_radio();

		this.label = document.createElement("label");
		this.label.innerText = `i${this.image.id_str}`;
		if (this.image.is_ir) this.label.innerText += " (IR)";
		this.label.for = this.radio.id;

		this.wrapper = document.createElement("div");
		this.wrapper.classList.add("spectrum-selection-element");

		this.wrapper.appendChild(this.radio);
		this.wrapper.appendChild(this.label);
	}

	create_radio() {
		let radio = document.createElement("input");
		radio.type = "radio";
		radio.name = "pe_spectra";
		radio.value = this.image.id_str;
		radio.id = this.image.id_str;

		radio.onclick = () => {
			console.log(`${this.image.id} Clicked!`);
		};
		return radio;
	}

	add_to_div(div) {
		div.appendChild(this.wrapper);
	}
}

module.exports = { PESRadio };
