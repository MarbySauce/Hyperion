class RecentScansRow {
	constructor(image) {
		this.id = image.id;

		this.get_image_info(image);
		if (image.is_ir) this.get_ir_image_info(image);
	}

	get_image_info(image) {
		this.image_wrapper = document.createElement("div");
		this.image_wrapper.classList.add("recent-scans-row");
		if (image.is_ir) {
			this.image_wrapper.classList.add("recent-scans-subimage");
		} else {
			this.image_wrapper.classList.add("recent-scans-image");
		}

		const vals_to_add = [];
		vals_to_add.push(`i${image.id_str}`); // Image ID
		// Converted detachment wavelength
		let wavelength = image.detachment_wavelength.energy.wavelength;
		if (wavelength > 0 && isFinite(wavelength)) wavelength = `${wavelength.toFixed(3)} nm`;
		else wavelength = "-"; // Don't show wavelength if not stored
		vals_to_add.push(wavelength);
		// Converted detachment wavenumber
		let wavenumber = image.detachment_wavelength.energy.wavenumber;
		if (wavenumber > 0 && isFinite(wavenumber)) wavenumber = `${wavenumber.toFixed(3)} cm-1`;
		else wavenumber = "-"; // Don't show wavenumber if not stored
		vals_to_add.push(wavenumber);
		// Frame count
		let frame_count = image.counts.frames.total;
		if (image.is_ir) frame_count = image.counts.frames.off;
		if (frame_count > 1000) frame_count = `${(frame_count / 1000).toFixed(1)}k`;
		vals_to_add.push(frame_count);
		// Electron count
		let electron_count = image.counts.electrons.total;
		if (image.is_ir) electron_count = image.counts.electrons.off;
		if (electron_count > 1e4) electron_count = electron_count.toExponential(2);
		vals_to_add.push(electron_count);

		let tag, text_node;
		for (let i = 0; i < vals_to_add.length; i++) {
			tag = document.createElement("p");
			text_node = document.createTextNode(vals_to_add[i]);
			tag.appendChild(text_node);
			this.image_wrapper.appendChild(tag);
		}
	}

	get_ir_image_info(image) {
		this.ir_image_wrapper = document.createElement("div");
		this.ir_image_wrapper.classList.add("recent-scans-row");
		this.ir_image_wrapper.classList.add("recent-scans-image");

		const vals_to_add = [];
		vals_to_add.push("(IR)");
		// Excitation (nIR) wavelength
		let wavelength = image.excitation_wavelength.nIR.wavelength;
		if (wavelength > 0) wavelength = `${wavelength.toFixed(3)} nm`;
		else wavelength = ""; // Don't show wavelength if not stored
		vals_to_add.push(wavelength);
		// Excitation (converted) wavenumber
		let wavenumber = image.excitation_wavelength.energy.wavenumber;
		if (wavenumber > 0) wavenumber = `${wavenumber.toFixed(3)} cm-1`;
		else wavenumber = ""; // Don't show wavenumber if not stored
		vals_to_add.push(wavenumber);
		// Frame (IR on) count
		let frame_count = image.counts.frames.on;
		if (frame_count > 1000) frame_count = `${(frame_count / 1000).toFixed(1)}k`;
		vals_to_add.push(frame_count);
		// Electron (IR on) count
		let electron_count = image.counts.electrons.on;
		if (electron_count > 1e4) electron_count = electron_count.toExponential(2);
		vals_to_add.push(electron_count);

		let tag, text_node;
		for (let i = 0; i < vals_to_add.length; i++) {
			tag = document.createElement("p");
			text_node = document.createTextNode(vals_to_add[i]);
			tag.appendChild(text_node);
			this.ir_image_wrapper.appendChild(tag);
		}
	}

	update_info(image) {
		this.get_image_info(image);
		if (image.is_ir) this.get_ir_image_info(image);
	}

	add_to_div(div) {
		div.appendChild(this.image_wrapper);
		if (this.ir_image_wrapper) div.appendChild(this.ir_image_wrapper);
	}
}

module.exports = { RecentScansRow };
