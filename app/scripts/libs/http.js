import { ajax } from 'rxjs/ajax';
import { of, Subject } from 'rxjs';
import { catchError, retry, map, mapTo } from 'rxjs/operators';

const setRequestHeaders = (body, headers) => {
	let defaultOptions = {
		'Access-Control-Allow-Methods': 'POST, GET, DELETE, PUT',
		'Access-Control-Allow-Origin': '*',
	};
	if (!(body instanceof FormData)) {
		defaultOptions['Content-Type'] = 'application/json';
	}
	return Object.assign(defaultOptions, headers);
};

const doRequest = (method, url, options = { headers, body }) => {
	const { headers, body, callbacks } = options;
	const progress$ = new Subject();
	const baseCallbacks = {
		...{
			onProgress: (data, progressCount) => {},
			onComplete: (complete) => {},
			onError: (error) => {},
		},
		...callbacks,
	};
	const request$ = ajax({
		url: url,
		method: method,
		headers: setRequestHeaders(body, headers),
		body: body,
		crossDomain: true,
		progressSubscriber: progress$.pipe(mapTo(request$)).subscribe({
			next: (data) => {
				let upload_progress;
				if (data.type === 'progress') {
					//Detect if it is response of Progress ( not XHR complete response )
					upload_progress = Math.floor(
						(data.loaded / data.total) * 100,
					);
				}
				baseCallbacks.onProgress(data, upload_progress);
			},
			complete: (complete) => {
				baseCallbacks.onComplete(complete);
				progress$.unsubscribe();
			},
			error: baseCallbacks.onError,
		}),
	});
	return request$.pipe(
		map((response) => response.response),
		retry(1),
		catchError((err) => {
			return of({ ...err.response, isError: true });
		}),
	);
};

export default window.$http = {
	/**
	 * @returns {Observable}
	 * @param {string} method - The name of request method.
	 * @param {string} url - The url of request to communicate with backend
	 * @param {Object} options - It will include request's body, request's header configs and request's callbacks.
	 * @param {Object} options.headers - Content-Type: 'application/x-www-form-urlencoded', 'application/json'
	 * @param {Object} options.body - data is depend on you
	 * @param {Object} options.callbacks - The callbacks of request
	 * @param {Function} options.callbacks.onProgress - This callback will receive 1 argument: (data) => {}, it will NOT be fired if use in GET method.
	 * @param {Function} options.callbacks.onError - This callback will receive 1 argument: (err) => {}
	 * @param {Function} options.callbacks.onComplete - This callback will receive 1 argument: (completet) => {}, The argument "complete" is undefined
	 */
	request(method, url, options = {}) {
		return doRequest(method, url, options);
	},

	/**
	 * @returns {Observable}
	 * @param {string} method - The name of request method.
	 * @param {string} url - The url of request to communicate with backend
	 * @param {Object} options - It will include request's body, request's header configs and request's callbacks.
	 * @param {Object} options.headers - Content-Type: 'application/x-www-form-urlencoded', 'application/json'
	 * @param {Object} options.callbacks - The callbacks of request
	 * @param {Function} options.callbacks.onError - This callback will receive 1 argument: (err) => {}
	 * @param {Function} options.callbacks.onComplete - This callback will receive 1 argument: (completet) => {}, The argument "complete" is undefined
	 */
	get(url, options = {}) {
		return doRequest('get', url, options);
	},

	/**
	 * @returns {Observable}
	 * @param {string} method - The name of request method.
	 * @param {string} url - The url of request to communicate with backend
	 * @param {Object} options - It will include request's body, request's header configs and request's callbacks.
	 * @param {Object} options.headers - Content-Type: 'application/x-www-form-urlencoded', 'application/json'
	 * @param {Object} options.body - data is depend on you
	 * @param {Object} options.callbacks - The callbacks of request
	 * @param {Function} options.callbacks.onProgress - This callback will receive 1 argument: (data) => {}, it will NOT be fired if use in GET method.
	 * @param {Function} options.callbacks.onError - This callback will receive 1 argument: (err) => {}
	 * @param {Function} options.callbacks.onComplete - This callback will receive 1 argument: (completet) => {}, The argument "complete" is undefined
	 */
	post(url, options = {}) {
		return doRequest('post', url, options);
	},

	/**
	 * @returns {Observable}
	 * @param {string} method - The name of request method.
	 * @param {string} url - The url of request to communicate with backend
	 * @param {Object} options - It will include request's body, request's header configs and request's callbacks.
	 * @param {Object} options.headers - Content-Type: 'application/x-www-form-urlencoded', 'application/json'
	 * @param {Object} options.body - data is depend on you
	 * @param {Object} options.callbacks - The callbacks of request
	 * @param {Function} options.callbacks.onProgress - This callback will receive 1 argument: (data) => {}, it will NOT be fired if use in GET method.
	 * @param {Function} options.callbacks.onError - This callback will receive 1 argument: (err) => {}
	 * @param {Function} options.callbacks.onComplete - This callback will receive 1 argument: (completet) => {}, The argument "complete" is undefined
	 */
	put(url, options = {}) {
		return doRequest('put', url, options);
	},
};
