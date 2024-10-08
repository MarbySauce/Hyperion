class Tabs {
	/** SEVI tab (IR off) */
	static SEVI = new Tabs("SeviMode");
	/** IR-SEVI tab (IR On) */
	static IRSEVI = new Tabs("IRSeviMode");
	/** IR Action tab */
	static IRACTION = new Tabs("IRActionMode");
	/** Settings tab */
	static SETTINGS = new Tabs("Settings");
	/** Unlisted tab */
	static NONE = new Tabs("NONE");

	constructor(tab) {
		this.tab = tab;
		this.content = tab + "Content";
		this.first_page = tab + "FirstPage";
		this.second_page = tab + "SecondPage";
	}
}

module.exports = { Tabs };
