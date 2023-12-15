
// imaudio.sidebar

{
	init() {
		// fast references
		this.els = {
			doc: $(document),
			content: window.find("content"),
			vWrapper: window.find(".volume-wrapper"),
			volume: window.find(".volume-knob"),
		};
		// default volume knob angle
		this.els.volume.css({ "--angle": "-35deg" });
		this.els.vWrapper.find(".txt-volume h2").html(47);
		// bind event handlers
		this.els.volume.on("mousedown", this.volumeMove);
	},
	dispatch(event) {
		let APP = imaudio,
			Self = APP.speaker,
			el;
		switch (event.type) {
			// custom events
			case "some-event":
				break;
		}
	},
	volumeMove(event) {
		let APP = imaudio,
			Self = APP.sidebar,
			Drag = Self.drag;
		switch (event.type) {
			case "mousedown":
				// prevent default behaviour
				event.preventDefault();
				// cover content
				Self.els.content.addClass("cover hideMouse");
				Self.els.vWrapper.addClass("show-text");
				// prepare drag info
				let el = $(event.target),
					txt = el.parent().find(".txt-volume h2"),
					ws = APP.data.tabs.active.file._ws,
					limit = {
						min: -135,
						max: 135,
					};

				// create drag object
				Self.drag = {
					el,
					ws,
					txt,
					limit,
					clickY: parseInt(el.cssProp("--angle"), 10) + event.clientY,
					min_: Math.min,
					max_: Math.max,
				};
				// bind event
				Self.els.doc.on("mousemove mouseup", Self.volumeMove);
				break;
			case "mousemove":
				let angle = Drag.min_(Drag.max_(Drag.clickY - event.clientY, Drag.limit.min), Drag.limit.max),
					val = Math.round(((angle / Drag.limit.max) + 1) * 50);
				Drag.el.css({ "--angle": `${angle}deg` });
				// update volume knob value
				Drag.txt.html(val);
				// update wavesurfer
				Drag.ws.setVolume(val/100);
				break;
			case "mouseup":
				// cover content
				Self.els.content.removeClass("cover hideMouse");
				Self.els.vWrapper.removeClass("show-text");
				// unbind event
				Self.els.doc.off("mousemove mouseup", Self.volumeMove);
				break;
		}
	}
}
