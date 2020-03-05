import allureReporter from '@wdio/allure-reporter';

class DevToolsHelper {

	get defaultNetworkSummary () {
		return {
			count: 0,

		};
	};

	constructor () {
		if ( !process.env.DEVTOOLS || process.env.SAUCE || parseInt(process.env.MAX_INSTANCES) > 1 ) {
			this.enabled = false;
		} else {
			this.enabled = true;
		}
	}

	// https://code.bestbuy.com/stash/projects/SHOP/repos/e2e-tests/browse/test/existence-checks/http-status-codes.devtools.js?at=refs%2Fheads%2Fpitdevelop
	reset () {
		this.results = [];
		expect( browser.options.services.includes( 'devtools' ) ).to.equal( true, 'Need Devtools to be an included service' );
		this.enabled = true;
	}

	/**
	 * TODO include data
	 * @param filter
	 * @returns {DevToolsHelper}
	 */
	start ( filter = false ) {
		if ( this.enabled ) {
			this.reset();

			browser.cdp( 'Network', 'enable' );
			browser.on( 'Network.responseReceived', ( params ) => {
				if ( params.response.status !== 200 || !filter ) {
					const item = {
						status: params.response.status,
						url: params.response.url,
					};
					if ( !this.results.includes( item ) ) {
						this.results.push( item );
					}
				}
			} );
			browser.cdp( 'Profiler', 'enable' );
			browser.cdp( 'Debugger', 'enable' );
		}
		return this;
	}

	applyNetworkTrafficFilter (...filterMatches) {

	}

	defineNetworkTrafficExpectations (...expectations) {
		if ( this.enabled && this.results && this.results.length > 0 && expectations.length > 0 ) {
			const matches = [];
			for (let i = 0; i < expectations.length; i++) {
				if ( expectations[i] ) {
					const isFound = this.results.filter( o => new String(o).includes(expectations[i]) );
					expect( !isFound || isFound.length === 0 ).to.equal(true, `Could not find network traffic matching: '${expectations[i]}'`);
					matches.push(isFound);
				}
			}

			// Show accounted and unaccounted for network traffic
			allureReporter.addAttachment('network traffic', JSON.stringify(this.results, null, '\t'), 'text/json');

			// show all failed network traffic

			// show counts
		}
		return this;
	}

	/**
	 * What is the point of this method?
	 * @param addToAllure
	 * @returns {Array}
	 */
	reviewNetworkData (addToAllure = false) {
		if ( this.enabled ) {
			console.log(this.results);

			// Summary Data
			if ( addToAllure ) {
				allureReporter.addAttachment('network traffic', JSON.stringify(this.results, null, '\t'), 'text/html');
			}

			return this.results;
		}
	}

	stop () {
		if ( this.enabled ) {
			browser.cdp( 'Network', 'disable' );
		}
	}
}

export default new DevToolsHelper();
