function update_action_progress(percent) {
	const progress_bar = document.getElementById("IRActionImageProgressBar");
	const percent_label = document.getElementById("IRActionImageProgressPercentLabel");
	// Move progress bar
	if (percent) {
		if (percent > 100) percent = 100;
		else if (percent < 0) percent = 0;
		progress_bar.style.left = `-${100 - percent}%`;
		percent_label.innerText = `${Math.round(percent)}%`;
	} else {
		progress_bar.style.left = "-100%";
		percent_label.innerText = "0%";
	}
}
/**
 * Show "Complete" text on the progress bar
 */
function show_progress_bar_complete() {
	const progress_bar = document.getElementById("IRActionImageProgressBar");
	progress_bar.innerText = "Complete";
}

/**
 * Erase text on progress bar and hide
 */
function hide_progress_bar_complete() {
	const progress_bar = document.getElementById("IRActionImageProgressBar");
	progress_bar.style.display = "none";
	progress_bar.innerText = "";
}
