/************************************************** 

		Control for universal UI elements

**************************************************/

/**
 * Class used to make inputs only execute a function if nothing has been typed for 1s.
 * That way functions aren't prematurely executed before user is done typing.
 * @param {function} fn_to_execute - Function to execute when input is received
 * @param {array} args_to_pass - List of arguments to give the function to execute upon input
 */
class InputDelay {
	constructor(fn_to_execute, args_to_pass) {
		this.timeout = null;
		this.args_to_pass = args_to_pass || [];
		this.fn_to_execute = fn_to_execute;
	}
	/**
	 * Start 1s timer and execute if not interrupted by more inputs
	 */
	start_timer() {
		clearTimeout(this.timeout);
		this.timeout = setTimeout(() => {
			this.execute();
		}, 1000 /* ms */);
	}
	execute() {
		this.fn_to_execute(...this.args_to_pass);
	}
}

/*****************************************************************************

							TABS

*****************************************************************************/

/****
		HTML Element Listeners
****/

document.getElementById("SeviMode").onclick = function () {
	// SEVI mode tab
	change_tab(UI.TAB.SEVI);
};
document.getElementById("IRSeviMode").onclick = function () {
	// IR SEVI mode tab
	change_tab(UI.TAB.IRSEVI);
};
document.getElementById("IRActionMode").onclick = function () {
	// IR Action mode tab
	change_tab(UI.TAB.IRACTION);
};
document.getElementById("Settings").onclick = function () {
	// Settings tab
	change_tab(UI.TAB.SETTINGS);
};

/****
		UI Event Listeners
****/

//uiEmitter.on(UI.UPDATE.TAB, change_tab);

/****
		Functions
****/

// Changing tabs
function change_tab(tab) {
	// Add functionality for tab switching
	if (tab === PageInfo.current_tab) return; // Already on that tab, no need to do anything

	// Depress the current tab and hide content
	let current_tab = document.getElementById(PageInfo.current_tab);
	let current_page = document.getElementById(PageInfo.current_tab + "Content");
	if (current_tab) current_tab.classList.remove("pressed-tab");
	if (current_page) current_page.style.display = "none";

	// Activate selected tab and show content
	let new_tab = document.getElementById(tab);
	let new_page = document.getElementById(tab + "Content");

	if (new_tab) new_tab.classList.add("pressed-tab");
	if (new_page) new_page.style.display = "grid";

	PageInfo.current_tab = tab;

	load_tab(tab);
}

// Send requests to load information to be displayed in that tab
function load_tab(tab) {
	switch (tab) {
		case UI.TAB.SEVI:
			//uiEmitter.emit(UI.LOAD.SEVI);
			load_sevi_info(); // From seviInterface.js
			break;
		case UI.TAB.IRSEVI:
			//uiEmitter.emit(UI.LOAD.IRSEVI);
			break;
		case UI.TAB.IRACTION:
			//uiEmitter.emit(UI.LOAD.IRACTION);
			break;
		case UI.TAB.SETTINGS:
			//uiEmitter.emit(UI.LOAD.SETTINGS);
			break;
	}
}

/*****************************************************************************

							PAGE INFORMATION

*****************************************************************************/

const PageInfo = {
	current_tab: UI.TAB.NONE,
};

/****
		UI Event Listeners
****/

uiEmitter.on(UI.QUERY.CURRENTTAB, () => {
	uiEmitter.emit(UI.RESPONSE.CURRENTTAB, PageInfo.current_tab);
});
