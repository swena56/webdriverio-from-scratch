/**
 * - Help menu
 * - Probably should not even exist
 * - and an easy inline way to set envirnoment variables
 */
const showHelp = () => {
	const commandLineUsage = require('command-line-usage');
	const sections = [
		{
			header: 'test header',
			content: 'test suite'
		},
		{
			header: 'Options',
			optionList: [
				{
					name: 'spec',
					typeLabel: '{underline test-spec}',
					description: 'test spec'
				},
				{
					name: 'sauce',
					typeLabel: '{underline device capability}',
					description: `Set device cap, (comma separated)\n\texample: ${require('chalk').green('--sauce edge,pixel')}\n`
				},
				{
					name: 'chrome',
					typeLabel: 'local {underline chrome} browser',
					description: `Activates chrome, example: ${require('chalk').green('--chrome')}\n`
				},
				{
					name: 'suite',
					typeLabel: '{underline environment}',
					description: `Sets test environment ( default: 'prod' )\n\texamples: \n${['prod','test','stage','omnitank','ancillary'].map( o => require('chalk').green(`--env ${o}`) ).join('\n') }`
				},
				{
					name: 'list',
					typeLabel: '{underline caps} or {underline specs}',
					description: 'Shows a list of caps or test specs'
				},
				{
					name: 'lv',
					typeLabel: ' ',
					description: 'Uses only @lv large view sizes.'
				},
				{
					name: 'sv',
					typeLabel: ' ',
					description: 'Uses only @sv small view sizes.'
				},
				{
					name: 'max',
					typeLabel: '{underline number}',
					description: 'number of concurrency to use for parallel testing'
				},
				{
					name: 'show',
					typeLabel: ' ',
					description: '{underline not headless} sets chrome browser to test in windowed mode'
				},

				{
					name: 'log',
					typeLabel: '{underline string}',
					description: 'log level options: ( info, data, silent )'
				},

				{
					name: 'v', typeLabel: ' ',
					description: 'Enable Verbose - logging and allure reports\n'
				},
				{
					name: 'd', typeLabel: ' ',
					description: 'Enable debugging mode'
				},
				{
					name: 'info', typeLabel: ' ',
					description: 'Print this {underline help} usage guide.'
				},
				{
					name: 'h', typeLabel: ' ',
					description: 'Print this {underline help} usage guide.'
				},
			]
		}
	];
	const usage = commandLineUsage(sections);
	console.log(usage);
	process.exit();
};

const argv = require('yargs').parse();
const chalk = require('chalk');
const allTests = require('glob').sync( './test/specs/**/*.spec.js' );
const getUserInput = (question) => {
	const readline = require("readline");
	const rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout
	});
	return rl.question(question, function(result) {
		return result;
	});
};
if( argv['help'] || argv['h'] !== undefined ) showHelp();
if( argv['info'] ) showHelp();
if( argv['sauce'] ) {
	process.env.SAUCE=argv['sauce'];
}
if( argv['chrome'] ){
	process.env.CHROME=argv['chrome'];
}
//if( ! argv['sauce'] && ! argv['chrome'] ) showHelp();
if( ! argv['sauce'] && ! argv['chrome'] ) process.env.CHROME=true;
if( argv['show'] ) process.env.SHOW=argv['show'];
if( argv['lv'] ) process.env.LARGE_VIEW_ONLY=argv['lv'];
if( argv['sv'] ) process.env.SMALL_VIEW_ONLY=argv['sv'];
if( argv['d'] ) process.env.DEBUG=argv['d'];
if( argv['show-specs'] || argv['list-specs'] ) {
	console.log("Spec Listing",allTests);process.exit();
}

if( argv['search'] ) {
	let tests = allTests;
	if( typeof argv['search'] === 'string' ){
		console.log(`Search: '${argv['search']}'`);
		tests = tests.filter( o => o.toLowerCase().includes(argv['search']) );
		process.env.SPECS = tests;
	}
	console.log(tests);
	if( tests.length !== 1 ){
		process.exit();
	}
}

if( argv['check-urls'] ) {
	let urlList = [];
	for (let i = 0; i < allTests.length; i++) {
		const fileText = require('fs').readFileSync(allTests[i]).toString();
		if( fileText ){
			urlList.push({ filename: allTests[i], pcmcats: [...new Set(fileText.match(/pcmcat[0-9]+/g))]});
		}
	}
	console.log(urlList);
	process.exit();
}

if( argv['max'] ) process.env.MAX_INSTANCES=argv['max'];
if( argv['debug'] ) throw new Error('Not Implemented');
if( argv['verbose'] || argv['v'] ){
	process.env.ADD_SCREENSHOT=true;
	process.env.LOG_LEVEL='info';
}

if( argv['visual'] !== undefined ){
	process.env.VISUAL=true;
}

if( ! process.env.FIRST_RUN ){
	console.log(`VISUAL: ${process.env.VISUAL ? chalk.green('on') : chalk.red('off')}`);
	console.log(`MAX_INSTANCES: ${process.env.MAX_INSTANCES || 1}`);
	console.log(`LOG_LEVEL: ${process.env.LOG_LEVEL || 'silent'}`);
	console.log(`SPEC_RETRIES: ${parseInt(process.env.SPEC_RETRIES || 2)}`);
	process.env.FIRST_RUN = true;
}
