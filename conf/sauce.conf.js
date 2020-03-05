const getSauceAuthLink = () => {
	const jobId = browser.sessionId;
	const authCode = require('crypto')
		.createHmac('md5', `${process.env.SAUCE_USERNAME}:${process.env.SAUCE_ACCESS_KEY}`)
		.update(jobId)
		.digest('hex');
	return `https://app.saucelabs.com/tests/${jobId}?auth=${authCode}`;
};
const sauceOptions = 	{ "sauce:options":{ 'seleniumVersion': '3.141.59' } };

exports.config = {
	user: process.env.SAUCE_USERNAME,
	key: process.env.SAUCE_ACCESS_KEY,
	services: [
		'sauce',
		require('./visual-regression.conf').service,
	].filter(Boolean),
	region: 'US',
	sauceConnect: !! process.env.SAUCE_CONNECT,
	sauceConnectOpts: { doctor: true },
	priority: parseInt(process.env.PRIORITY) || 0,
	capabilities: [
		{ browserName: 'chrome', browserVersion: 'latest', platformVersion: 'Windows 10' },
		// { browserName: 'firefox' },
		// { browserName: 'safari' },
		// {  
		// 	browserName: 'Safari',
		// 	appiumVersion: '1.15.0',
		// 	deviceName: 'iPhone XS Simulator',
		// 	deviceOrientation: 'portrait',
		// 	platformVersion: '13.0',
		// 	platformName: 'iOS',
		// 	sendKeyStrategy: 'setValue',
		// },
		// {
		// 	browserName: 'chrome',
		// 	deviceName: 'Android GoogleAPI Emulator',
		// 	platformName: 'Android',
		// 	platformVersion: '10.0',
		// 	deviceOrientation: 'portrait',
		// }
	],
	beforeSession: function (config, capabilities, specs) {
		if( ! process.env.SAUCE_USERNAME || ! process.env.SAUCE_ACCESS_KEY ) {
			process.stdout.write(`Sauce Labs: ${require('chalk').red("Missing env vars: SAUCE_USERNAME,SAUCE_ACCESS_KEY")}\n`);
			process.exit(1);
		}
	},
	afterSession: function (config, capabilities, specs) {},
	onComplete: function (exitCode, config, capabilities, results) {},
	afterTest: function (test, context, { error, result, duration, passed }) {},
	beforeTest: function(test, context) {
		if( browser.capabilities.browserName ){
			process.stdout.write(`${require('chalk').green(browser.capabilities.browserName)} `);
		}
		process.stdout.write(`${require('chalk').green(test.fullTitle)}\n`);
		process.stdout.write(`\t${require('chalk').green(getSauceAuthLink())}\n`);

	},
};
