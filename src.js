function newSyncQueue(e = true) {
	const self = {};
	const queue = [];
	const onCompleteCallbacks = [];

	var executing = false;
	var enabled = e;
	var counter = 0;

	const guard = async function (task, param = null) {
		return new Promise(function (res, rej) {
			task(param).then(res(true));
		});
	}

	const execute = async function (redo = false) {
		if (!enabled || (executing && !redo)) {
			return;
		}

		executing = true;
		var cursor = 0;

		while (cursor < queue.length) {
			counter++;
			var item = queue[cursor];

			try {
				await guard(item.callback, item.param);
			}
			catch (e) {
				console.log(e);
			}

			cursor++;
		}

		queue.splice(0, cursor);

		for (var i in onCompleteCallbacks) {
			try {
				await guard(onCompleteCallbacks[i]);
			}
			catch (e) {
				console.log(e);
			}
		}

		if (queue.length > 0) {
			execute(true);
		}
		else {
			executing = false
		}
	}

	self.do = function (param, callback) {
		queue.push({
			param
			, callback
		});

		execute();
	}

	self.onComplete = function (callback) {
		onCompleteCallbacks.push(callback);
	}

	self.disable = async function (timeout = 1000) {
		enabled = false;

		async function wait(dur) {
			return new Promise(function (res) {
				setTimeout(res, dur);
			});
		}

		while (executing) {
			var startCounter = counter;
			await wait(timeout);

			if (counter == startCounter) {
				executing = false;
			}
		}
	}

	self.enable = function () {
		enabled = true;
		execute();
	}

	return self;
}