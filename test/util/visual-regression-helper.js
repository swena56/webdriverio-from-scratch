import Utility from './utility';
import allureReporter from '@wdio/allure-reporter';
import { removableElements, defaultFolder } from '../../conf/visual-regression.conf';
import BasePage from '../page-objects/base.page';
import Sharp from 'sharp';
import fs from 'fs';

const severityWeight = parseFloat(process.env.VISUAL_SEVERITY_WEIGHT || 1.0);

/**
 * VisualRegressionHelper
 *
 * - configuration: conf/visual-regression.conf.js -> wdio.conf.js
 * - remove highlights
 * - element/fullpage screenshot settings (type,enabled/disabled,allowed diff)
 * - manages allowed diff settings
 *
 * Resources
 * - https://github.com/wswebcreation/webdriver-image-comparison/blob/master/docs/OPTIONS.md#plugin-options
 */
class VisualRegressionHelper extends BasePage {

	get FULL_ALLOWED_DIFF_DEFAULT () { return 10.00; }
	get ELEMENT_ALLOWED_DIFF_DEFAULT () { return 0.00; }

	constructor () {
		super();
		this.setAllowedDiff( parseFloat(process.env.ALLOWED_DIFF) || this.ELEMENT_ALLOWED_DIFF_DEFAULT );
		this.setAllowedDiffFull( parseFloat(process.env.ALLOWED_DIFF) || this.FULL_ALLOWED_DIFF_DEFAULT );
		this.visualEnabled = !!( process.env.VISUAL && process.env.VISUAL !== 'false' );
		this.assertionDisabled = false;
		this.disableFullPage = true;
		this.fileIdentifier = '';
	}

	setAllowedDiff (allowedDiff = this.ELEMENT_ALLOWED_DIFF_DEFAULT ) {
		expect(allowedDiff).to.be.a('number');
		if (browser.capabilities && browser.capabilities.platformName && browser.capabilities.platformName.toLowerCase() === 'ios') {
			allowedDiff += 0.6;
		}
		this.allowedDiff = allowedDiff;
		this.elementsVisuallyChecked = [];
		return this;
	}

	// not used
	setAllowedDiffFull (allowedDiffFullPage = this.FULL_ALLOWED_DIFF_DEFAULT ) {
		expect(allowedDiffFullPage).to.be.a('number');
		if (browser.capabilities && browser.capabilities.platformName && browser.capabilities.platformName.toLowerCase() === 'ios') {
			allowedDiffFullPage += 0.6;
		}
		this.allowedDiffFullPage = allowedDiffFullPage;
		return this;
	}

	setVisualId (id) {
		this.fileIdentifier = id;
	}

	hideElements () {
		browser.execute(`$('${removableElements.join(',')}').hide()`);
		browser.pause(3000);
	}

	verifyVisualFullPage ( identifier, allowedDiff ) {
		if ( !this.visualEnabled && typeof allowedDiff !== 'number' ) return;

		const urlString = browser.getUrl();
		const filename = Utility.slugify(
			['full',
				require('url').parse(urlString).pathname,
				this.getOsAndBrowserInformation(),
				this.viewSize,
				this.fileIdentifier,
				identifier,
			].filter(Boolean).join('-')
		);

		this.startStep(`visual full: ${filename}`);

		browser.removeHighlights();
		this.hideElements();

		const diff = this.catchError(function () {
			const matches = require('glob').sync(`./${defaultFolder}/reference/${filename}*.png`);
			const freshReference = matches.length && fs.existsSync(matches[0]);
			const diff = browser.checkFullPageScreen(filename);
			this.waitForFileToExist(diff.folders.baseline);
			diff.freshReference = freshReference;
			diff.currentUrl = urlString;
			diff.fullId = filename;
			diff.location = '< unknown element location >';
			diff.size = '< TODO get window size >';
			diff.freshReference = freshReference;
			this.runImageComparisonAttachment(diff, allowedDiff);
			return this.updateDiffFilename(diff);
		}, { severityLevel: 0, message: 'catch error has failed' });

		this.endStep(
			this.isMisMatchBelowAllowedDiff(
				diff, allowedDiff, filename
			)
		);
	}

