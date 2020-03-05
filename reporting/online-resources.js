const getOnlineResourcesReport = () => {
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

module.exports = {
	getOnlineResourcesReport,
};