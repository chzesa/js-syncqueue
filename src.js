// Copyright (c) 2019 chzesa
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.

function newSyncQueue(config = {}) {
	const self = {};
	const queue = [];
	const onCompleteCallbacks = [];

	var enabled = config.enabled == null ? true : config.enabled;
	var executing = false;
	var cursor = 0;

	async function guard (task, param) {
		return new Promise(async function (res, rej) {
			try {
				if (param == null) {
					await task().then(res);	
				} else {
					await task(...param).then(res);
				}
			}
			catch (e) {
				console.log(e);
				res();
			}
		});
	}

	async function execute () {
		if (executing) return;
		executing = true;

		while (queue.length > 0 && enabled) {
			cursor = 0;
			while (cursor < queue.length) {
				var item = queue[cursor];
				cursor++;
				await guard(item.callback, item.param);
				item.resolve();
			}

			queue.splice(0, cursor);

			for (var i in onCompleteCallbacks) {
				await guard(onCompleteCallbacks[i]);
			}
		}

		executing = false
	}

	self.do = function (callback, ...param) {
		return new Promise(function (resolve, reject) {
			queue.push({
				param
				, callback
				, resolve
				, reject
			});

			execute();
		});
	}

	self.onComplete = function (callback) {
		onCompleteCallbacks.push(callback);
	}

	self.length = function() {
		return queue.length;
	}

	self.disable = async function (timeout = 1000) {
		enabled = false;

		async function wait (dur) {
			return new Promise(function (res) {
				setTimeout(res, dur);
			});
		}

		while (executing) {
			var startCounter = cursor;
			await wait(timeout);

			if (cursor == startCounter) {
				executing = false;
			}
		}
	}

	self.reset = function () {
		if (enabled || executing) return;
		queue.splice(0, queue.length);
		cursor = 0;
	}

	self.enable = function () {
		enabled = true;
		execute();
	}

	return self;
}