	/**
	 * Prepends the widgetsview version to the diff file
	 */
	updateDiffFilename (diff) {
		if ( diff && diff.folders && diff.folders.diff && fs.existsSync(diff.folders.diff) ) {
			if ( $('.widget-container').isExisting() && $('.widget-container').getAttribute('data-version') ) {
				const path = require('path');
				const dirname = path.dirname(diff.folders.diff);
				const basename = path.basename(diff.folders.diff);
				if ( dirname && basename ) {
					diff.widgetsViewVersion = $('.widget-container').getAttribute('data-version') || '';
					const newFile = `${dirname}/${diff.widgetsViewVersion}-${basename}`;
					fs.renameSync(diff.folders.diff, newFile);
					diff.folders.diff = newFile;
					console.log('widgetsViewVersion', newFile);
				}
			}
		}
		return diff;
	}

	waitForHtmlConsistency (element) {
		this.addStep('wait for html consistency', function () {
			let count = 0;
			while ( element.isExisting() && count < 5 ) {
				const original = element.getHTML();
				element.scrollIntoView();
				element.waitForDisplayed(5000);
				browser.pause(100);
				if ( element.getHTML() === original ) {
					break;
				}
				count++;
				console.log('waitForHtmlConsistency', count);
			}
		}, 0);
	}

	waitForFileToExist (file) {
		if ( file ) {
			browser.waitUntil(
				() => {
					return fs.existsSync(file) && Utility.getFilesizeInBytes(file) > 0;
				},
				undefined,
				`file: ${file} does not exist`
			);
		}
	}

	processDiffFile (diff) {
		expect( diff ).to.exist;
		expect( diff.misMatchPercentage ).to.be.a('number');
		expect( diff.folders.actual ).to.exist;
		expect( fs.existsSync( diff.folders.actual ) ).to.equal(true,
			'Actual screenshot does not exist');
		expect( diff.folders.baseline ).to.exist;
		expect( fs.existsSync( diff.folders.baseline ) ).to.equal(true,
			'Baseline screenshot does not exist');
		return {
			actual: this.reduceImageData(diff.folders.actual, `actual: ${diff.fileName}`),
			diff: this.reduceImageData(diff.folders.diff),
			reference: this.reduceImageData(diff.folders.baseline, `reference: ${diff.fileName}`),
		};
	}

	/**
	 * `<img class="img-thumbnail" src="data:image/png;base64, ${this.reduceImageBase64(diff.folders.actual,3)}">`,
	 * https://sharp.readthedocs.io/en/v0.11.1/api/#png
	 * @param filename
	 */
	reduceImageData (filename) {
		const fs = require('fs');
		const base = fs.readFileSync(filename);
		const sizeOf = require('image-size');
		const dimensions = sizeOf(filename) || { height: 0, width: 0, type: 'png' };
		const getBase64 = async (file, quality = 35) => {
			try {
				const imgBuff = await Sharp(base, {}).jpeg({ quality }).toBuffer();
				return await imgBuff.toString('base64');
			} catch (e) {
				return '';
			}
		};
		if ( fs.existsSync(filename) ) {
			return {
				filename,
				dimensions,
				base64: browser.call(async function () {
					return await getBase64(filename);
				})
			};
		}
	}

	getOsAndBrowserInformation () {
		const cap = browser.config.capabilities;
		if ( process.env.SAUCE ) {
			return [
				cap.deviceName,
				cap.browserName,
				cap.browserVersion,
				cap.platformName,
				cap.platformVersion,
				cap.deviceOrientation,
			].filter(Boolean)
				.join('-')
				.replace(/\s+/g, '-')
				.trim()
				.toLowerCase();
		}
		// adds further customization in labeling the headless browser
		if ( cap.browserName === 'chrome' ) {
			const extraDetails = cap['goog:chromeOptions'].args.filter( o => o.startsWith('--details=') )[0];
			return `${cap.browserName}-${extraDetails.split('=')[1]}`.replace('"', '');
		}
		return JSON.stringify(cap);
	}

