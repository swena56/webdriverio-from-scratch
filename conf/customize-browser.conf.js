"use strict";

import Utility from '../test/util/utility';
import allureReporter from '@wdio/allure-reporter';

exports.configure = (browser) => {
    const chai = require('chai');
    const chaiHttp = require('chai-http');
	const chaiWebdriver = require('chai-webdriverio').default;
	chai.config.includeStack  = true;
	chai.config.showDiff = true;
	chai.should();
	chai.use(chaiWebdriver(browser,{defaultWait: 25000}));
	chai.use(chaiHttp);
	global.chai = chai;
	global.expect = chai.expect;
    global.chalk = require('chalk');
    global.assert = chai.assert;
    global.logger = require('@wdio/logger').default('e2e-testing');
    global.inspect = require('inspect.js');

    browser.addCommand("highlight", function (color = 'red') {
        if( process.env.HIGHLIGHT && this.isExisting() ){
            this.execute(function(selector,color){
                if (!window.highlighted) {
                    window.highlighted = []
                }
                var element = window.$(selector);
                if (element.length > 0) {
                    element.css({
                        'border-color': color,
                        'border-width': '3px',
                        'border-style': 'solid',
                        'border-radius': '5px'
                    });
                    window.highlighted.push(selector)
                }
            },this.selector,color);
        }
    },true);

	browser.addCommand("assert", function () {
		try {
			this.waitForExist();
		} catch(e){}
		expect( this ).is.an('object',`Assert method not able to find element does not exist`);
		if( ! this ){
			require('assert').fail("Can not assert on undefined");
		}
		expect( this.selector ).is.an('string',`Assert method not able to find element does not exist: '${this.selector}'`);
		expect( this.isExisting() ).to.equal(true,`Element does not exist: '${this.selector}'`);
		return this;
	},true);

	browser.addCommand("waitForExistSafe", function (duration = 30000) {
		try {
			this.waitForExist(duration);
			return true;
		} catch(e){
			return false;
		}
	},true);

	browser.addCommand("verifyWidgetCollectionRef", function (pcmcat) {
		let actual = '';
		try {
			this.waitForExist();
			actual = new String(this.getAttribute('data-ref-node')).toLowerCase().trim();
		} catch(e){}
		const desiredRefNode = new String(pcmcat).toLowerCase().trim();
		expect( desiredRefNode ).to.equal(actual,'widget does not have a matching reference node');
		return actual;
	},true);

	browser.addCommand("waitForElement", function (duration = 50000) {
			this.waitForExist(duration,false,`${this.selector} does not exist within ${duration/1000} seconds`);
			this.scrollIntoView();
			this.waitForDisplayed(duration,false,`${this.selector} does not exist within ${duration/1000} seconds`);
	},true);

	browser.addCommand("prepareForClick", function (assert = false) {
		const duration = 10000;
		allureReporter.startStep(`prepareForClick: ${this.selector}`);
		let passed = true;
		try {
			this.waitForExist(duration,false,`${this.selector} not existing within ${duration/1000} seconds`);
			this.scrollIntoView();
			this.waitForDisplayed(duration,false,`${this.selector} not displayed within ${duration/1000} seconds`);
			this.waitForClickable(duration,false,`${this.selector} not clickable within ${duration/1000} seconds`);
		} catch(e){
			passed = false;
		}
		allureReporter.endStep( passed ? 'passed' : 'failed' );
		if( assert ){
			expect( passed ).to.equal(true,`prepareForClick: ${this.selector}`);
		}
		browser.pause(3000);
		return passed;
	},true);

	browser.addCommand('waitForPageReady', () => {
		return browser.waitUntil(
			() => {
				const state = browser.execute(() => {
					return document.readyState;
				});
				return state.value === 'complete';
			},
			browser.config.waitforInterval,
			'Oops, time out!',
			500
		);
	});

	browser.addCommand("isHrefDynamic", function () {
		const hrefElement = this;
		expect( hrefElement, `isHrefDynamic: Invalid a tag Element` ).to.exist.and.have.property('selector');
		expect( hrefElement.isExisting() ).to.equal(true,
			`isHrefDynamic is needs element to exist, ${hrefElement.selector}`);
		expect( hrefElement.getTagName().toLowerCase() ).to.exist.and.equal('a',
			`isHrefDynamic: requires an a tag element` );
		expect( hrefElement.getAttribute('href') ).to.exist.and.be.a('string');
		const size = hrefElement.getSize();
		expect( size ).to.exist.and.to.have.property('width');
		expect( size['width'] ).to.be.greaterThan(0,`${hrefElement.selector} has an invalid width`);
		expect( size ).to.exist.and.to.have.property('height');
		expect( size['height'] ).to.be.greaterThan(0,`${hrefElement.selector} has an invalid height`);
		return hrefElement.getAttribute('href') &&
			hrefElement.getAttribute('href').toLowerCase().includes('javascript') &&
			! hrefElement.getAttribute('target');
	}, true);

	browser.addCommand("getElementPath", function () {
		let current = this;
		const results = [];
		while ( current && current.selector && current.isExisting() ) {
			try {
				const line = [];
				line.push(current.getTagName().toLowerCase());
				const id = current.getAttribute('id');
				if( id ) line.push(`#${id}`);
				line.push(current.getAttribute('class'));
				results.push(line.filter(Boolean).join(' '));
				current = current.$('..');
			} catch (e) {
				break;
			}
		}
		return results.reverse();
	}, true);

	browser.addCommand("getElementDetails", function () {
		expect( this, `getElementDetails: Invalid Element` ).to.exist.and.have.property('selector');
		expect( this.isExisting() ).to.equal(true,`Invalid Element: ${this.selector}`);
		const all = $$(`${this.selector}`);
		return {
			selector: this.selector,
			isDisplayed: this.isDisplayed(),
			isDisplayedInViewport: this.isDisplayedInViewport(),
			isEnabled: this.isEnabled(),
			size: this.getSize(),
			location: this.getLocation(),
			className: this.getAttribute('class'),
			href: this.getAttribute('href'),
			tagName: this.getTagName(),
			unique: all.length === 1,
			count: all.length,
			text: this.getText(),
			path: this.getElementPath(),
			html: this.getHTML(),
			isClickable: this.isClickable(),
		};
	},true);

	browser.addCommand("clickAndVerify", () => {
		expect(this.selector && this.isExisting()).to.equal(true,`Element does not exist: '${this.selector}'`);
		this.scrollIntoView();
		const current = browser.getUrl();
		this.click();
		const after = browser.getUrl();
		expect( current !== after ).to.equal(true,`element click did not detect a url change, ${after}`);
		browser.back();
	},true);

	browser.addCommand("isClickable", function () {
		allureReporter.startStep(`isClickable: ${this.selector}`);
		console.log(`isClickable: ${this.selector}`);
		let result;
		try {
			result = this.isClickable();
			allureReporter.endStep( 'passed' );
		} catch(e){
			allureReporter.endStep( 'failed' );
		}
		return result;
	}, true );

	browser.addCommand("injectClick", function () {
		const duration = 20000;
		let status = {
			exists: false, displayed: false,
			enabled: false, clickable: false,
		};
		try {
			this.waitForExist(duration,false,`${this.selector} not existing within ${duration/1000} seconds`);
			status.exists = true;
			this.scrollIntoView();
			this.waitForDisplayed(duration,false,`${this.selector} not displayed within ${duration/1000} seconds`);
			status.displayed = true;
			this.waitForEnabled(duration,false,`${this.selector} not enabled within ${duration/1000} seconds`);
			status.enabled = true;
			this.waitForClickable(duration,false,`${this.selector} not clickable within ${duration/1000} seconds`);
			status.clickable = true;
		} catch(e){
			status['errors'] = e.toString();
		}

		browser.execute(`return document.querySelector('${this.selector}').click()`);
		browser.pause(1000);

		let allPassed = true;
		let statusString = 'passed';
		for(let check in status ){
			if( ! status[check] ){
				allPassed = false;
				statusString = 'failed';
			}
		}

		if( status['errors'] ){
			statusString = 'skipped';
		}

		if( status ){
			allureReporter.addStep(
				`injectClick: ${this.selector}`,
				JSON.stringify(status,null,'\t'),
				statusString
			);
		}
		return allPassed;
	},true);

	browser.addCommand('validateUrls', function(urls){
		if( typeof urls === 'string' ){
			urls = [ urls ];
		}
		try {
			const testLinks = urls.map( l => Utility.testUrlStatusSync(l).catch() );
			return Promise.all( testLinks );
		} catch(e){
			return [];
		}
	});

    browser.addCommand('removeHighlights', () => {
    	browser.execute(function(){
            if (window.highlighted) {
                window.highlighted.forEach(function(selector) {
                    window.$(selector)
                        .css({
                            'border-width': '0px'
                        })
                });
                window.highlighted = []
            }
        });
    });

	browser.addCommand("deleteElement", () => {
		if( this.selector && this.isExisting() ){
			browser.execute(function(element){
				var all = document.querySelectorAll( element );
				for ( var i = 0; i < all.length; i++ ) {
					if ( all[i] ) {
						all[i].style.display = 'none';
					}
				}
			},this.selector);
		}
	},true);

    //TODO clean up
	// browser.addCommand('setOIDCookie', () => {
	// 	const cookie = {
	// 		name: 'oid',
	// 		domain: '.bestbuy.com'
	// 	};
	//
	// 	cookie.value = '15631';
	// 	browser.setCookie(cookie);
	// 	browser.refreshPage();
	// });

	// Array.prototype.getRandomElement = function () {
	// 	return this[Math.floor(Math.random() * this.length)]
	// };

    //create screenshots dir
	if ( ! require('fs').existsSync(browser.config.screenshotPath) ){
		require('fs').mkdirSync(browser.config.screenshotPath);
	}
};
