import Utility from './utility';
import ImageHelper from './image-helper';
import allureReporter from '@wdio/allure-reporter';

export default class ReportAttachmentHelper {

	constructor () {
		this.seed = Utility.generateUUID(8);
		this.title = 'default title';
		this.rows = [];
		this.style = '';
		this.script = '';
	}

	setTitle (titleString) {
		this.title = titleString;
		return this;
	}

	setStyle (styleString) {
		this.style = styleString;
		return this;
	}

	setScript (scriptString) {
		this.script = scriptString;
		return this;
	}

	setContent (contentString) {
		this.content = contentString;
		return this;
	}

	addImage (imageFile) {
		const image = new ImageHelper(imageFile);
		const html = `<figure>
				<img class="card-img-top" 
					width="${image.dimensions.width}"
					height="${image.dimensions.height}" 
					src="data:image/png;base64, ${ require('fs').readFileSync(imageFile).toString('base64') }" />
				<figurecaption>
					${imageFile} - ${JSON.stringify(image.dimensions)}
				</figurecaption>	
		</figure>`;
		this.rows.push(html);
		return this;
	}

	runReport () {
		allureReporter.addAttachment(
			this.title,
			`<html lang="en">
				<head>
				<meta charset="utf-8">
				<meta name="viewport" content="width=device-width, initial-scale=1">
				<link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/4.3.1/css/bootstrap.min.css">
				<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.9.0/css/all.min.css" />
				<script src="https://ajax.googleapis.com/ajax/libs/jquery/3.4.0/jquery.min.js"></script>
				<script src="https://cdnjs.cloudflare.com/ajax/libs/popper.js/1.14.7/umd/popper.min.js"></script>
				<script src="https://maxcdn.bootstrapcdn.com/bootstrap/4.3.1/js/bootstrap.min.js"></script>
				<style>
					${this.style || ''}
				</style> 
				</head>
				<body>
					${this.content || '<br/>'}
					<script>${this.script | ''}</script>
				</body>
			</html>`,
			'text/html'
		);
	}
}
