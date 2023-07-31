/************************************************** 

		Control for Switching Tabs

**************************************************/

const { Tabs } = require("./Libraries/Tabs");

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
	};
	document.getElementById("IRSeviMode").onclick = function () {
		// IR SEVI mode tab
		change_tab(Tabs.IRSEVI);
	};
	document.getElementById("IRActionMode").onclick = function () {
		// IR Action mode tab
		change_tab(Tabs.IRACTION);
	};
	document.getElementById("Settings").onclick = function () {
		// Settings tab
		change_tab(Tabs.SETTINGS);
	};

	/****
			UI Event Listeners
	****/

	//uiEmitter.on(UI.UPDATE.TAB, change_tab);

	/****
			Functions
	****/

	// Send requests to load information to be displayed in that tab
	function load_tab(tab) {
		switch (tab) {
			case Tabs.SEVI:
				//uiEmitter.emit(UI.LOAD.SEVI);
				//load_sevi_info(); // From seviInterface.js
				break;
			case Tabs.IRSEVI:
				//uiEmitter.emit(UI.LOAD.IRSEVI);
				break;
			case Tabs.IRACTION:
				//uiEmitter.emit(UI.LOAD.IRACTION);
				break;
			case Tabs.SETTINGS:
				//uiEmitter.emit(UI.LOAD.SETTINGS);
				break;
		}
	}
}

// Changing tabs
function change_tab(tab) {
	// Add functionality for tab switching
	if (tab === PageInfo.current_tab) return; // Already on that tab, no need to do anything

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

	PageInfo.current_tab = tab;

	//load_tab(tab);
}

/*****************************************************************************

							PAGE INFORMATION

*****************************************************************************/

const PageInfo = {
	current_tab: Tabs.NONE,
};

module.exports = { Tab_Control, change_tab, PageInfo };
