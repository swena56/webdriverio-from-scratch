import VisualRegression from './../util/visual-regression-helper';
import allureReporter from '@wdio/allure-reporter';

export default class BasePage {

	loadPage ( urlString = '/', fullPageAllowedDiff ) {
		expect( browser.sessionId ).to.be.a('string', 'Test Defect: Could not detect a browser sessionId');
		browser.url( urlString );
		this.waitForPageLoad();
		this.triggerLazyLoad();
		if ( typeof fullPageAllowedDiff === 'number' ) {
			VisualRegression.verifyVisualFullPage(fullPageAllowedDiff);
		}
		return this;
	}

	existenceStep (element, message, severityLevel, isClickable = false ) {
		if ( typeof severityLevel !== 'number' ) severityLevel = DEFAULT_SEVERITY_LEVEL;
		if ( !element || !element.selector ) {
			throw new Error('undefined element, programmer error');
		}
		allureReporter.startStep(`existence: ${element.selector}`);
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
	}

	refreshPage () {
		browser.pause(1000);
		browser.refresh();
		this.waitForPageLoad();
		return this;
	}

	waitForPageLoad ( interactive = false, additionalWaitTime = 0, preWaitTime = 0 ) {
		allureReporter.addStep(`document.readyState (before) ${browser.execute('return document.readyState')}`);
		if ( preWaitTime && preWaitTime > 0 ) browser.pause(preWaitTime);
		browser.waitUntil(
			() => {
				const state = browser.execute('return document && document.readyState ? document.readyState : "loading"');
				if ( interactive ) {
					return ( state === 'complete' || state === 'interactive' );
				}
				return state === 'complete';
			},
			100000,
			'Time out!',
			500
		);
		allureReporter.addStep(`document.readyState (after) ${browser.execute('return document.readyState')}`);
		if ( additionalWaitTime > 0 ) browser.pause( additionalWaitTime );
	}

	triggerLazyLoad () {
		this.scrollToFooter();
		this.scrollToHeader();
		if ( !$('footer').isDisplayedInViewport() ) {
			browser.waitUntil(
				() => {
					try {
						const scrollPosition = browser.execute(function () {
							window.scrollBy(0, 500);
							return (document.body.clientHeight - (window.innerHeight + window.scrollY));
						});
						return scrollPosition <= 600;
					} catch (e) {
						return true;
					}
				},
				100000,
				'Time out while lazy loading page scrolling!',
				100
			);
		}
		this.scrollToHeader();
		this.waitForPageLoad(false, 3000);
	}

	waitForAllSignsOfElementToDisappear (elementString) {
		this.scrollToHeader();
		expect(elementString).to.be.a('string');
		if ( $(elementString).isExisting() ) {
			let count = 0;
			while ( browser.execute(`return !! document.querySelectorAll('${elementString}').length`) ) {
				try {
					$(elementString).scrollIntoView();
					$(elementString).waitForDisplayed(3000);
				} catch (e) {}
				this.waitForNoLongerDisplayedInViewPort(elementString);
				count++;
				expect( count ).to.be.lt(7, `Detecting ${elementString} in view port after ${count} checks`);
			}
		}
		expect( $$(elementString).length ).to.equal(0,
			`number of elements '${elementString}' on page: ${$$(elementString).length}`);
		this.scrollToHeader();
	}

	waitForNoLongerDisplayedInViewPort (elementString) {
		if ( $(elementString).isExisting() ) {
			browser.waitUntil(
				() => !$(elementString).isExisting() || !$(elementString).isDisplayedInViewport(),
				30000,
				`element '${elementString}' is still present on page`
			);
		}
	}

	waitForShimmeringContentInContainer (container) {
		if ( container && container.selector && container.isExisting() ) {
			const parent = container.selector;
			browser.waitUntil(
				() => {
					return !( $(`${parent} .a-skeleton-shimmer`).isExisting()
						&& $(`${parent} .a-skeleton-shimmer`).scrollIntoView()
						&& $(`${parent} .a-skeleton-shimmer`).isDisplayedInViewport() );
				},
				60000,
				`Shimmering content has not loaded completely for ${parent}`
			);
		}
	}

	/**
	 * Gathers a chain of tagName,id,className all the way up the html chain
	 */
	getElementDiscriptors (current) {
		const results = [];
		while ( current && current.selector && current.isExisting() ) {
			try {
				const line = [];
				line.push(current.getTagName());
				line.push(current.getAttribute('id'));
				line.push(current.getAttribute('class'));
				results.push(line.filter(Boolean).join(' '));
				current = current.$('..');
			} catch (e) {
				break;
			}
		}
		return results.reverse();
	}

	pause () {
		browser.pause(browser.config.waitforInterval);
		return this;
	}

	getMatchingTagIds (tagId) {
		const list = $$(`*[id^=${tagId}]`)
			.map( o => `#${o.getAttribute('id')}` );
		expect( list.length ).to.be.above(0, `Found zero matches for '${tagId}'`);
		return list;
	}

	getScrollPosition () {
		browser.pause(250);
		const pos = browser.execute('return window[\'pageYOffset\'];');
		browser.pause(1000);
		return pos;
	}

	scrollToHeader () {
		browser.execute(function () { window.scrollBy(0, -125000); });
		browser.pause(1000);
		const position = this.getScrollPosition();
		expect(position).to.equal(0, 'Position is not at top of page');
		return this;
	}

