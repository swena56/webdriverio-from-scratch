import VisualRegression from '../util/visual-regression-helper';

const allureReporter = require('@wdio/allure-reporter').default;

import Utility from './../util/utility';

const DEFAULT_SEVERITY_LEVEL = 1;

/**
 * Rules of Error Handler
 * 1) All Errors Shown at the end
 * 	Visual Errors always show at end
 * 2)
 */
export default class StepHandler {

	constructor () {
		this.reset();
	}

	reset (force = false) {
		if ( force ) {
			browser.config.errorList = [];
		}
		this.stepErrorList = [];
		this.steps = [];
	}

	startStep ( description ) {
		allureReporter.startStep(description);
		this.steps.push(description);
		this.stepErrorList = [];
		return this;
	}

	endStep ( status ) {
		if ( status === undefined ) {
			status = this.stepErrorList.length === 0;
		}
		this.steps.pop();
		allureReporter.endStep( status ? 'passed' : 'failed' );
		return this;
	}

	existenceStep (element, message, severityLevel, isClickable = false ) {
		if ( typeof severityLevel !== 'number' ) severityLevel = DEFAULT_SEVERITY_LEVEL;
		return this.addStep(`existence: ${element.selector || '< undefined element >'}`, function () {
			if ( !element || !element.selector ) {
				throw new Error('undefined element, programmer error');
			}
			element.waitForExist(15000, false, `${element.selector} does not exist, ${message}`);
			element.scrollIntoView();
			element.waitForDisplayed(25000, false, `${element.selector} is not displayed, ${message}`);
			if ( isClickable ) {
				let clickable = true;
				try {
					element.waitForClickable(25000, false, `${element.selector} is not clickable, ${message}`);
				} catch (e) {
					clickable = true;
				}
				allureReporter.addStep(`clickable: ${element.selector}`, undefined, clickable ? 'passed' : 'failed');
				expect( clickable ).to.equal(true, `Element: ${element.selector} is not clickable`);
			}
			element.highlight('green');
			return element;
		}, severityLevel);
	}

	catchError (callback, options = {} ) {
		let result;
		const startTime = new Date().toJSON();
		try {
			result = callback.apply(this);
			if ( options && options.attachment ) {
				this.addAttachment(result,
					`Result Attachment ${startTime}`);
			}
		} catch (e) {
			if ( e ) {
				const errorOb = {
					error: e,
					stack: e.stack,
					details: options && options.message || 'error',
					severity: typeof options.severityLevel === 'number' ? options.severityLevel : 1,
					time: startTime,
				};
				this.addAttachment(errorOb,
					`Error Attachment ${startTime}`);
				this.stepErrorList.push(errorOb);
				browser.config.pushError(errorOb);
			}
		}
		return result;
	}

	containsTextStep (element, text, message, severityLevel ) {
		if ( element && element.selector && element.isExisting() ) {
			this.addStep(`contains text (${text}): ${element.selector}`, function () {
				const actualText = element.getText();
				const actualTextLower = new String(actualText).trim().toLowerCase();
				expect( actualTextLower ).to.include(text.trim().toLowerCase(),
					`element '${element.selector}' does not contain the text '${text}'`);
			}, severityLevel);
		}
		return this;
	}

	addStep (message, callback, severityLevel ) {

		let status = true;
		let result;

		if ( typeof severityLevel !== 'number' ) {
			severityLevel = DEFAULT_SEVERITY_LEVEL;
		}
		if ( !message ) {
			throw new Error('addStep requires a message');
		}

		allureReporter.startStep(message);

		const started = new Date().toJSON();
		try {
			if ( callback ) {
				result = callback.apply(this);
				this.addAttachment(result,
					`Result Attachment ${started}`, true);
			}
		} catch (e) {
			console.log(chalk.red(e));
			// && Object.keys(e).length
			if ( e && e.toString() ) {
				const item = {
					error: e.toString(),
					stack: e.stack,
					details: message,
					severity: severityLevel,
					time: started,
				};
				status = false;
				browser.config.pushError(item);
				this.addAttachment(item,
					`Error Attachment ${started}`, true);
				this.stepErrorList.push(item);
			}
		}

		allureReporter.endStep(status ? 'passed' : 'failed');

		return this;
	}

	textStep (text, status) {
		allureReporter.addStep(text,
			status ? 'passed' : 'failed'
		);
	}

	addAttachment ( data, title, json = false ) {
		if ( typeof data === 'object' && Object.keys(data).includes('sessionId') ) {
			return;
		}

		if ( json ) {
			data = JSON.stringify(data, null, '\t');
		} else {
			data = Utility.convertToText(data);
		}

		if ( data ) {
			allureReporter.addAttachment(
				title || `attachment-${new Date().toJSON()}`,
				`<div><pre><code>${data}</code></pre></div>`,
				'text/html'
			);
		}

		return this;
	}

	/**
	 * Skips test if parameter one matches skip property in ENV
	 * example:  SKIP='[ {"skip": "checkMe", "message": "message" } ]'
	 * @param matchString
	 * @returns {BasePage}
	 */
	skipOnMatch (matchString) {
		if ( process.env.SKIP ) {
			const skipped = [];
			try {
				const parsed = browser.call(async function () {
					return await JSON.parse(process.env.SKIP);
				}) || [];
				for (let i = 0; i < parsed.length; i++) {
					if ( parsed[i] && parsed[i].skip && matchString.toLowerCase().includes(parsed[i].skip.trim().toLowerCase()) ) {
						skipped.push( parsed[i] );
					}
				}
			} catch (e) {}

			if ( skipped && skipped.length > 0 ) {

				const allureReporter = require('@wdio/allure-reporter').default;
				allureReporter.startStep('skipped');

				if ( Object.keys(skipped[0]).length > 1 ) {
					allureReporter.addAttachment('skipped-attachment',
						`<div><pre><code>${JSON.stringify(skipped)}</code></pre></div>`,
						'text/html'
					);
				}

				const Pending = require('./../../node_modules/mocha/lib/pending.js');
				const pending = new Pending(`skipped: ${JSON.stringify(skipped)}`);
				throw pending;
			}
		}
		return this;
	}

	/**
	 * Needs to be run in order to process the step errors
	 */
	done ( allowedDiff, identifier ) {
		if ( typeof allowedDiff === 'number' && allowedDiff > 0 ) {
			VisualRegression.verifyVisualFullPage(identifier, allowedDiff);
		}
		const results = browser.config.pushError();
		const status = results.total && results.total > 0;
		allureReporter.addStep(
			'Done',
			status ? 'passed' : 'failed'
		);
		browser.config.pushError('done');
	}
}
