require('@babel/register')({
    presets: [[
        '@babel/preset-env',
        { targets: { node: 10 } },
    ]],
    babelrc: false,
});
exports.config = {
    runner: 'local',
	sync: true,
    exclude: [],
	priority: 1,
	specs:  ['./test/specs/*.spec.js'],
    baseUrl: 'https://www.saucedemo.com/',
    waitforTimeout: parseInt(process.env.WAIT_FOR_TIMEOUT || 60000),
    waitforInterval: parseInt(process.env.WAIT_FOR_INTERVAL || 10000),
    specFileRetries: parseInt(process.env.SPEC_RETRIES || 0),
    maxInstances: parseInt(process.env.MAX_INSTANCES || 10),
    maxInstancesPerCapability: parseInt(process.env.MAX_PER_CAP || 4),
	maxDuration: 1800 * 2,
    bail: parseInt(process.env.BAIL || 0),
	screenshotPath: require('path').join(process.cwd(), process.env.SCREENSHOT_PATH || 'screenshots'),
    filesToWatch: [],
    deprecationWarnings: true,
    networkConnectionEnabled: true,
    execArgv: [],
    logLevel: process.env.LOG_LEVEL || 'silent', // trace | debug | info | warn | error | silent
	coloredLogs: true,
	reporters: require('./conf/reporters.conf').basic,
    ...(process.env.SAUCE ? require('./conf/sauce.conf').config :  '' ),
	...(process.env.CHROME ? require('./conf/headless-chrome.conf').config : ''),
    framework: 'mocha',
    mochaOpts: {
        ui: 'bdd',
		require: ['@babel/register'],
		colors: true,
		timeout: false,
		retries: parseInt(process.env.SPEC_RETRIES || 2),
		slow: 60000 * 6,
		tags: ['@lv'],
    },
	afterCommand: function (commandName, args, result, error) {
	},
	...(require('./conf/add-aftertest-description.conf').config),
    before: function (capabilities, specs) {
        require('./conf/customize-browser.conf').configure(browser);
	},
	onPrepare: function() {
        console.log(`Starting: ${new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '')}`);
    },
	onComplete: function (exitCode, config, capabilities, results) {
		console.log(`Done: ${new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '')}`);
        console.log(`exitCode: ${exitCode}`);
	},
};
