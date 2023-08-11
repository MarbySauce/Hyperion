class ActionSpectraRow {
	constructor(image) {
		this.id = image.id;
		this.id_str = image.id_str;

		this.outer_wrapper = document.createElement("div");
		this.outer_wrapper.classList.add("action-spectrum-selection-outer");

		this.checkbox = document.createElement("input");
		this.checkbox.type = "checkbox";
		this.checkbox.classList.add("action-spectrum-checkbox");
		this.outer_wrapper.appendChild(this.checkbox);

		this.inner_wrapper = document.createElement("div");
		this.inner_wrapper.classList.add("action-spectrum-selection-inner");

		this.radio = document.createElement("input");
		this.radio.type = "radio";
		this.radio.name = "action_pe_spectra";
		this.inner_wrapper.appendChild(this.radio);

		this.inner_wrapper.onclick = () => {
			this.radio.checked = true;
		};

		this.id_label = document.createElement("label");
		this.id_label.innerText = `i${this.id_str}`;
		this.inner_wrapper.appendChild(this.id_label);

		this.outer_wrapper.appendChild(this.inner_wrapper);
	}

	add_to_div(div) {
		div.appendChild(this.outer_wrapper);
	}
}

module.exports = { ActionSpectraRow };
