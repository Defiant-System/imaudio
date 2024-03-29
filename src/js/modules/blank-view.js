
// imaudio.blankView

{
	init(Spawn) {
		// fast references
		Spawn.data.blankView = {
			els: {
				content: Spawn.find("content"),
				el: Spawn.find(".blank-view"),
			}
		};

		// get settings, if any
		let xList = $.xmlFromString(`<Recents/>`);
		let xSamples = window.bluePrint.selectSingleNode(`//Samples`);
		this.xRecent = window.settings.getItem("recents") || xList.documentElement;

		Promise.all(this.xRecent.selectNodes("./*").map(async xItem => {
				let filepath = xItem.getAttribute("filepath"),
					check = await karaqu.shell(`fs -f '${filepath}'`);
				if (!check.result) {
					xItem.parentNode.removeChild(xItem)
				}
			}))
			.then(() => {
				// add recent files in to data-section
				xSamples.parentNode.append(this.xRecent);

				// render blank view
				window.render({
					template: "blank-view",
					match: `//Data`,
					target: Spawn.data.blankView.els.el
				});
			});
	},
	dispatch(event) {
		let APP = imaudio,
			Spawn = event.spawn,
			Self = APP.blankView,
			file,
			name,
			value,
			el;
		// console.log(event);
		switch (event.type) {
			case "open-filesystem":
				APP.spawn.dispatch({ ...event, type: "open-file" });
				break;
			case "from-clipboard":
				console.log("TODO");
				break;
			case "select-sample":
				el = $(event.target);
				if (!el.hasClass("sample")) return;
				// close "current tab"
				APP.spawn.dispatch({ type: "close-tab", spawn: Spawn, delayed: true });
				// send event to APP for proxy down to spawn
				name = el.find("h4").html();
				if (el.data("path")) {
					APP.dispatch({ ...event, type: "open-url", url: [`${el.data("path")}/${name}`] });
				} else {
					APP.dispatch({ ...event, type: "load-samples", samples: [name] });
				}
				break;
		}
	}
}