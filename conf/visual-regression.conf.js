const path = require('path');
const DEFAULT_FOLDER = '.visual-regression';

export const removableElements = [
	
];

let defaultOptions = {
	//formatImageName: `{tag}-{platformName}{platformVersion}{deviceName}{browserName}`,
	formatImageName: `{tag}`,
	screenshotPath: path.join(process.cwd(), DEFAULT_FOLDER ),
	actualFolder: path.join(process.cwd(), DEFAULT_FOLDER, './actual'),
	baselineFolder: path.join(process.cwd(), DEFAULT_FOLDER, './reference'),
	diffFolder: path.join(process.cwd(), DEFAULT_FOLDER, './diff'),
	devicePixelRatio: 1,
	returnAllCompareData:true,
	disableCSSAnimation: false,
	hideScrollBars: true,
	savePerInstance: false,
	ignoreAlpha:true,
	ignoreAntialiasing: true,
	ignoreTransparentPixel: true,
	autoSaveBaseline: true,
	blockOutStatusBar: true,
	blockOutToolBar: true,
	fullPageScrollTimeout: 3000,
	largeImageThreshold: 0,
	//scaleImagesToSameSize:true,
	//saveAboveTolerance: false,
	//hideAfterFirstScroll: true,
	removeElements: removableElements,
	hideElements: removableElements,
};

if( process.env.VISUAL_BROWSER_FOLDERS ){
	defaultOptions.formatImageName = `{tag}`;
	defaultOptions.savePerInstance = true;
}

exports.defaultFolder = DEFAULT_FOLDER;
exports.defaultOptions = defaultOptions;

exports.service = [
	'image-comparison', defaultOptions
];
