import ReportAttachmentHelper from './report-attachment-helper';
import Sharp from 'sharp';

export default class ReportAttachmentImageDiff extends ReportAttachmentHelper {

	constructor (diff) {
		super();
		if ( !diff || typeof diff.misMatchPercentage !== 'number' && !diff.folders ) {
			throw new Error('Inproper usage of ReportAttachmentImageDiff, need diff results object');
		}
		this.diff = diff;
	}

	/**
	 * `<img class="img-thumbnail" src="data:image/png;base64, ${this.reduceImageBase64(diff.folders.actual,3)}">`,
	 * @param filename
	 */
	reduceImageData (filename, factor = 3) {
		const base = require('fs').readFileSync(filename);
		const sizeOf = require('image-size');
		const dimensions = sizeOf(filename);
		const getBase64 = async (file, factor) => {
			const imgBuff = await Sharp(base)
				.resize(Math.ceil(dimensions.width / factor), Math.ceil(dimensions.height / factor))
				.trim().toBuffer();
			const buffer = await imgBuff.toString('base64');
			return buffer;
		};
		return {
			filename,
			dimensions,
			base64: browser.call(async function () {
				return await getBase64(filename, factor);
			})
		};
	}

	processDiffFile (diff) {
		return {
			actual: this.reduceImageData(diff.folders.actual),
			diff: this.reduceImageData(diff.folders.diff),
			reference: this.reduceImageData(diff.folders.baseline),
		};
	}

	setDiffImage (filename) {

	}

	setReferenceImage (filename) {

	}

	setActualImage (filename) {

	}

	runReport () {
		const height = 100;
		this.setStyle(`
			* {box-sizing: border-box;}
			.img-comp-container .img-comp-img.img-comp-overlay {
				border-right: 1px solid lightgray;
			}		
			.img-comp-container {
			  position: relative;
			  height: ${height}px;
			}
			.center {
			  display: block; margin: auto;
			}
			.img-comp-img {
			  position: absolute; width: auto; height: auto; overflow: hidden;
			}
			.img-comp-img img {
			  display: block; vertical-align: middle;
			}
			.img-comp-slider {
			  position: absolute;
			  z-index: 9;
			  cursor: ew-resize;
			  width: 40px;
			  height: 40px;
			  background-color: #2196F3;
			  opacity: 0.7;
			  border-radius: 50%;
			}
		`);
		this.setScript(`
			function initComparisons() {
			  var x, i;
			  x = document.getElementsByClassName("img-comp-overlay");
			  for (i = 0; i < x.length; i++) {
				compareImages(x[i]);
			  }
			  function compareImages(img) {
				var slider, img, clicked = 0, w, h;
				w = img.offsetWidth;
				h = img.offsetHeight;
				img.style.width = (w / 2) + "px";
				slider = document.createElement("DIV");
				slider.setAttribute("class", "img-comp-slider");
				img.parentElement.insertBefore(slider, img);
				slider.style.top = (h / 2) - (slider.offsetHeight / 2) + "px";
				slider.style.left = (w / 2) - (slider.offsetWidth / 2) + "px";
				slider.addEventListener("mousedown", slideReady);
				window.addEventListener("mouseup", slideFinish);
				slider.addEventListener("touchstart", slideReady);
				window.addEventListener("touchstop", slideFinish);
				function slideReady(e) {
				  e.preventDefault();
				  clicked = 1;
				  window.addEventListener("mousemove", slideMove);
				  window.addEventListener("touchmove", slideMove);
				}
				function slideFinish() {
				  clicked = 0;
				}
				function slideMove(e) {
				  var pos;
				  if (clicked == 0) return false;
				  pos = getCursorPos(e)
				  if (pos < 0) pos = 0;
				  if (pos > w) pos = w;
				  slide(pos);
				}
				function getCursorPos(e) {
				  var a, x = 0;
				  e = e || window.event;
				  a = img.getBoundingClientRect();
				  x = e.pageX - a.left;
				  x = x - window.pageXOffset;
				  return x;
				}
				function slide(x) {
				  img.style.width = x + "px";
				  slider.style.left = img.offsetWidth - (slider.offsetWidth / 2) + "px";
				}
			  }
			}
			initComparisons();
		`);
		this.setContent(`<p>Pixel Difference: ${this.diff.misMatchPercentage}</p>
			<pre>${JSON.stringify(this.diff, null, '\\t')}</pre>
			<div class="row">
				<div class="col-md-6">
					 <div class="panel>
						 <div class="panel-heading"></div>
							<div class="panel-body">
								<p>Difference</p>
								  <img class="card-img-top" width="${dimensions.width}" height="${dimensions.height}" src="data:image/png;base64, 
									${ require('fs').readFileSync(this.diff.folders.diff).toString('base64') }" />
							</div>
					  </div>
				</div>
				<div class="col-md-6">
					 <div class="panel>
						 <div class="panel-heading"></div>
							<div class="panel-body">
								  <p>Comparison</p>
								<div>
								<div class="img-comp-container">
								  <div class="img-comp-img">
									<img width="${dimensions.width}" height="${dimensions.height}" src="data:image/png;base64, 
										${ require('fs').readFileSync(diff.folders.actual).toString('base64') }" />
								  </div>
								  <div class="img-comp-img img-comp-overlay">
									<img width="${dimensions.width}" height="${dimensions.height}" src="data:image/png;base64, 
										${ require('fs').readFileSync(diff.folders.baseline).toString('base64') }" />
								  </div>
								  </div>
								</div>
							</div>
					  </div>
				</div>
			</div>`);
		super.runReport();
	}
}
