/************************************************** 

		Control for Switching Tabs

**************************************************/

const { Tabs } = require("./Libraries/Tabs");

const { Sevi_Load_Tab } = require("./seviInterface.js");
const { IRSevi_Load_Tab } = require("./irseviInterface.js");
const { IRAction_Load_Tab } = require("./iractionInterface.js");

/*****************************************************************************

							TABS

*****************************************************************************/

function Tab_Control() {
	/****
			HTML Element Listeners
	****/

	document.getElementById("SeviMode").onclick = function () {
		// SEVI mode tab
		change_tab(Tabs.SEVI);
		Sevi_Load_Tab();
	};
	document.getElementById("IRSeviMode").onclick = function () {
		// IR SEVI mode tab
		change_tab(Tabs.IRSEVI);
		IRSevi_Load_Tab();
	};
	document.getElementById("IRActionMode").onclick = function () {
		// IR Action mode tab
		change_tab(Tabs.IRACTION);
		IRAction_Load_Tab();
	};
	document.getElementById("Settings").onclick = function () {
		// Settings tab
		change_tab(Tabs.SETTINGS);
	};
}

/** Change the tab
 * @param {Tabs} tab
 */
function change_tab(tab) {
	// Add functionality for tab switching

	// Depress the current tab and hide content
	let current_tab = document.getElementById(PageInfo.current_tab.tab);
	let current_page = document.getElementById(PageInfo.current_tab.content);
	if (current_tab) current_tab.classList.remove("pressed-tab");
	if (current_page) current_page.style.display = "none";

	// Activate selected tab and show content
	let new_tab = document.getElementById(tab.tab);
	let new_page = document.getElementById(tab.content);
	if (new_tab) new_tab.classList.add("pressed-tab");
	if (new_page) new_page.style.display = "grid";

	// Make sure it's on the first page
	let new_tab_first_page = document.getElementById(tab.first_page);
	let new_tab_second_page = document.getElementById(tab.second_page);
	if (new_tab_second_page) new_tab_second_page.style.display = "none";
	if (new_tab_first_page) new_tab_first_page.style.display = "grid";

	PageInfo.current_tab = tab;

	// Also hide large accumulated image display
	hide_large_display();
}

/*****************************************************************************

					LARGE ACCUMULATED IMAGE DISPLAY

*****************************************************************************/

function Large_Display_Control() {
	document.getElementById("LargeDisplayClose").onclick = function () {
		hide_large_display();
	};

	document.getElementById("LargeDisplaySection").onclick = function () {
		hide_large_display();
	};
}

function hide_large_display() {
	const large_display = document.getElementById("LargeDisplaySection");
	large_display.classList.add("large-display-hidden");
}

/*****************************************************************************

							PAGE INFORMATION

*****************************************************************************/

const PageInfo = {
	current_tab: Tabs.NONE,
};

module.exports = { Tab_Control, Large_Display_Control, change_tab, PageInfo };
