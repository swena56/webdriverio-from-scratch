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

module.exports = {
	getSauceReport,
};