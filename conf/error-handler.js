const DEFAULT_SEVERITY_LEVEL = 1;

exports.config = {
	errorList: {},
	getErrorSeverity: function(){
		const id = browser.sessionId;
		let total = 0;
		if( ! id || ! this.errorList[id] ){
			throw new Error('Invalid browser session, or error list has not been created yet.');
		}
		for( let i = 0; i < this.errorList[id].length; i++ ){
			if( this.errorList[id][i]['severity'] && typeof this.errorList[id][i]['severity'] === 'number' ){
				total += this.errorList[id][i]['severity'];
			}
		}

		let level = 'none';
		if ( total >= 5 ) {
			level = 'blocker';
		} else if (total >= 4 ) {
			level = 'critical';
		} else if (total >= 3 ) {
			level = 'normal';
		} else if (total >= 2 ) {
			level = 'minor';
		} else if (total >= 1) {
			level = 'trivial';
		}

		return { total, level };
	},
	pushError: function(error){
		const id = browser.sessionId;
		const isDone = error === 'done';
		let total = 0;

		if( id ){
			if( ! this.errorList[id] ){
				this.errorList[id] = [];
			}

			if( error && error !== 'done' ){
				if( error.error.name && error.error.name === "javascript error" ){
					error.severity = 0;
				}
				this.errorList[id].push(error);
			}

			const severity = this.getErrorSeverity();

			if( error && error !== 'done' && severity.total > 0 ){
				console.log(require('chalk').red(JSON.stringify(error, null, '\t')),`total severity: ${severity.total}, ${severity.level}`);
			}

			const max = parseFloat(process.env.MAX_SEVERITY_THRESHOLD || 3.0);
			if( this.errorList[id].length && severity.total > max || isDone && severity.total > 0 ){
				const performAssertion = () => {
					const assertMessage = [
						`Detected ${this.errorList[id].length}`,
						`Error${this.errorList[id].length > 1 ? 's' : ''}, `,
						`severity is ${severity.total} (${severity.level})`,
						JSON.stringify(this.errorList[id].sort((a,b) => (a.s > b.s) ? 1 : ((b.s > a.s) ? -1 : 0)).pop())
					].join(' ');

					delete this.errorList[id];

					if( browser.capabilities && browser.capabilities.browserName && browser.capabilities.browserName === 'internet explorer' ){
						const Pending = require('./../node_modules/mocha/lib/pending.js');
						const pending = new Pending(`skipped: internet explorer tests are unstable`);
						throw pending;
					}

					return require('assert').fail(assertMessage);
				};
				performAssertion();
			}

			return severity;
		}
	},
};
