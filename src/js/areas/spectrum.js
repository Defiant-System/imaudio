
// audiomass.spectrum

{
	init() {

	},
	dispatch(event) {
		let APP = audiomass,
			Self = APP.spectrum,
			isOn,
			el;
		switch (event.type) {
			// custom events
			case "toggle-analyser":
				isOn = event.el.parent().hasClass("on");
				event.el.parent().toggleClass("on", isOn);
				break;
		}
	}
}