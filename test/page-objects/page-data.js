import Utility from '../util/utility';
import allureReporter from '@wdio/allure-reporter';
import url from 'url';

class PageData {

	get documentHeight () {
		return browser.execute( () => {
			const body = document.body,
				html = document.documentElement;
			return Math.max( body.scrollHeight, body.offsetHeight,
				html.clientHeight, html.scrollHeight, html.offsetHeight );
		} );
	}

	getWindowVersion () {
		const versions = browser.execute(function () {
			var keys = Object.keys(window);
			var found = [];

			for (var i = 0; i < keys.length; i++) {
				if (window[keys[i]] && window[keys[i]].version) {
					found.push(''.concat(keys[i], ': ').concat(window[keys[i]].version));
				}
			}
			return found;
		});

		if ( versions ) {
			this.addDataAttachment(versions);
			return versions;
		}
	}

	elementsByTag ( tagString ) {
		return browser.execute(
			( tag ) => Array.apply( [], document.querySelectorAll( `[id^="${tag}"]` ) ).map( o => `#${o.id}` ),
			tagString || ''
		);
	}

	elementsByClass ( tagString ) {
		return browser.execute(
			( tag ) => Array.apply( [], document.querySelectorAll( `[class*="${tag}"]` ) ).map( o => `#${o.id}` ),
			tagString || ''
		);
	}

	getLinks ( sameOrigin = true ) {
		const results = browser.execute( ( sameOrigin ) => {
			const allElements = [];

			const findAllElements = function ( nodes ) {
				for ( let i = 0, el; el = nodes[i]; ++i ) {
					allElements.push( el );
					// If the element has a shadow root, dig deeper.
					if ( el.shadowRoot ) {
						findAllElements( el.shadowRoot.querySelectorAll( '*' ) );
					}
				}
			};

			findAllElements( document.querySelectorAll( '*' ) );

			const filtered = allElements
				.filter( el => el.localName === 'a' && el.href )
				.filter( el => el.href !== location.href )
				.filter( el => {
					if ( sameOrigin ) {
						return new URL( location ).origin === new URL( el.href ).origin;
					}
					return true;
				} )
				.map( a => a.href );

			return Array.from( new Set( filtered ) );
		}, sameOrigin );
		return Utility.uniqueSort( results );
	}

	getHrefCssPath ( href ) {
		if ( href ) {
			const parsed = url.parse( href ).path.slice( 1 );
			return browser.execute( ( href ) => {
				const cssPath = function ( el ) {
					if ( !( el instanceof Element ) )
						return;
					const path = [];
					while ( el.nodeType === Node.ELEMENT_NODE ) {
						let selector = el.nodeName.toLowerCase();
						if ( el.id ) {
							selector += `#${ el.id}`;
							path.unshift( selector );
							break;
						} else {
							let sib = el, nth = 1;
							while ( sib = sib.previousElementSibling ) {
								if ( sib.nodeName.toLowerCase() === selector )
									nth++;
							}
							if ( nth !== 1 )
								selector += `:nth-of-type(${nth })`;
						}
						path.unshift( selector );
						el = el.parentNode;
					}
					return path.join( ' > ' );
				};

				const hrefElement = document.querySelector( `*[href*="${href}"]` );
				if ( hrefElement ) {
					return cssPath( hrefElement );
				}
			}, parsed );
		}
	}

	highlightHref ( href, color = 'red' ) {
		expect( href ).to.be.a( 'string' );
		const urlData = url.parse( href );

		const match = $( `a[href$="${urlData.path}"]` );
		const exists = match.isExisting();
		if ( exists ) {
			match.scrollIntoView();
			match.highlight( color );
		} else {
			console.log( chalk.red( `${href} does not exist with selector (${match.selector}), can not highlight` ) );
		}
	}

	getSubdomain () {
		let subDomain = require('url').parse(browser.config.baseUrl).hostname.split('.').filter( o => o !== 'www' )[0];
		const { addArgument } = require('@wdio/allure-reporter').default;
		addArgument('domain', subDomain );

		if ( subDomain === 'test' ) {
			subDomain = '@mte';
		} else if ( subDomain.includes('ancillary') ) {
			subDomain = '@ancillary';
		} else if ( subDomain.includes('ancillary') ) {
			subDomain = '@ancillary';
		} else if ( subDomain.includes('stage') ) {
			subDomain = '@stage';
		} else if ( subDomain.includes('browseui-browse-discover') ) {
			subDomain = '@omnitank';
		} else {
			subDomain = '@prod';
		}
		return subDomain;
	}

