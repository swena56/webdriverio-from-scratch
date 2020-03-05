const {addDescription, addArgument} = require('@wdio/allure-reporter').default;
const sharp = require('sharp');
const getSauceReport = () => {
	if( browser.config.services && browser.config.services.includes('sauce') ){
		if( process.env.SAUCE_USERNAME && process.env.SAUCE_ACCESS_KEY ) {
			const jobId = browser.sessionId;
			const authCode = require('crypto')
				.createHmac('md5', `${process.env.SAUCE_USERNAME}:${process.env.SAUCE_ACCESS_KEY}`)
				.update(jobId)
				.digest('hex');
			const sauceLink = `https://app.saucelabs.com/tests/${jobId}?auth=${authCode}`;
			return `<div>
					<video controls="true" autoplay="true" name="media" width="100%">
						<source src="https://assets.saucelabs.com/jobs/${jobId}/video.mp4?auth=${authCode}" type="video/mp4">
					</video>
					<a href="${sauceLink}">Sauce Labs</a>
			</div>`;
		}
	}
	return '<br/>';
};

export const getOnlineResourcesReport = () => {
	const urlString = browser.getUrl();
	const lightHouseReportUrl = `https://developers.google.com/speed/pagespeed/insights/?url=${encodeURI(urlString)}`;
	const htmlValidatorUrl = `https://validator.w3.org/nu/?doc=${encodeURI(urlString)}`;
	const cssValidatorUrl = `https://jigsaw.w3.org/css-validator/validator?uri=${encodeURI(urlString)}&profile=css3svg&usermedium=all&warning=1&vextwarning=&lang=en`;
	return `<div>
		<h6>Online Resources</h6>
		<ul>
			<li><a target="_blank" href="${lightHouseReportUrl}">Lighthouse Report</a></li>
			<li><a target="_blank" href="${htmlValidatorUrl}">W3 Html Validator</a></li>
			<li><a target="_blank" href="${cssValidatorUrl}">W3 CSS Validator</a></li>
		</ul>	
	</div>`
};

exports.config = {
	//screenshotPath: process.env.SCREENSHOT_PATH || './errorShots',
	afterTest: (test, context, { error, result, duration, passed }) => {
		try {
			console.log(`FINISHED: "${test.parent} - ${test.title}"`);
			const testFilename = `test/${test.file.split('/test/')[1]}`;
			addArgument("filename",testFilename );

			if( ! browser.sessionId ){
				const message = `Skipped: oh no, where did the browser session go?`;
				addDescription(`<div>
					<div>${message}</div>
					<div>${testFilename}</div>
					<div>${JSON.stringify(error)}</div>
					<div>${JSON.stringify(result)}</div>
				</div>`);
				const Pending = require('./../node_modules/mocha/lib/pending.js');
				context.test.callback(new Pending(message));
			}

			const PageData = require('../test/page-objects/page-data').default;
			PageData.addReportVersions();

			const regExp = /\(([^)]+)\)/;
			const title = regExp.exec(test.title) || null;
			if( title && title[1] ){
				addArgument("cap", title[1].trim() );
			}
			const urlString = browser.getUrl();
			const pageTitle = browser.getTitle();
			PageData.analyzeUrl(urlString);

			let screenshot = null;
			const quality = ( test.error !== undefined || process.env.ADD_SCREENSHOT ) ? 80 : 25;
			//if (test.error !== undefined || process.env.ADD_SCREENSHOT ) {
				const filename = `${browser.config.screenshotPath}/${require('uuid').v1()}.png`;
				const screenShotBuffer = browser.saveScreenshot(filename);
				browser.pause(3000);
				//const buffer = $$('body')[0].saveScreenshot(filename); //use for fullscreenshot does not work on ie
				if (require('fs').existsSync(filename)) {
					// const stats = require('fs').statSync(filename);
					// const fileSizeInBytes = stats.size;
					const buffer = browser.call(function () {
						return new Promise(function (res, rej) {
							sharp(screenShotBuffer)
								//.resize(null,500)
								//.min()
								.jpeg({quality: quality })
								.toBuffer(function (err, buffer) {
									if( err ) rej(err);
									res(buffer);
								});
						}).catch((error) => console.log(error));
					});
					if( buffer && Buffer.isBuffer(buffer) ){
						const base64 = buffer.toString('base64');
						if (base64 && base64.length > 100) {
							screenshot = `<a target="_blank" href="${urlString}"><img class="card-img-top" src="data:image/png;base64, ${ base64.toString('base64') }" /></a>`;
						}
					}
				}
			//}
			const timestamp = new String(new Date().toLocaleString());
			const html = `<html lang="en">
					<head>
						<meta charset="utf-8">
						<meta name="viewport" content="width=device-width, initial-scale=1">
						<link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/4.3.1/css/bootstrap.min.css">
						<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.9.0/css/all.min.css" />
						<script src="https://ajax.googleapis.com/ajax/libs/jquery/3.4.0/jquery.min.js"></script>
						<script src="https://cdnjs.cloudflare.com/ajax/libs/popper.js/1.14.7/umd/popper.min.js"></script>
						<script src="https://maxcdn.bootstrapcdn.com/bootstrap/4.3.1/js/bootstrap.min.js"></script>
						<style> 
							img {border: 3px solid #ddd; border-radius: 4px; padding: 5px; width: 100%; } 
						</style> 
					</head>
					<body>
						<h6>${pageTitle}</h6>
						<a target="_blank" href="${urlString}"> ${urlString} </a>
						<p>Timestamp: ${timestamp}</p>
						${getSauceReport()}
						<br/>
						<div>${ screenshot ? screenshot : '<br/>' }</div>
						${getOnlineResourcesReport()}
						<a href="#" onClick="(function(){
							document.querySelectorAll('.step__title_hasContent.long-line')
								.forEach( o => o.click() );
							document.querySelectorAll('.attachment-row__name.long-line')
								.forEach( o => o.click() );
							return false;
						})();return false;">Expand All</a>
					</body>
			</html>`;

			addDescription(html);
		} catch(e){
			//const Pending = require('./../node_modules/mocha/lib/pending.js');
			//context.test.callback(new Pending(`skipped: ${JSON.stringify(e)}`));
		}
		if( process.env.DEBUG && browser.config.maxInstances === 1 && test.error !== undefined ){
			browser.debug();
		}
	},
};
