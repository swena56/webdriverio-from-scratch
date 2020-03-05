const getEmulationConfig = (deviceSearch) => {
	const puppeteer = require('puppeteer-core');
	const device = puppeteer.devices.filter( o => o.name === deviceSearch )[0];
	if( ! device ) {
		const available = Object.values(puppeteer.devices).map( o => o.name );
		throw new Error(`No device matching ${deviceSearch}, try ${JSON.stringify(available,null,'\t') }`);
	}
	return {
		//deviceName: device.name,
		userAgent: device.userAgent,
		deviceMetrics: {
			width: device.viewport.width,
			height: device.viewport.height,
			pixelRatio: device.viewport.deviceScaleFactor
		}
	};
};

const getChromeCap = (details,device=null) => {
	let results = {
		maxInstances: 5,
		browserName: 'chrome',
		'goog:chromeOptions': {
			excludeSwitches: ['enable-automation'],
			args: [
				...require('puppeteer-core').defaultArgs(),
				...[ process.env.DEVTOOLS ? `--remote-debugging-port=${parseInt(process.env.PORT||9222)}` : ''],
				//...[data.userAgent ? `--user-agent="${data.userAgent}"` : ''],
			].filter(Boolean)
		}
	};

	//add additional args
	results['goog:chromeOptions'].args.push(
		'enable-automation',
		'--disable-infobars',
		'--disable-browser-side-navigation',
		'--disable-dev-shm-usage',
		`--details="${details}"`,
		'--disable-gpu',
		'--disable-web-security',
		'--disable-setuid-sandbox',
		'--no-first-run',
		'--no-zygote',
		'--fast-start',
		'--start-maximized',
		'--disable-infobars',
		'--disable-popup-blocking',
		'--no-sandbox',
		'--disable-dev-shm-usage',
		'--disable-extensions',
		'--disable_chrome_update',
		'--disable-default-apps',
	);

	if( process.env.SHOW ){
		results['goog:chromeOptions'].args = results['goog:chromeOptions'].args.filter( o => o !== '--headless');
	}

	if( process.env.SANDBOX ){
		results['goog:chromeOptions'].args = results['goog:chromeOptions'].args.filter( o => o !== '--no-sandbox' );
	}

	if( device ){
		const found = getEmulationConfig(device);
		results['goog:chromeOptions']['mobileEmulation'] = found;
		results['goog:chromeOptions'].args.push(`--window-size=${found.deviceMetrics.width},${found.deviceMetrics.height}`);
	} else if( process.env.WINDOW_WIDTH && process.env.WINDOW_HEIGHT ){
		results['goog:chromeOptions'].args.push(`--window-size=${parseInt(process.env.WINDOW_WIDTH)},${parseInt(process.env.WINDOW_HEIGHT)}`);
	} else {
		results['goog:chromeOptions'].args.push(`--window-size=${1200},${1600}`);
	}

	//use puppeteer chrome browser binary (requires compatible chromedriver) if available (npm link puppeteer chromedriver@77)
	if( require('fs').existsSync('node_modules/puppeteer') && require('puppeteer').executablePath() ){
		const driverVersion = require('chromedriver').version.slice(0,4);
		const chromiumVersion = require('child_process').execSync(require('puppeteer').executablePath().trim() + ' --version').toString().trim();
		if( ! chromiumVersion.includes(driverVersion) ){
			process.stdout.write('chromedriver/browser version missmatch');
			process.stdout.write('install a version of chromedriver that matches your browser: \n\t npm link chromedriver@78');
			console.log(`chromedriver: ${driverVersion}`);
			console.log(`browser: ${chromiumVersion}`);
			process.exit(1);
		}
		results['goog:chromeOptions']['binary'] = require('puppeteer').executablePath();
	}

	if( process.env.CHROME_BIN ){
		results['goog:chromeOptions']['binary'] = process.env.CHROME_BIN;
	}

	return results;
};

let caps = [];

let selectedDevice = process.env.DEVICE || 'Pixel 2 XL';

if( process.env.LANDSCAPE ){
	selectedDevice += ' landscape';
}

if(process.env.SMALL_VIEW_ONLY){
	caps = [getChromeCap('small-view',selectedDevice )];
} else if(process.env.LARGE_VIEW_ONLY){
	caps = [getChromeCap('large-view')];
} else {
	caps = [
		getChromeCap('large-view'),
		getChromeCap('small-view', selectedDevice),
	];
}

exports.config = {
	services: [
		'chromedriver',
		require('./visual-regression.conf').service,
		...[ process.env.DEVTOOLS ? 'devtools' : ''],
	].filter(Boolean),
	path: '/',
	port: parseInt(process.env.CHROME_PORT || 9515),
	//TODO use reporters file instead

	capabilities: caps,
	beforeSession: function (config, capabilities, specs) {
		let env = Tag.getDomain();
		const viewSize = Tag.getViewSize();
		config.mochaOpts.grep = `.*${env}.*${viewSize}.*$`;
	},
};