	getSID () {
		let SID;
		try {
			SID = browser.getCookies(['SID']);
			if ( SID && SID.length && SID[0].value ) {
				SID = SID[0].value;
			}
		} catch (e) {}
		return SID ? SID : '< SID: unknown >';
	}

	addReportVersions () {
		try {
			const comments = this.getComments();
			const { addArgument } = require('@wdio/allure-reporter').default;
			if ( comments.filter( o => o.includes('widgets-view') ).length ) {
				const version = comments.filter( o => o.includes('widgets-view'))[0].split(':')[1].trim() || false;
				if ( version ) {
					addArgument('widgets-view', version );
				}
			}
			if ( $('.widget-container').isExisting() && $('.widget-container').getAttribute('data-version') ) {
				addArgument('widgets-view', $('.widget-container').getAttribute('data-version') );
			}
			if ( comments.filter( o => o.includes('node=') ).length ) {
				const line = comments.filter( o => o.includes('node=') )[0];
				const cba = line.split(',')[0].split('=')[1] || '?';
				addArgument('cba-version', cba );
				const node = line.split(',')[1].split('=')[1].slice(0, 8).trim() || '?';
				addArgument('node-version', node );
			}
		} catch (e) {}
	}

	getComments () {
		return browser.execute( function () {
			function getComments (context) {
				var foundComments = [];
				var elementPath = [context];

				while (elementPath.length > 0) {
					var el = elementPath.pop();

					for (var i = 0; i < el.childNodes.length; i++) {
						var node = el.childNodes[i];

						if (node.nodeType === Node.COMMENT_NODE) {
							foundComments.push(node);
						} else {
							elementPath.push(node);
						}
					}
				}

				return foundComments;
			}

			var comments = getComments(document);
			var foundComments = [];

			for (var i = 0; i < comments.length; i++) {
				if (comments[i].data) {
					foundComments.push(comments[i].data.trim());
				}
			}
			return foundComments;
		} ).filter( Boolean );
	}

	analyzeUrl (urlString) {
		if ( urlString ) {
			const urlData = require('url').parse(urlString);

			if (urlData.slashes && urlData.pathname) {
				const dirs = urlData.pathname.split('/');
				while (dirs.length) {
					const path = dirs.shift();
					if (path && path === 'site') {
						break;
					}
				}
				urlData.site = dirs;
			}

			const found = { abcat: false, pcmcat: false, skuId: false };
			if (urlData.query && urlData.query.includes('pcmcat')) {
				found.pcmcat = urlData.query.replace(/^\D+/g, '');
				allureReporter.addArgument('pcmcat', found.pcmcat);
			}
			if (urlData.query && urlData.query.includes('abcat')) {
				found.abcat = urlData.query.replace(/^\D+/g, '');
			}
			if (urlData.query && urlData.query.includes('skuId=')) {
				const parameters = urlData.query.split('&');
				const skuIdParameter = parameters.filter(o => o.includes('skuId='))[0];
				skuIdParameter.replace(/[+-]?\d+(\.\d+)?/g, function (match) {
					found.skuId = match;
				});
			}
			urlData.identifers = found;
			return urlData;
		}
	}

	addDataAttachment (data, title) {
		if ( data !== undefined ) {
			const dataString = Utility.convertToText(data);
			allureReporter.addAttachment(
				title || `data-attachment-${new Date().toISOString()}`,
				`<div>
					<pre><code>${dataString}</code></pre>
				 </div>`,
				'text/html'
			);
		}
	}

	parentComponent ( elem ) {
		if ( $( elem ).isExisting() ) {
			const element = browser.execute( function ( elem ) {
				return $( elem ).parent().attr( 'id' );
			}, elem );
			const parent = $( `#${element}` );
			return ( parent.isExisting() ) ? parent : $( 'body' );
		}
	}

	deleteElement ( element ) {
		if ( element && $(element).isExisting() ) {
			browser.execute( function ( sel ) {
				var all = document.querySelectorAll( sel );
				for ( var i = 0; i < all.length; i++ ) {
					if ( all[i] ) {
						all[i].style.display = 'none';
					}
				}
			}, element );
		}
	}
}

export default new PageData();
