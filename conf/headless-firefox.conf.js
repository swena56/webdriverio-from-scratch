const smallUserAgent = process.env.USER_AGENT ||
	"Mozilla/5.0 (iPhone; CPU iPhone OS 7_0 like Mac OS X; en-us) AppleWebKit/537.51.1 (KHTML, like Gecko) Version/7.0 Mobile/11A465 Safari/9537.53";

const firefoxBase = {
	browserName: 'firefox',
	marionette: true,
	'moz:firefoxOptions':{
		binary: process.env.FIREFOX_BIN || `${require('puppeteer-firefox').executablePath()}`,
		args: [
			process.env.SHOW ? '' : '--headless',
		].filter(Boolean),
	}
};

const getFireFoxProfile = () => {
	return new Promise((resolve, reject)=>{
		const FirefoxProfile = require('firefox-profile');
		const firefoxProfile = new FirefoxProfile();
		firefoxProfile.setPreference("geo.enabled", true);
		firefoxProfile.setPreference("geo.prompt.testing", true);
		firefoxProfile.setPreference("geo.prompt.testing.allow",true);
		firefoxProfile.updatePreferences();
		firefoxProfile.encoded((err,profile)=>{
			if( err ) reject(err);
			resolve(profile);
		});
	});
};

exports.config = {
	//services:['selenium-standalone'],
	capabilities: [
		{
			...firefoxBase,
			tags: ['@sv'],
			build: `firefox-headless-sv`,
			'moz:firefoxOptions': {
				...firefoxBase['moz:firefoxOptions'],
				prefs: {
					'general.useragent.override': `${smallUserAgent}`,
					'dom.disable_window_open_feature.location': true,
					'browser.tabs.remote.autostart': false,
					'browser.tabs.remote.autostart.2': false,
					//"dom.ipc.processCount": 8,  // breaks when used in container
					'geo.prompt.testing': true,
					'geo.prompt.testing.allow': true,
					'geo.enabled': true,
					'permissions.default.geo': true,
					'browser.window.width' : '1920',
					'browser.window.height' : '1080',
				},
			},
		},
		{
			...firefoxBase,
			tags: ['@lv'],
			build: `firefox-headless-lv`,
			'moz:firefoxOptions': {
				...firefoxBase['moz:firefoxOptions'],
				prefs: {
					'dom.disable_window_open_feature.location': true,
					//"dom.ipc.processCount": 8,  // breaks when used in container
					'browser.tabs.remote.autostart': false,
					'browser.tabs.remote.autostart.2': false,
					'geo.prompt.testing': true,
					'geo.prompt.testing.allow': true,
					'geo.enabled': true,
					'permissions.default.geo': true,
					'browser.window.width' : '1920',
					'browser.window.height' : '1080',
				},
			},

		}
	],
};
