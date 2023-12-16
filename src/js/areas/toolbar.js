
// imaudio.toolbar

{
	init() {
		let el = window.find(`> div[data-area="toolbar"]`);
		// fast references
		this.els = {
			sidebar: el.find(`.toolbar-tool_[data-click="toggle-sidebar"]`),
			undo: el.find(`.toolbar-tool_[data-click="file-undo"]`),
			redo: el.find(`.toolbar-tool_[data-click="file-redo"]`),
			rewind: el.find(`.toolbar-tool_[data-click="rewind-audio"]`),
			forward: el.find(`.toolbar-tool_[data-click="forward-audio"]`),
			stop: el.find(`.toolbar-tool_[data-click="stop-audio"]`),
			play: el.find(`.toolbar-tool_[data-click="play-audio"]`),
			record: el.find(`.toolbar-tool_[data-click="record-audio"]`),
			loop: el.find(`.toolbar-tool_[data-click="loop-audio"]`),
			copy: el.find(`.toolbar-tool_[data-click="copy-selection"]`),
			paste: el.find(`.toolbar-tool_[data-click="paste-selection"]`),
			cut: el.find(`.toolbar-tool_[data-click="cut-selection"]`),
			silence: el.find(`.toolbar-tool_[data-click="silence-selection"]`),
			settings: el.find(`.toolbar-tool_[data-menu="view-settings"]`),
			// display
			currentTime: el.find(`.display .current-time`),
			totalTime: el.find(`.display .total-time`),
			hoverTime: el.find(`.display .hover-time`),
		};
		// subscribe to events
		window.on("timeupdate", this.dispatch);
		window.on("clear-range", this.dispatch);
		window.on("update-range", this.dispatch);
	},
	dispatch(event) {
		let APP = imaudio,
			Self = APP.toolbar,
			value,
			isOn,
			el;
		// console.log( event );
		switch (event.type) {
			// subscribed events
			case "timeupdate":
				value = Self.format(event.detail.ws.decodedData.duration);
				Self.els.totalTime.html(value);
				
				value = Self.format(event.detail.currentTime);
				Self.els.currentTime.html(value);
				break;
			case "clear-range":
				["copy", "cut", "silence"].map(key => Self.els[key].addClass("tool-disabled_"));
				break;
			case "update-range":
				["copy", "cut", "silence"].map(key => Self.els[key].removeClass("tool-disabled_"));
				// console.log(event);
				break;
			// custom events
			case "enable-tools":
				Self.els.sidebar.removeClass("tool-disabled_");
				Self.els.rewind.removeClass("tool-disabled_");
				Self.els.play.removeClass("tool-disabled_");
				Self.els.settings.removeClass("tool-disabled_");
				break;
			case "disable-tools":
				Object.keys(Self.els).map(key => Self.els[key].addClass("tool-disabled_"));
				break;
			case "toggle-sidebar":
				isOn = event.value || APP.els.content.hasClass("show-sidebar");
				APP.els.content.toggleClass("show-sidebar", isOn);
				return !isOn;
			case "toggle-dock":
				isOn = event.value || APP.els.content.hasClass("show-dock");
				APP.els.content.toggleClass("show-dock", isOn);
				return !isOn;

			case "rewind-audio":
				APP.data.tabs.active.file._ws.seekTo(0);
				break;
			case "reset-play-button":
				Self.els.play.find(".icon-play")
					.removeClass("icon-pause")
					.css({ "background-image": `url("~/icons/icon-play.png")` });
				// emit event
				window.emit("audio-stop");
				break;
			case "play-audio":
				el = event.el.find(".icon-play");
				isOn = el.hasClass("icon-pause");
				el.toggleClass("icon-pause", isOn);
				el.css({ "background-image": `url("~/icons/icon-${!isOn ? "pause" : "play"}.png")` });
				// call appropriate method
				APP.data.tabs.active.file._ws[isOn ? "pause" : "play"]();
				// emit event
				if (!isOn) window.emit("audio-play");
				else window.emit("audio-pause");
				break;
		}
	},
	format(time=0) {
		let ts = time >> 0,
			ms = time - ts;
		if (ts < 10) {
			if (time === 0) return '00:00:000';
			ts = `00:0${ts}`;
		} else if (ts < 60) {
			ts = `00:${ts}`;
		} else {
			let m = (ts / 60) >> 0,
				s = (ts % 60);
			ts = `${(m < 10) ? "0" : ""}${m}:${s < 10 ? `0${s}` : s}`;
		}
		if (ms < 0.1) {
			return `${ts}:0${ms < 0.01 ? "0" : ""}${(ms * 1e3) >> 0}`;
		}
		return `${ts}:${(ms * 1e3) >> 0}`;
	}
}
