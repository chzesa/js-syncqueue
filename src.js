function newSyncQueue(config) {
	const self = {};
	const queue = [];
	const onCompleteCallbacks = [];

	var enabled = config.enabled || true;
	var executing = false;
	var cursor = 0;

	async function guard(task, param = null) {
		return new Promise(async function (res, rej) {
			try {
				await task(...param).then(res);
			}
			catch (e) {
				console.log(e);
				res();
			}
		});
	}

	async function execute() {
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