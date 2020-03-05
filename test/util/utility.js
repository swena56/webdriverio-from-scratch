/**
 * Purpose is that these methods do not depend on the browser
 */
class Utility {

	getFilesizeInBytes (filename) {
		if ( require('fs').existsSync(filename) ) {
			const stats = require('fs').statSync(filename);
			const fileSizeInBytes = stats.size;
			return fileSizeInBytes;
		}
		return 0;
	}

	percentFixed (num) {
		return parseFloat((num || 0) * 100.00).toFixed(2);
	}

	commify (num) {
		return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
	}

	formatBytes (bytes, decimals) {
		if (bytes === 0) return '0 Bytes';
		const k = 1024,
			dm = decimals <= 0 ? 0 : decimals || 2,
			sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'],
			i = Math.floor(Math.log(bytes) / Math.log(k));
		return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) } ${ sizes[i]}`;
	}

	slugify (str) {
		return str
			.trim() // remove whitespaces at the start and end of string
			.toLowerCase()
			.replace(/^-+/g, '') // remove one or more dash at the start of the string
			.replace(/[^\w-]+/g, '') // convert any on-alphanumeric character to a dash
			.replace(/-+/g, '-') // convert consecutive dashes to singuar one
			.replace(/-+$/g, ''); // remove one or more dash at the end of the string
	}

	/*
		Utility.promiseTimeout(2000, function(resolve, reject) {});
	*/
	promiseTimeout (ms, callback) {
		return new Promise(function (resolve, reject) {
			callback(resolve, reject);
			setTimeout(function () {
				reject(`Promise timed out after ${ ms } ms`);
			}, ms);
		});
	}

	getTimeStamp () {
		return (new Date()).getTime();
	}

	getImageFileName () {
		return `${browser.config.screenshotPath}/${require('uuid').v1()}.png`;
	}

	isEven (n) {
		return Number(n) === 0 || !!(Number(n) && !(Number(n) % 2));
	}

	sleep (seconds) {
		return new Promise(resolve => setTimeout(resolve, (seconds || 1) * 1000));
	}

	generateUUID (size = 20) {
		return Buffer.from(require('crypto').randomBytes(size), 'base64').toString('hex');
	}

	uniqueSort (array) {
		return array.filter((elem, pos) => {
			return array.indexOf(elem) === pos;
		}).sort() || [];
	}

	randomizeArray (array) {
		return array.sort( () => { return 0.5 - Math.random(); } );
	}

	getLinksInElement (element = 'body') {
		const url = require('url');
		const links = ( element && $(element).isExisting() ) ? $(element).$$('a').map( o => o.getAttribute('href') ) : [];
		return this.uniqueSort(links).filter( o => !( o && url.parse(o).host && url.parse(o).host.includes(browser.config.baseUrl) ) );
	}

	cleanDate () {
		return (new Date()).toString().replace(/\s/g, '-').replace(/-\(\w+\)/, '');
	}

	doesStringContainUuid (string) {
		const regex = /.*[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}.*/;
		return regex.test(string.toLowerCase());
	}

	createDirectory (dir) {
		if (!require('fs').existsSync(dir)) {
			require('fs').mkdirSync(dir);
		}
		return dir;
	}

	isValidUrl (urlString) {
		if ( !urlString ) return false;
		return !!urlString.match(
			new RegExp(
				'^(http[s]?:\\/\\/(www\\.)?|ftp:\\/\\/(www\\.)?|www\\.){1}([0-9A-Za-z-\\.@:%_\+~#=]+)+((\\.[a-zA-Z]{2,3})+)(/(.)*)?(\\?(.)*)?'
			)
		);
	}

	chunkify (array, size) {
		const chunked_arr = [];
		for (let i = 0; i < array.length; i++) {
			const last = chunked_arr[chunked_arr.length - 1];
			if (!last || last.length === size) {
				chunked_arr.push([array[i]]);
			} else {
				last.push(array[i]);
			}
		}
		return chunked_arr;
	}

	/**
	 * Takes screenshot of element and returns base64 of element
	 * return data looks like this:
	 * @param element
	 * @param imageQuality
	 */
	elementScreenShot (elem) {
		if ( elem ) {
			// TODO use screenShotPath config setting
			const filename = `./errorShots/${ this.generateUUID() }.png`;
			this.createDirectory('./errorShots');
			const element = $(elem);
			if ( element && element.isExisting() ) {
				element.scrollIntoView();
				element.waitForDisplayed();
				element.saveScreenshot(filename);
				const data = fs.readFileSync(filename);
				return browser.call(() => {
					return new Buffer(data).toString('base64');
				});
			}
		}
	}

	promiseTimeout (ms, promise) {
		const timeout = new Promise((resolve, reject) => {
			const id = setTimeout(() => {
				clearTimeout(id);
				reject(`Timed out in ${ ms }ms.`);
			}, ms);
		});
		return Promise.race([
			promise,
			timeout
		]);
	}

	testUrlStatusSync (urlString, userAgent = 'userAgent') {
		const request = require('request');
		const customRequest = request.defaults({
			headers: { 'User-Agent': userAgent }
		});
		if ( !new String(urlString).includes('https') ) {
			urlString = `${browser.config.baseUrl}${urlString}`;
		}
		return new Promise((resolve, reject) => {
			customRequest.get(urlString, (error, response, resp) => {
				if (!error && response && response.statusCode ) {
					resolve({
						href: urlString,
						status: response.statusCode,
						message: response.statusMessage,
					});
				} else {
					reject({
						href: urlString,
						status: 0,
						message: 'Request Error',
					});
				}
			});
		});
	}

	checkSizeOfElements (...elements) {
		const initialized = [];
		for (let i = 0; i < elements.length; i++) {
			$(elements[i]).assert().scrollIntoView();
			const size = $(elements[i]).getSize();
			expect( size.height > 0 && size.height > 0 ).to.equal(true, `'${elements[i]}' does not have a valid size: ${JSON.stringify(size)}`);
			initialized.push($(elements[i]));
		}
		return initialized;
	}

	convertToText (obj) {
		var string = [];

		if (typeof (obj) === 'object' && (obj.join === undefined)) {
			string.push('{');
			for (const prop in obj) {
				string.push(prop, ': ', this.convertToText(obj[prop]), ',');
			};
			string.push('}');

		} else if (typeof (obj) === 'object' && !(obj.join === undefined)) {
			string.push('[');
			for (const prop in obj) {
				string.push(this.convertToText(obj[prop]), ',');
			}
			string.push(']');

		} else if (typeof (obj) === 'function') {
			string.push(obj.toString());
		} else {
			string.push(JSON.stringify(obj));
		}

		return string.join('');
	}
}

export default new Utility();
