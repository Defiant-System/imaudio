
let Test = {
	init(APP, spawn) {

		// setTimeout(() => spawn.data.toolbar.els.play.trigger("click"), 400);
		// setTimeout(() => spawn.data.toolbar.els.play.trigger("click"), 1000);

		// setTimeout(() => $(".def-desktop_").trigger("mousedown").trigger("mouseup"), 400);
		// return setTimeout(() => spawn.data.tabs.active.file._ws.skip(3), 800);

		// setTimeout(() => APP.dispatch({ type: "close-file", spawn }), 300);
		// setTimeout(() => APP.dispatch({ type: "tab.new", spawn }), 500);
		// setTimeout(() => APP.dispatch({ type: "close-tab", spawn }), 500);
		return;

		/*
		return setTimeout(() => {
			let file = spawn.data.tabs.active.file;
			file._ws.skip(1.5);

			setTimeout(() => APP.dispatch({ type: "insert-silence", duration: 2, spawn }), 100);

			// let arg = "dlgSilence";
			// setTimeout(() => APP.dispatch({ type: "open-dialog", arg, spawn }), 200);
			// setTimeout(() => Dialogs._active.find(`.button[data-click="dlg-apply"]`).trigger("click"), 300);
		}, 550);
		*/

		return setTimeout(() => {
			let file = spawn.data.tabs.active.file;
			// file._ws.skip(1.5);
			// file._ws.zoom(200);
			// file._ws.setVolume(.1);

			file._regions.addRegion({
				id: "region-selected",
				start: 1.075,
				end: 1.725,
			});


			// setTimeout(() => spawn.find(`.toolbar-tool_[data-click="cut-selection"]`).trigger("click"), 300);
			// setTimeout(() => spawn.find(`.toolbar-tool_[data-click="copy-selection"]`).trigger("click"), 100);
			setTimeout(() => spawn.find(`.toolbar-tool_[data-click="silence-selection"]`).trigger("click"), 600);
			setTimeout(() => file.dispatch({ type: "ws-region-collapse-start" }), 900);
			// setTimeout(() => APP.dispatch({ type: "remove-silence", spawn }), 1000);
			setTimeout(() => APP.dispatch({ type: "trim-start-end", spawn }), 1000);
			return;


			let name = "dlgSilence";
			setTimeout(() => APP.dispatch({ type: "open-dialog", arg: name, spawn }), 200);
			// setTimeout(() => {
			// 	let dEl = spawn.find(`.dialog-box[data-dlg="${name}"]`);
			// 	UI.renderPreset({ name, dEl, id: 1 });
			// }, 800);

			// setTimeout(() => spawn.find(`.dialog-box[data-dlg="${name}"] .button[data-click="dlg-reset"]`).trigger("click"), 250);

		}, 550);

		// return setTimeout(() => APP.dispatch({ type: "tab.new", spawn }), 500);
		// return setTimeout(() => {
		// 	spawn.find(".sample:nth(1)").trigger("click");

		// }, 500);

		return setTimeout(() => {
			let focusedId = $(`.antwin-focused_`).data("sId");
			if (spawn._sId === focusedId) {
				if (Object.keys(spawn.data.tabs._stack).length) {
					APP.spawn.dispatch({ type: "merge-all-windows", spawn });

					// console.log( "master", spawn._sId );

					// setTimeout(() => spawn.find(".tabbar-next-active_").trigger("click"), 1000);
				}
			}
		}, 1000);
		
	}
};
