// 上传任务队列
const uploadQueue = (() => {
	const queue = [];

	// 是否正在上传
	let isUploading = false;

	return {
		// 添加上传任务
		add(tasks) {
			queue.push.apply(queue, tasks);
		},

		// 查找任务
		// 任务队列是有序（任务id自增）的，用二分查找
		find(taskId) {
			let min = 0, max = uploadQueue.length - 1, mid;

			while (min <= max) {
				mid = parseInt((min + max) / 2);
				if (uploadQueue[mid].id == taskId) {
					return mid;
				} else if (uploadQueue[mid].id > taskId) {
					max = mid - 1;
				} else {
					min = mid + 1;
				}
			}

			return -1;
		},

		// 移除（放弃）任务
		remove(taskId, doAbort) {
			const i = this.find(taskId);
			if (i !== -1) {
				const task = uploadQueue.splice(i, 1)[0];
				// 放弃任务
				if (doAbort) {
					if (task.wxTask) {
						task.wxTask.abort();
					}
					if (task.onAbort) {
						task.onAbort({ taskId });
					}
				}
			}
		},

		// 完成任务
		_complete(beforeNext) {
			isUploading = false;
			const task = queue.shift();
			try {
				beforeNext(task);
			} finally {
				this.execNext();
			}
		},

		// 执行下一个任务
		execNext() {
			if (isUploading || !queue.length) { return; }
			isUploading = true;

			// 串行执行，总是执行第一个任务（上一个任务完成后会出列）
			const task = queue[0];

			return (new Promise((resolve) => {
				// 上传前执行的步骤（如使用云存储时需要先获取token）
				resolve(task.beforeUpload ? task.beforeUpload() : null);
			})).then((data) => {
				return new Promise((resolve, reject) => {
					task.wxTask = task.upload(task.path, data, resolve, reject);
					// 上传进度监听
					if (task.onProgress) {
						task.wxTask.onProgressUpdate((e) => {
							task.onProgress({
								progress: e.progress,
								taskId: task.id
							});
						});
					}
				});

			// 上传完成（无论成功还是失败）后，任务出列，执行对应回调，并继续下一个任务
			}).then((url) => {
				this._complete((task) => {
					if (task.onSuccess) {
						task.onSuccess({
							url,
							taskId: task.id
						});
					}
				});
			}).catch((e) => {
				this._complete((task) => {
					if (task.onFail) {
						task.onFail({
							message: e.message,
							taskId: task.id
						});
					}
				});
			});
		}
	};
})();


// 任务id（自增）
let taskAutoId = 0;

/**
 * 添加待上传文件
 * @method addFiles
 * @param {String|Array<String>} filePaths 待上传文件路径（小程序的临时路径）
 * @param {Function(path, data, resolve, reject)} upload 上传方法，必须返回UploadTask
 * @param {Object} options 选项
 *   @param {Function} [options.beforeUpload] 上传前执行的函数，必须返回Promise
 *   @param {Function} [options.onProgress] 上传进度变化时的回调
 *   @param {Function} [options.onSuccess] 上传完成时的回调
 *   @param {Function} [options.onAbort] 取消上传时的回调
 *   @param {Function} [options.onFail] 上传出错时的回调
 * @return {Array<Number>} 包含上传任务id的数组
 */
export function addFiles(filePaths, upload, options) {
	options = options || {};
	const taskIds = [];

	uploadQueue.add(
		filePaths.map((path) => {
			const id = ++taskAutoId;
			taskIds.push(id);
			return Object.assign({
				id,
				path,
				upload
			}, options);
		})
	);
	setTimeout(() => {
		uploadQueue.execNext();
	}, 0);

	return taskIds;
}


/**
 * 取消上传任务
 * @method abort
 * @param {Number} taskId 任务id
 */
export function abort(taskId) {
	uploadQueue.remove(taskId, true);
}