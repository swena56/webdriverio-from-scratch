import Sharp from 'sharp';

export default class ImageHelper {

	get html () {
		return `<img class="card-img-top" 
			width="${this.dimensions.width}" 
			height="${this.dimensions.height}" 
			src="data:image/png;base64, ${ this.base64 }" 
		/>`;
	}

	get base64 () {
		// expect(this.buffer && Buffer.isBuffer(this.buffer)).to.equal(true,'Invalid image buffer');
		return this.buffer.toString('base64');
	}

	constructor (filename) {
		if ( !require('fs').existsSync(filename) ) {
			throw new Error(`Image ${filename} does not exist`);
		}
		const sizeOf = require('image-size');
		this.dimensions = sizeOf(filename);
		this.filename = filename;
		this.buffer = require('fs').readFileSync(this.filename);
	}

	processThumbnail () {

	}

	saveScreenShot () {

	}

	reduceSize ( height = 500 ) {
		this.buffer = new Promise( async function (res, rej) {
			await Sharp(this.filename)
				.resize(null, height)
				.png({ quality: 10, adaptiveFiltering: true })
				.toBuffer(function (err, buffer) {
					if (err) rej(err);
					res(buffer);
				});
		}).catch((error) => console.log(error));
		return this;
	}

	addTextOverlay (text) {

	}

	removeTransparent () {
		// await sharp(input)
		// 	.resize(width, height)
		// 	.png()
		// 	.trim()
		// 	.toFile(output);
	}

	reduce (factor) {
		const getBase64 = async (file, factor) => {
			const imgBuff = await Sharp(this.buffer)
				.resize(Math.ceil(this.dimensions.width / factor), Math.ceil(this.dimensions.height / factor))
				.trim().toBuffer();
			const buffer = await imgBuff.toString('base64');
			return buffer;
		};
		return {
			filename: this.filename,
			dimensions: this.dimensions,
			base64: browser.call(async function () {
				return await getBase64(this.filename, factor);
			})
		};
	}
}
