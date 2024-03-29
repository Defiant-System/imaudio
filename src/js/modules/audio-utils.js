
let AudioUtils = {
	TrimTo(val, num) {
		let nums = { "0": 1, "1": 10, "2": 100,"3": 1000,"4": 10000,"5": 100000 };
		let dec = nums[num];
		return ((val * dec) >> 0) / dec;
	},

	LoadDecoded(data, buffer, marker) {
		let numberOfChannels = buffer.numberOfChannels,
			args = {
				numberOfChannels,
				left: buffer.getChannelData(0),
				right: numberOfChannels > 1 ? buffer.getChannelData(1) : null,
				sampleRate: buffer.sampleRate,
				duration: buffer.duration,
				type: data.file.kind || data.file._file.blob.type,
			},
			kind = data.blobOnly || "wav";
		// engage worker
		imaudio.workers[kind]
			.send(args)
			.on("message", async event => {
				switch (event.type) {
					case "progress":
						// proxy event to sidebar
						if (data.sidebar) data.sidebar.dispatch({ ...event, spawn: data.spawn });
						// replace blob in view
						if (event.value >= 100) {
							// do not put result in UI - used for save
							if (!data.blobOnly) {
								// update UI
								await data.file._ws.loadBlob(event.blob);
								// what to mark when done, if any
								if (marker) {
									// clear regions
									data.file._regions.clearRegions();
									if (marker.end) {
										data.file._regions.addRegion({ ...marker, id: "region-selected" });
									} else {
										data.file._ws.skip(marker.start);
									}
								}
							}
							// run callback, if any
							if (data.callback) data.callback(event.blob);
						}
						break;
				}
			});
	},

	CreateBuffer(channels, length, sampleRate) {
		return new AudioContext().createBuffer(channels, length, sampleRate);
	},

	CreateOfflineAudioContext(channels, length, sampleRate) {
		return new OfflineAudioContext(channels, length, sampleRate);
	},

	// Effects utilities
	CreateOfflineFXContext(data) {
		let originalBuffer = data.file._ws.getDecodedData();
		let region = data.file._activeRegion;
		let start = region ? region.start : 0;
		let end = region ? region.end : originalBuffer.duration;
		let offset = this.TrimTo(start, 3);
		let duration = this.TrimTo(end - start, 3);

		// create offline audio context
		let channels = originalBuffer.numberOfChannels;
		let sampleRate = originalBuffer.sampleRate;
		let length = duration * sampleRate;
		let offlineCtx = this.CreateOfflineAudioContext(channels, length, sampleRate);

		return offlineCtx;
	},

	ApplyFilter(data) {
		// offline render source
		data.offlineCtx.startRendering();

		data.offlineCtx.oncomplete = event => {
			let renderedBuffer = event.renderedBuffer;
			let originalBuffer = data.file._ws.getDecodedData();
			let channels = originalBuffer.numberOfChannels;
			let sampleRate = originalBuffer.sampleRate;
			let length = originalBuffer.length;
			
			let region = data.file._activeRegion;
			let start = region ? region.start : 0;
			let end = region ? region.end : originalBuffer.duration;
			let newSegment = this.CreateBuffer(channels, length, sampleRate);

			let offset = (this.TrimTo(start, 3) * sampleRate) >> 0;
			let duration = (this.TrimTo(end - start, 3) * sampleRate) >> 0;
			let durOffset = offset + duration;
			
			for (let i=0; i<channels; ++i) {
				let chanData = originalBuffer.getChannelData(i);
				let fxChanData = renderedBuffer.getChannelData(i);
				let uberChanData = newSegment.getChannelData(i);

				uberChanData.set(chanData.slice(0, offset));
				uberChanData.set(fxChanData, offset);
				uberChanData.set(chanData.slice(durOffset, length), durOffset);
			}

			this.LoadDecoded(data, newSegment);
		};
	},

	CopyBufferSegment(data) {
		let originalBuffer = data.file._ws.getDecodedData();
		let region = data.file._activeRegion;
		let start = region ? region.start : 0;
		let end = region ? region.end : originalBuffer.duration;

		let offset = this.TrimTo(start, 3);
		let duration = this.TrimTo(end - start, 3);
		let newLen    = (duration * originalBuffer.sampleRate) >> 0;
		let newOffset = (offset   * originalBuffer.sampleRate) >> 0;

		let channels = originalBuffer.numberOfChannels;
		let sampleRate = originalBuffer.sampleRate;
		let length = duration * sampleRate;
		let copySegment = this.CreateBuffer(channels, length, sampleRate);

		for (let i=0; i<channels; ++i) {
			let chanData = originalBuffer.getChannelData(i);
			let copyChanData = copySegment.getChannelData(i);
			copyChanData.set(chanData.slice(newOffset, newLen + newOffset));
		}

		return copySegment;
	},

	Crop(data) {
		let originalBuffer = data.file._ws.getDecodedData();
		let channels = originalBuffer.numberOfChannels;
		let sampleRate = originalBuffer.sampleRate;

		let region = data.file._activeRegion;
		let start = region ? region.start : data.file._ws.getCurrentTime();
		let end = region ? region.end : originalBuffer.duration;
		let offset = this.TrimTo(start, 3);
		let duration = this.TrimTo(end - start, 3);
		let rateOffset = (offset   * sampleRate) >> 0;
		let rateLength = (duration * sampleRate) >> 0;
		let newSegment = this.CreateBuffer(channels, rateLength, sampleRate);

		for (let i=0; i<channels; ++i) {
			let chanData = originalBuffer.getChannelData(i);
			let uberChanData = newSegment.getChannelData(i);

			uberChanData.set(chanData.slice(rateOffset, rateOffset + rateLength));
		}

		// show new waveform
		let marker = { start: 0, end: null };
		this.LoadDecoded(data, newSegment, marker);
	},

	Fade(data) {
		let fade = data.out ? { start: 1, end: 0 } : { start: 0, end: 1 };
		let originalBuffer = data.file._ws.getDecodedData();
		let channels = originalBuffer.numberOfChannels;
		let sampleRate = originalBuffer.sampleRate;

		let region = data.file._activeRegion;
		let start = region ? region.start : data.file._ws.getCurrentTime();
		let end = region ? region.end : originalBuffer.duration;
		let offset = this.TrimTo(start, 3);
		let duration = this.TrimTo(end, 3);
		let rateOffset = (offset   * sampleRate) >> 0;
		let rateLength = (duration * sampleRate) >> 0;

		let copy = this.CopyBufferSegment(data);
		let offlineCtx = this.CreateOfflineAudioContext(channels, copy.length, sampleRate);
		let source = offlineCtx.createBufferSource();
		source.buffer = copy;
		
		let gain = offlineCtx.createGain();
		gain.gain.setValueAtTime(fade.start, offlineCtx.currentTime);
		gain.gain.linearRampToValueAtTime(fade.end, offlineCtx.currentTime + duration);
		gain.connect(offlineCtx.destination);
		source.connect(gain);
		source.start();
		offlineCtx.startRendering();

		offlineCtx.oncomplete = event => {
			let renderedBuffer = event.renderedBuffer;
			let newSegment = this.CreateBuffer(channels, originalBuffer.length, sampleRate);
			
			for (let i=0; i<channels; ++i) {
				let chanData = originalBuffer.getChannelData(i);
				let uberChanData = newSegment.getChannelData(i);
				let fxChanData = renderedBuffer.getChannelData(i);

				uberChanData.set(chanData);
				uberChanData.set(fxChanData, rateOffset, fxChanData.length - rateOffset);
			}

			// show new waveform
			this.LoadDecoded(data, newSegment);
		};
	},

	Flip(data) {
		let originalBuffer = data.file._ws.getDecodedData();
		let channels = originalBuffer.numberOfChannels;
		let sampleRate = originalBuffer.sampleRate;
		let length = originalBuffer.length;
		let newSegment = this.CreateBuffer(channels, length, sampleRate);

		let newChan0 = newSegment.getChannelData(0);
		let newChan1 = newSegment.getChannelData(1);
		// flip data
		newChan0.set(originalBuffer.getChannelData(1));
		newChan1.set(originalBuffer.getChannelData(0));

		this.LoadDecoded(data, newSegment);
	},

	MakeMono(data, from) {
		let originalBuffer = data.file._ws.getDecodedData();
		let sampleRate = originalBuffer.sampleRate;
		let length = originalBuffer.length;
		let monoSegment = this.CreateBuffer(1, length, sampleRate);
		// transfer channel to mono segment
		monoSegment.getChannelData(0).set(originalBuffer.getChannelData(from));
		
		this.LoadDecoded(data, monoSegment);
	},

	InsertSegmentToBuffer(data) {
		let originalBuffer = data.file._ws.getDecodedData();
		let sampleRate = originalBuffer.sampleRate;
		let channels = originalBuffer.numberOfChannels;
		let length = originalBuffer.length;

		let region = data.file._activeRegion;
		let offset = region ? region.start : data.file._ws.getCurrentTime();
		let duration = region ? region.end - region.start : 0;
		let newOffset = (this.TrimTo(offset, 3) * sampleRate) >> 0;
		let newDuration = (this.TrimTo(duration, 3) * sampleRate) >> 0;

		let pasteSegment = data.segment;
		let newLength = length - newDuration + pasteSegment.length;
		let newSegment = this.CreateBuffer(channels, newLength, sampleRate);
		
		for (let i=0; i<channels; ++i) {
			let chanData = originalBuffer.getChannelData(i);
			let uberChanData = newSegment.getChannelData(i);
			let pasteChanData = pasteSegment.getChannelData(i);
			let durOffset = newOffset + newDuration;

			uberChanData.set(chanData.slice(0, newOffset));
			uberChanData.set(pasteChanData, newOffset);
			uberChanData.set(chanData.slice(durOffset, length), newOffset + pasteSegment.length);
		}

		let marker = { start: offset, end: offset + pasteSegment.duration };
		this.LoadDecoded(data, newSegment, marker);
	},

	Invert(data) {
		let originalBuffer = data.file._ws.getDecodedData();
		let channels = originalBuffer.numberOfChannels;
		let sampleRate = originalBuffer.sampleRate;

		let region = data.file._activeRegion;
		let start = region ? region.start : data.file._ws.getCurrentTime();
		let end = region ? region.end : originalBuffer.duration;
		let offset = this.TrimTo(start, 3);
		let duration = this.TrimTo(end, 3);
		let rateOffset = (offset   * sampleRate) >> 0;
		let rateLength = (duration * sampleRate) >> 0;
		let newSegment = this.CreateBuffer(channels, originalBuffer.length, sampleRate);

		for (let i=0; i<channels; ++i) {
			let chanData = originalBuffer.getChannelData(i);
			let uberChanData = newSegment.getChannelData(i);

			uberChanData.set(chanData.slice(0, rateOffset));
			uberChanData.set(chanData.slice(rateOffset, rateOffset + rateLength).map(i => i * -1), rateOffset);
			uberChanData.set(chanData.slice(rateLength), rateLength);
		}

		// show new waveform
		this.LoadDecoded(data, newSegment);
	},

	MakeSilenceBuffer(data) {
		let originalBuffer = data.file._ws.getDecodedData();
		let channels = originalBuffer.numberOfChannels;
		let sampleRate = originalBuffer.sampleRate;
		let length = data.duration * sampleRate;
		let emptySegment = this.CreateBuffer(channels, length, sampleRate);
		return emptySegment;
	},

	InsertSilence(data) {
		let originalBuffer = data.file._ws.getDecodedData();
		let channels = originalBuffer.numberOfChannels;
		let sampleRate = originalBuffer.sampleRate;
		let durLength = data.duration * sampleRate;
		let length = originalBuffer.length + durLength;
		let newSegment = this.CreateBuffer(channels, length, sampleRate);
		let silentSegment = this.MakeSilenceBuffer(data);

		let region = data.file._activeRegion;
		let start = region ? region.start : data.file._ws.getCurrentTime();
		let startRate = start * sampleRate;

		for (let i=0; i<channels; ++i) {
			let chanData = originalBuffer.getChannelData(i);
			let uberChanData = newSegment.getChannelData(i);
			let durOffset = startRate + durLength;

			uberChanData.set(chanData.slice(0, startRate));
			uberChanData.set(silentSegment, startRate);
			uberChanData.set(chanData.slice(startRate, length), durOffset);
		}

		this.LoadDecoded(data, newSegment, { start });
	},

	OverwriteBufferWithSilence(data) {
		let region = data.file._activeRegion;
		let offset = this.TrimTo(region.start, 3);
		let duration = this.TrimTo(region.end - region.start, 3);

		let originalBuffer = data.file._ws.getDecodedData();
		let channels = originalBuffer.numberOfChannels;
		let length = originalBuffer.length;
		let sampleRate = originalBuffer.sampleRate;

		let newSegment = this.CreateBuffer(channels, length, sampleRate);
		let silentSegment = this.MakeSilenceBuffer({ ...data, duration });

		offset = (offset * sampleRate) >> 0;
		duration = (duration * sampleRate) >> 0;

		for (let i=0; i<channels; ++i) {
			let chanData = originalBuffer.getChannelData(i);
			let uberChanData = newSegment.getChannelData(i);
			let durOffset = offset + duration;

			uberChanData.set(chanData.slice(0, offset));
			uberChanData.set(silentSegment, offset);
			uberChanData.set(chanData.slice(durOffset, length), durOffset);
		}

		this.LoadDecoded(data, newSegment);
	},

	Reverse(data) {
		let originalBuffer = data.file._ws.getDecodedData();
		let channels = originalBuffer.numberOfChannels;
		let sampleRate = originalBuffer.sampleRate;

		let region = data.file._activeRegion;
		let start = region ? region.start : data.file._ws.getCurrentTime();
		let end = region ? region.end : originalBuffer.duration;
		let offset = this.TrimTo(start, 3);
		let duration = this.TrimTo(end, 3);
		let rateOffset = (offset   * sampleRate) >> 0;
		let rateLength = (duration * sampleRate) >> 0;
		let newSegment = this.CreateBuffer(channels, originalBuffer.length, sampleRate);

		for (let i=0; i<channels; ++i) {
			let chanData = originalBuffer.getChannelData(i);
			let uberChanData = newSegment.getChannelData(i);

			uberChanData.set(chanData.slice(0, rateOffset));
			uberChanData.set(chanData.slice(rateOffset, rateLength).reverse(), rateOffset);
			uberChanData.set(chanData.slice(rateLength), rateLength);
		}

		// show new waveform
		this.LoadDecoded(data, newSegment);
	},

	TrimSilence(data) {
		let edgesOnly = data.edgesOnly ?? true;
		let originalBuffer = data.file._ws.getDecodedData();
		let channels = originalBuffer.numberOfChannels;
		let sampleRate = originalBuffer.sampleRate;
		let region = data.file._activeRegion;

		let offset = region ? region.start : 0;
		let duration = region ? region.end - region.start : originalBuffer.duration;
		let marker = { start: offset, end: region ? region.end : null };
		offset = this.TrimTo(offset, 3);
		duration = this.TrimTo(duration, 3);

		let channel = originalBuffer.getChannelData(0),
			silArr = [],
			silOffset = 210,
			volOffset = 56,
			count = 0,
			invCount = 0,
			jump = 500,
			found = false,
			start = 0,
			end = 0,
			jl = channel.length,
			j = 0;
		for (; j<jl; ++j) {
			if (Math.abs (channel[j]) < 0.000368) {
				if (count === 0) {
					start = j > jump ? j - jump : j;
				}
				if (++count > silOffset) {
					invCount = 0;
					end = j;
					found = true;
				}
			} else {
				if (found) {
					if (++invCount > volOffset) {
						silArr.push([start, end]);
						j += jump;
						count = 0;
						start = 0;
						end =   0;
						found = false;
						invCount = 0;
					} else {
						end = j;
					}
				} else {
					count = 0;
					start = 0;
					end =   0;
					found = false;
					invCount = 0;
				}
			}
		}
		if (found) silArr.push([start, end]);

		if (silArr.length) {
			if (edgesOnly) {
				// trim from start & end of range
				let newArr = [];
				let check = silArr[0];
				if (check[0] === 0) {
					let startSilence = check[1] / sampleRate;
					marker.start -= startSilence;
					if (marker.end) marker.end -= startSilence;
					// add entry to new array
					newArr.push(check);
				}
				check = silArr[silArr.length-1];
				if (jl - check[1] < 8) newArr.push(check);
				// trim only edges
				silArr = newArr;
			}
			let reduce = silArr.reduce((acc, curr) => acc + (curr[1] - curr[0]), 0);
			let newLength = originalBuffer.length - reduce;
			let newSegment = this.CreateBuffer(channels, newLength, sampleRate);

			for (let i=0; i<channels; ++i) {
				let channel = originalBuffer.getChannelData(i);
				let newChannel = newSegment.getChannelData(i);
				let silOffset = 0;
				let o = 0;
				let h = 0;
				let silCurr = silArr[o];
				let silCurrStart = silCurr[0];
				let silCurrEnd = silCurr[1];

				for (let j=0; j<newLength; ++j) {
					h = j + silOffset;
					if (h > silCurrStart && h < silCurrEnd) {
						if (h < silCurrStart + jump) {
							let perc = (jump - (h - silCurrStart)) / jump;
							newChannel[j] = channel[h] * perc;
							newChannel[j] += (1 - perc) * channel[j + (silOffset + (silCurrEnd - silCurrStart))];
							continue;
						} else {
							silOffset = silOffset + silCurrEnd - silCurrStart;
							silCurr = silArr[++o];
							if (silCurr) {
								silCurrStart = silCurr[0];
								silCurrEnd = silCurr[1];
							}
							h = j + silOffset;
						}
					}
					newChannel[j] = channel[h];
				}
			}
			// show new waveform
			this.LoadDecoded(data, newSegment, marker);
		}
	},

	TrimBuffer(data) {
		let originalBuffer = data.file._ws.getDecodedData();
		let channels = originalBuffer.numberOfChannels;
		let sampleRate = originalBuffer.sampleRate;

		let region = data.file._activeRegion;
		let offset = region.start;
		let duration = region.end - region.start;
		let newLen    = (duration * sampleRate) >> 0;
		let newOffset = (offset   * sampleRate) >> 0;

		let length = originalBuffer.length - newLen;
		let newSegment = this.CreateBuffer(channels, length, sampleRate);

		for (let i=0; i<channels; ++i) {
			let chanData = originalBuffer.getChannelData(i);
			let uberChanData = newSegment.getChannelData(i);

			uberChanData.set(chanData.slice(0, newOffset));
			uberChanData.set(chanData.slice(newOffset + newLen), newOffset);
		}

		// show new waveform
		this.LoadDecoded(data, newSegment);
	},
};
