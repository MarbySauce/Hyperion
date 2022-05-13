let spectrum_display;
// NOTE TO MARTY: Should probably try to make all of these one (or two) functions
document.getElementById("SeviPageDown").onclick = function () {
	sevi_page_down_function();
};

function sevi_page_down_function() {
	const firstPage = document.getElementById("SeviFirstPage");
	const secondPage = document.getElementById("SeviSecondPage");

	firstPage.style.display = "none";
	secondPage.style.display = "grid";

	console.time("Spectrum");
	spectrum_display = new Chart(document.getElementById("PESpectrum").getContext("2d"), {
		type: "line",
		data: {
			labels: [0, 1, 2, 3, 4, 5],
			datasets: [
				{
					data: [0, 2, 0, 0, 1.8, 0],
					label: "IR On",
					borderColor: "red",
				},
				{
					data: [0, 1, 0, 0, 2, 0],
					label: "IR Off",
					borderColor: "black",
				},
			],
		},
		options: {
			scales: {
				y: {
					beginAtZero: true,
					title: {
						text: "Electron Intensity",
						color: "black",
						display: true,
					},
				},
				x: {
					title: {
						text: "eBE ( cm\u207B\u00B9 )", // \u207B is unicode for superscript "-", and \u00B9 is for superscript "1"
						color: "black",
						display: true,
					},
				},
			},
			plugins: {
				title: {
					display: true,
					fullSize: false,
					align: "end",
					text: "Displaying Image: i01",
					padding: 0,
				},
			},
			//animation: false,
			//aspectRatio: 2.8,
		},
	});
	console.timeEnd("Spectrum");
}

document.getElementById("SeviPageUp").onclick = function () {
	const firstPage = document.getElementById("SeviFirstPage");
	const secondPage = document.getElementById("SeviSecondPage");

	firstPage.style.display = "grid";
	secondPage.style.display = "none";

	spectrum_display.destroy();
};

document.getElementById("IRActionPageDown").onclick = function () {
	const firstPage = document.getElementById("IRActionFirstPage");
	const secondPage = document.getElementById("IRActionSecondPage");

	firstPage.style.display = "none";
	secondPage.style.display = "grid";
};

document.getElementById("IRActionPageUp").onclick = function () {
	const firstPage = document.getElementById("IRActionFirstPage");
	const secondPage = document.getElementById("IRActionSecondPage");

	firstPage.style.display = "grid";
	secondPage.style.display = "none";
};

function make_display_black() {
	const display = document.getElementById("Display");
	const ctx = display.getContext("2d");
	let image_width = scan.accumulated_image.params.accumulation_width;
	let image_height = scan.accumulated_image.params.accumulation_height;

	ctx.fillStyle = "black";
	ctx.fillRect(0, 0, image_width, image_height);
}

function add_file_names() {
	const image_file = document.getElementById("CurrentImageFile");
	const ir_image_file = document.getElementById("CurrentImageFileIROn");
	let current_date = getFormattedDate();
	image_file.value = current_date + "i01_1024.i0N";
	ir_image_file.value = current_date + "i01_IR_1024.i0N";
}

function add_photon_energies() {
	const detachment_wavelength = document.getElementById("DetachmentWavelength");
	const detachment_converted_wavelength = document.getElementById("ConvertedWavelength");
	const detachment_wavenumber = document.getElementById("DetachmentWavenumber");
	const ir_detachment_wavelength = document.getElementById("IRWavelength");
	const ir_detachment_converted_wavelength = document.getElementById("IRConvertedWavelength");
	const ir_detachment_wavenumber = document.getElementById("IRWavenumber");
	const desired_energy = document.getElementById("DesiredEnergy");
	const desired_range_message = document.getElementById("DesiredIRRangeMessage");

	detachment_wavelength.value = 640.054;
	detachment_wavenumber.value = 15623.682;
	ir_detachment_wavelength.value = 837.799;
	ir_detachment_converted_wavelength.value = 3933.979;
	ir_detachment_wavenumber.value = 2541.955;
	desired_energy.value = 2543.567;
	desired_range_message.innerText = "[ " + "mIR" + " ]";
}

function add_recent_files() {
	const recent_scans_section = document.getElementById("RecentScansSection");
	let tag;
	let text_node;
	let file_info = ["051222i01_1024.i0N", "640.054", "15623.682", "11k", "3.241e5"];
	for (let i = 0; i < 20; i++) {
		for (let j = 0; j < file_info.length; j++) {
			tag = document.createElement("p");
			text_node = document.createTextNode(file_info[j]);
			tag.appendChild(text_node);
			recent_scans_section.appendChild(tag);
		}
	}
}
