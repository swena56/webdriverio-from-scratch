const video = require('wdio-video-reporter');
//const { TimelineService } = require('wdio-timeline-reporter/timeline-service');

/**
 * Demonostratres how to setup each reporter
 */
const all = {
	'dot': 		'dot',
	'spec': 	'spec',
	'junit': 	[
		'junit', {
			outputDir: './junit-results',
			outputFileFormat: function(options) {
				return `results-${(new Date()).getTime()}.xml`
			}
		}
	],
	'json': [
		'json',{ outputDir: './allure-results/json'}
	],
	'video': [
		video, {
			outputDir: './allure-results/raw-video',
			saveAllVideos: false,
			videoSlowdownMultiplier: process.env.VIDEO_SLOW_DOWN || 5,
		}
	],
	'allure': [
		'allure', {
			outputDir: './allure-results',
			disableWebdriverStepsReporting: false,
			disableWebdriverScreenshotsReporting: true,
			enableScreenshotDiffPlugin: true,  // investigate how to add allure plugins
		}
	],
	'timeline': [

	]
};

exports.basic = [ all.dot, all.spec, all.junit, all.allure ];
