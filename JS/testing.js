const melexir = require("bindings")("melexir");

function process() {
	const bin_size = 1024;
	let image = Array.from(Array(bin_size), () => new Array(bin_size).fill(0));

	for (let Y = 0; Y < bin_size; Y++) {
		for (let X = 0; X < bin_size; X++) {
			image[Y][X] = Math.round(Math.random() * 10);
		}
	}

	console.log("Starting Melexir");
	let results = melexir.process(image);
	console.log("Finished Melexir");
}

for (let i = 0; i < 150; i++) {
	console.log(`Iteration: ${i}`);
	process();
}