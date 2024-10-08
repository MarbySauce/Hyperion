/************************************************** 

	Classes for Processing Wavemeter Data

**************************************************/

/*****************************************************************************

					WAVEMETER MEASUREMENT CLASS

*****************************************************************************/

class WavemeterMeasurement {
	constructor() {
		this.wavelength_values = [];

		this.raw_stats = {
			average: 0,
			stdev: 0,
		};
		this.reduced_stats = {
			average: 0,
			stdev: 0,
		};

		this.laser_wavelength = 0; // Wavelength the laser thinks it's at (this will likely only apply to OPO/A)
		this.laser_offset = 0; // The offset between laser wavelength and actual value (measured - expected)
	}

	static get minimum_stdev() {
		return this._minimum_stdev;
	}

	static set minimum_stdev(value) {
		this._minimum_stdev = value;
	}

	get minimum_stdev() {
		return this.constructor.minimum_stdev;
	}

	get wavelength() {
		return this.reduced_stats.average;
	}

	add(wavelength) {
		this.wavelength_values.push(wavelength);
	}

	get_average() {
		let { initial: raw, final: reduced } = reduced_average(this.wavelength_values, this.minimum_stdev);
		this.raw_stats = raw;
		this.reduced_stats = reduced;
		return this.reduced_stats;
	}

	copy() {
		let copy = new WavemeterMeasurement();
		copy.wavelength_values = [...this.wavelength_values];
		copy.raw_stats = { ...this.raw_stats };
		copy.reduced_stats = { ...this.reduced_stats };
		copy.laser_wavelength = this.laser_wavelength;
		copy.laser_offset = this.laser_offset;
		return copy;
	}
}

/*****************************************************************************

								FUNCTIONS

*****************************************************************************/

/**
 *  Get the average and standard deviation of an array
 * @param {array} array
 * @returns {{average: number, stdev: number}} {average, standard deviation}
 */
function average(array) {
	// Calculating standard deviation as sqrt(<x^2> - <x>^2)
	const len = array.length;
	if (len === 0) {
		return { average: 0, stdev: 0 };
	}
	let sum = 0; // Sum of elements in array
	let sum2 = 0; // Sum of elements^2
	for (let i = 0; i < len; i++) {
		sum += array[i];
		sum2 += array[i] ** 2;
	}
	let average = sum / len;
	let stdev = Math.sqrt(sum2 / len - average ** 2);

	if (isNaN(average)) average = 0;
	if (isNaN(stdev)) stdev = -1;

	return { average, stdev };
}

/**
 * Calculate average and filter outliers until standard deviation is small enough
 * @param {array} values - Array of values to evaluate
 * @param {number} minimum_stdev - Standard deviation threshold for reduction (i.e. reduces until stdev below this value)
 * @param {number} minimum_length - Minimum length of final array (i.e. don't reduce too much)
 * @param {number} max_iteration_count - Maximum number of reduction iterations to complete
 * @returns {{initial: {average: number, stdev: number}, final: {average: number, stdev: number}}} statistical values before and after reduction
 */
function reduced_average(values, minimum_stdev, minimum_length, max_iteration_count = 10) {
	let iteration_count = 0; // Keep track of how many iterations were used to get reduced average

	let avg, stdev;
	// Unpack averaging results
	({ average: avg, stdev: stdev } = average(values)); // Weird JS behavior, we have to put the whole thing in parenthesis to unpack properly
	const reduced_avg_results = {
		initial: {
			average: avg,
			stdev: stdev,
		},
		final: {
			average: 0,
			stdev: 0,
		},
	};

	while (stdev > minimum_stdev) {
		// Filter out values more than 1 stdev away from average (68% of true values will fall within this range)
		values = values.filter((val) => avg - stdev < val && val < avg + stdev);
		// Uptick reduction iteration counter
		iteration_count++;
		if (values.length < minimum_length || iteration_count > max_iteration_count) {
			break;
		}
		({ average: avg, stdev: stdev } = average(values));
	}

	reduced_avg_results.final = {
		average: avg,
		stdev: stdev,
	};

	return reduced_avg_results;
}

/***************************************************************************/

WavemeterMeasurement.minimum_stdev = 0.1;

module.exports = { WavemeterMeasurement, average, reduced_average };