	verifyVisual (element, ...identifiers ) {
		const fileDescriptors = [
			this.fileIdentifier,
			...identifiers,
			this.getOsAndBrowserInformation(),
			this.viewSize,
		].filter(Boolean).join('-');

		const fullId = Utility.slugify(fileDescriptors);

		if ( this.visualEnabled && element && element.isExisting() && !this.elementsVisuallyChecked.includes(fullId) ) {
			this.elementsVisuallyChecked.push(fullId);

			browser.removeHighlights();
			this.hideElements();
			this.existenceStep(element, 'missing element', 1);
			this.waitForHtmlConsistency(element);

			const currentUrl = browser.getUrl();

			const matches = require('glob').sync(`${defaultFolder}/reference/${fullId}*.png`);
			const freshReference = !( matches.length && require('fs').existsSync(matches[0]) );

			let diff = browser.checkElement(element, fullId);
			this.waitForFileToExist(diff.folders.baseline);
			diff.fullId = fullId;
			diff.freshReference = freshReference;
			diff.currentUrl = currentUrl;
			diff.location = element.getLocation() || '< unknown element location >';
			diff.size = element.getSize() || '< unknown element size >';
			expect( diff.size.height ).to.exist.and.be.above(0);
			expect( diff.size.width ).to.exist.and.be.above(0);
			this.runImageComparisonAttachment(diff, this.allowedDiff);
			diff = this.updateDiffFilename(diff);
			this.endStep(
				this.isMisMatchBelowAllowedDiff(
					diff, this.allowedDiff, fullId
				)
			);
		}
		return this;
	}

	isMisMatchBelowAllowedDiff (diff, allowedDiff, performAssertion = false) {
		if ( diff && typeof diff.misMatchPercentage === 'number' ) {
			const status = diff.misMatchPercentage <= allowedDiff;

			if ( performAssertion && !this.assertionDisabled ) {

				// delete diff file when below allowed diff threshold
				if ( diff.misMatchPercentage < allowedDiff && fs.existsSync(diff.folders.diff) ) {
					fs.unlinkSync(diff.folders.diff);
				}

				// delete actual screenshot when it is the same as the baseline ( reference )
				if ( diff.misMatchPercentage === 0 && fs.existsSync(diff.folders.actual)) {
					fs.unlinkSync(diff.folders.actual);
				}

				this.addStep('visual pixel mismatch threshold check', function () {
					expect(status).to.equal(true,
						`pixel mismatch percentage of ${diff.misMatchPercentage} is greater than the threshold of ${allowedDiff}. ${performAssertion}`
					);
				}, severityWeight);
			}

			return status;
		}
		return false;
	}

	htmlAttachment (title, html) {
		allureReporter.addAttachment(
			title || 'Attachment',
			`<html lang="en">
				<head>
					<meta charset="utf-8">
					<meta name="viewport" content="width=device-width, initial-scale=1">
					<link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/4.3.1/css/bootstrap.min.css">
					<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.9.0/css/all.min.css" />
					<script src="https://ajax.googleapis.com/ajax/libs/jquery/3.4.0/jquery.min.js"></script>
					<script src="https://cdnjs.cloudflare.com/ajax/libs/popper.js/1.14.7/umd/popper.min.js"></script>
					<script src="https://maxcdn.bootstrapcdn.com/bootstrap/4.3.1/js/bootstrap.min.js"></script>
				</head>
				<body>
					<div>${html}</div>
				</body>
			</html>`,
			'text/html'
		);
	}