	scrollToFooter () {
		browser.execute(function () { window.scrollBy(0, 125000); });
		browser.pause(1000);
		this.getScrollPosition();
		return this;
	}

	setEtkDeviceName (value = 'etkdevice') {
		expect(browser.getUrl()).to.include('bestbuy.com');
		browser.setCookies( {
			name: 'EtkDeviceName',
			value,
			domain: 'www.bestbuy.com',
		} );
		browser.refresh();
		this.waitForPageLoad( true );
	}

	clickSelectorIndex (selector, index = 0) {
		browser.execute(function (selector, index) {
			$(selector).get(index).click();
		}, selector, index);
		this.waitForPageLoad(true, 0);
	}

	getOsAndBrowserInformation () {
		const cap = browser.config.capabilities;
		if ( process.env.SAUCE ) {
			return [
				cap.deviceName,
				cap.browserName,
				cap.browserVersion,
				cap.platformName,
				cap.platformVersion,
				cap.deviceOrientation,
			].filter(Boolean)
				.join('-')
				.replace(/\s+/g, '-')
				.trim()
				.toLowerCase();
		}
		// adds further customization in labeling the headless browser
		if ( cap.browserName === 'chrome' ) {
			const extraDetails = cap['goog:chromeOptions'].args.filter( o => o.startsWith('--details=') )[0];
			return `${cap.browserName}-${extraDetails.split('=')[1]}`.replace('"', '');
		}
		return JSON.stringify(cap);
	}

	setUtCookie ( utCookieString = testData.COOKIES.UT ) {
		if ( !utCookieString ) throw new Error('Invalid ut cookie for setVtCookie');
		browser.setCookies( { name: 'ut', value: utCookieString } );
		return this.refreshPage();
	}

	setCookieData ( cookie = {} ) {
		if ( cookie ) {
			const keys = Object.keys(cookie);
			for (let i = 0; i < keys.length; i++) {
				if ( keys[i] && cookie[keys[i]] ) {
					const cookieObj = { name: keys[i], value: new String(cookie[keys[i]]), domain: '.bestbuy.com' };
					if ( cookieObj.value ) {
						allureReporter.addLabel(keys[i], cookie[keys[i]]);
						browser.setCookies(cookieObj);
					}
				}
			}
			browser.refresh();
			this.waitForPageLoad();
		}
		return this;
	}

	debugElement (element) {
		if ( element && element.isExisting() ) {
			const logData = (...data) => {
				const chalk = require('chalk');
				for (let i = 0; i < data.length; i++) {
					console.log(
						chalk.green(JSON.stringify(data[i]))
					);
				}
			};
			element.scrollIntoView();
			element.highlight('green');
			global.elem = element;
			logData(
				`[global.elem]: ${element.selector}`,
				`getSize: ${JSON.stringify(element.getSize())}`,
				`getLocation: ${JSON.stringify(element.getLocation())}`,
				`isClickable: ${element.isClickable()}`,
				`isDisplayed: ${element.isDisplayed()}`,
				`isDisplayedInViewport: ${element.isDisplayedInViewport()}`,
				`getText: ${element.getText()}`,
				`isFocused: ${element.isFocused()}`,
				`isEnabled: ${element.isEnabled()}`,
				`getTagName: ${element.getTagName()}`,
				this.getElementDiscriptors(element),
			);
		}
		browser.debug();
	}

	failure ( options = { element: null, message: null, data: null }) {
		const message = [];

		if ( options && options.message ) {
			message.push(options.message);
		}

		if ( options && options.element ) {
			if ( options.element.isExisting() ) {
				message.push(`size: ${JSON.stringify(options.element.getSize())}`);
				message.push(`location: ${JSON.stringify(options.element.getLocation())}`);
				message.push('existing: true');
				message.push(`able to click: ${options.element.isClickable()}`);
				message.push(`displayed: ${options.element.isDisplayed()}`);
				message.push(`in view port: ${options.element.isDisplayedInViewport()}`);
				message.push(`text: ${options.element.getText()}`);
				message.push(`focused: ${options.element.isFocused()}`);
				message.push(`enabled: ${options.element.isEnabled()}`);
				message.push(`tagName: ${options.element.getTagName()}`);
				options.element.scrollIntoView();
				options.element.highlight('red');
			} else {
				message.push('existing: false');
			}
		}

		if ( options && options.data ) {
			message.push(JSON.stringify(options.data));
		}

		const messageText = message.filter(Boolean).join(', ');
		allureReporter.addStep(`FAILURE POINT: ${messageText}`, 'failed');
		require('assert').fail(messageText);
	}

	getElementRowIndex (element) {
		const DEFAULT_INDEX = -1;
		let rowIndex = DEFAULT_INDEX;
		if ( element && element.selector && element.isExisting() ) {
			const rowIndexTemp = browser.execute(function (selector) {
				let current = document.querySelector(selector);
				if (current) {
					while (current.className && !new String(current.className).includes('row')) {
						current = current.parentElement;
					}

					let count = 0;
					while (current) {
						current = current.previousSibling;
						count++;
					}
					return count;
				}
				return -1;
			}, element.selector);

			if ( typeof rowIndexTemp === 'number' ) {
				rowIndex = rowIndexTemp;
			}
		}
		return rowIndex;
	}
}
