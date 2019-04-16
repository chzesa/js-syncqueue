function newSyncQueue(e = true) {
	const self = {};
	const queue = [];
	const onCompleteCallbacks = [];

	var executing = false;
	var enabled = e;
	var cursor = 0;

	const guard = async function (task, param = null) {
		return new Promise(async function (res, rej) {
			try {
				await task(param).then(res);
			}
			catch (e) {
				console.log(e);
				res();
			}
		});
	}

	const execute = async function (redo = false) {
		if (!enabled || (executing && !redo)) {
			return;
		}

		executing = true;
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

		if (queue.length > 0) {
			execute(true);
		}
		else {
			executing = false
		}
	}

	self.do = function (param, callback) {
		return new Promise(function(resolve, reject) {
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

	self.disable = async function (timeout = 1000) {
		enabled = false;

		async function wait(dur) {
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

	self.enable = function () {
		enabled = true;
		execute();
	}

	return self;
}