	runImageComparisonAttachment ( diff, allowedDiff ) {
		if ( typeof allowedDiff !== 'number' ||
			!diff ||
			!diff.folders ||
			typeof diff.misMatchPercentage !== 'number' ||
			diff.folders.baseline.includes('full-page') ) {
			return;
		}
		try {
			if (diff.folders.diff && diff.misMatchPercentage > 0 ) {
				const data = this.processDiffFile(diff);
				console.log(
					`${require('chalk').red('[Visual]')} (diff: ${diff.misMatchPercentage}%)`,
					require('chalk').yellow(`./${defaultFolder}/actual/${diff.fileName}`),
					require('chalk').blue(`./${defaultFolder}/diff/${diff.fileName}`),
				);
				allureReporter.addAttachment(
					`Visual Regression Detected (${diff.misMatchPercentage}): ${diff.fullId}`,
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
						* {box-sizing: border-box;}
						.img-comp-container .img-comp-img.img-comp-overlay {
							border-right: 1px solid lightgray;
						}
						.img-comp-container {
						  position: relative;
						  height: ${data.diff.dimensions.height}px;
						}
						.center {
						  display: block;
						  margin: auto;
						  margin: auto;
						  width: 50%;
						}
						.img-comp-img {
						  position: absolute;
						  width: auto;
						  height: auto;
						  overflow: hidden;
						}
						.img-comp-img img {
						  display: block;
						  vertical-align: middle;
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
					</style>
				</head>
				<body>
					<div>
						 <div class="panel">
								 <div class="panel-heading">
									<h3>${diff.fullId}</h3>
									<p> <i style="color: red;" class="fas fa-times-circle">
										</i> Pixel Difference: ${diff.misMatchPercentage} (${allowedDiff})
										<span>location: ${JSON.stringify(diff.location) || ''}</span>
										<span>size: ${JSON.stringify(diff.size) || ''}</span>
									</p>
									<p> <a href="${diff.currentUrl}">${diff.currentUrl}</a> </p>
								 </div>
								<div class="panel-body">
									<img width="${data.diff.dimensions.width}"
										height="${data.diff.dimensions.height}"
										src="data:image/png;base64, ${data.diff.base64}" />
								</div>
						 </div>
							<br/>
							 <div class="panel">
								 <div class="panel-heading"><h6> Comparison </h6></div>
									<div class="panel-body">
										<div class="img-comp-container">
										  <div class="img-comp-img">
											<img width="${data.reference.dimensions.width}"
												height="${data.reference.dimensions.height}"
												src="data:image/png;base64, ${data.reference.base64}" />
										  </div>
										  <div class="img-comp-img img-comp-overlay">
											<img width="${data.actual.dimensions.width}"
												height="${data.actual.dimensions.height}"
												src="data:image/png;base64, ${data.actual.base64}" />
										  </div>
										</div>
									</div>
							 </div>
						</div>
						<script>
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
							</script>
					</div>
				</body>
			</html>`,
					'text/html'
				);
			} else {
				console.log(
					`${require('chalk').green('[Visual]')} (diff: ${diff.misMatchPercentage}%)`,
					require('chalk').yellow(`./${defaultFolder}/reference/${diff.fileName}`),
				);
				const referenceScreenshot = this.reduceImageData(diff.folders.actual, `actual: ${diff.fileName}`);
				const title = diff.freshReference ? `New Reference: ${diff.fullId}` : `✓ No diff: ${diff.fullId}`;
				allureReporter.addAttachment(
					title,
					`<html lang="en">
					<head>
						<meta charset="utf-8">
						<meta name="viewport" content="width=device-width, initial-scale=1">
						<link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/4.3.1/css/bootstrap.min.css">
						<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.9.0/css/all.min.css" />
						<script src="https://ajax.googleapis.com/ajax/libs/jquery/3.4.0/jquery.min.js"></script>
						<script src="https://cdnjs.cloudflare.com/ajax/libs/popper.js/1.14.7/umd/popper.min.js"></script>
						<script src="https://maxcdn.bootstrapcdn.com/bootstrap/4.3.1/js/bootstrap.min.js"></script>
					</head>
					<body>
						<div>
							<p><i style="color: green;" class="fas fa-check-square"></i> Pixel Difference: ${diff.misMatchPercentage || 0}</p>
							<div class="row">
								<div class="col-md-6">
									 <div class="panel>
										 <div class="panel-heading"></div>
											<div class="panel-body">
												<img class="img-thumbnail"
													src="data:image/png;base64, ${referenceScreenshot.base64}"/>
											</div>
									  </div>
								</div>
							</div>
						</div>
					</body>
				</html>`,
					'text/html'
				);
			}
		} catch (e) {
			this.htmlAttachment('Visual Diff Error', `<div>
					Error Running Attachment
				</div>`);
		}
	}
}
export default new VisualRegressionHelper();
