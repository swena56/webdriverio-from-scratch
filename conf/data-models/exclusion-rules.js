const BaseDataModel = require('./base-data-model').default;
const glob = require('glob');
const util = require('util');
const fs = require('fs');

const TEST_WILDCARD_GLOB = './test/**/*.spec.js';

/**
 * Example:
 *	 const exclusionRules = await new ExclusionRules(`[
 *		{ "test": "", "from": "all", "because": "Missing spec data" },
 *	 ]`);
 */
export default class ExclusionRules extends BaseDataModel {

	get length(){ return this.data.length || 0; }

	constructor(rulesString){
		super();
		this.loadExclusionRules(rulesString);
	}

	loadExclusionRules(rulesString){
		const parsed = this.parseRules(rulesString);
		this.data = this.verifyData(parsed);
	}

	parseRules(rulesString){
		try {
			return JSON.parse(new String(rulesString).trim());
		} catch(e){
			throw new Error('Problem parsing exclusion rules');
		}
	}

	getRules(index=undefined){
		if( index !== undefined ){
			return this.data[index];
		} else {
			return this.data;
		}
	}

	grabCapStrings(){
		const fetchSauceCaps = require('./fetch-sauce-caps').fetchSauceCaps;
		const capsMap = fetchSauceCaps.getSearchMap();
		return Array.from( capsMap.keys() );
	};

	/**
	 * Does each file exist
	 * Does each of the caps match up to a real cap
	 */
	verifyData(data){
		if( ! Array.isArray(data) ){
			throw new Error('JSON Exclusion Rules need to be an array of json');
		}
		const caps = this.grabCapStrings();
		for (let i = 0; i < data.length; i++) {
			const matches = glob.sync(data[i]['test']);
			const fromArray = new String(data[i]['from']).split(',').map( o => o.trim().toLowerCase() );
			let capMatches = [];
			for (let j = 0; j < fromArray.length; j++) {
				capMatches.push(...caps.filter( o => o.includes(fromArray[j] ) ));
			}
			if( data[i]['from'] === 'all') {
				capMatches = caps;
			}
			data[i]['matches'] = {
				test: matches,
				from: [ ... new Set(capMatches) ],
			};
		}
		return data;
	}

	getMergedList(){
		let merged = [];
		for (let i = 0; i < this.data.length; i++) {
			let tmp = [];
			const matches = this.data[i]['matches'];
			if( ! matches.from || ! matches.from.length ) continue;
			if( ! matches.test || ! matches.test.length ) continue;
			for (let j = 0; j < matches['test'].length; j++) {
				for (let k = 0; k <  this.data[i]['matches']['from'].length; k++) {
					if( this.data[i]['matches']['test'][j] && this.data[i]['matches']['from'][k]  ){
						tmp.push( { test: this.data[i]['matches']['test'][j], from: this.data[i]['matches']['from'][k] } );
					}
				}
			}
			merged = [ ...tmp, ...merged ];
		}
		return [ ... new Set(merged) ];
	}

	async checkJunitForMatches(fileGlob = 'junit-results/*.xml', deleteFile = false ){
		const results = [];
		const junitTestCases = await util.promisify(glob)(fileGlob);
		const mergedList = this.getMergedList();

		for (let i = 0; i < junitTestCases.length; i++) {
			for (let j = 0; j < mergedList.length; j++) {
				const file = require('path').basename(mergedList[j]['test']);
				const cap = this.slugify(mergedList[j]['from']);
				if( await this.doesFileContainAllStrings(junitTestCases[i],file,cap) ){
					await results.push(junitTestCases[i]);
					if( deleteFile && fs.existsSync(junitTestCases[i]) ){
						await fs.unlinkSync(junitTestCases[i]);
					}
				}
			}
		}
		return results;
	}

	async checkAllureForMatches(fileGlob = 'allure-results/*.xml', deleteFile = false ){
		const results = [];
		const junitTestCases = await util.promisify(glob)(fileGlob);
		const mergedList = this.getMergedList();

		for (let i = 0; i < junitTestCases.length; i++) {
			for (let j = 0; j < mergedList.length; j++) {
				const file = require('path').basename(mergedList[j]['test']);
				const cap = mergedList[j]['from'];
				if( await this.doesFileContainAllStrings(junitTestCases[i],file,cap) ){
					await results.push(junitTestCases[i]);
					if( deleteFile && fs.existsSync(junitTestCases[i]) ){
						await fs.unlinkSync(junitTestCases[i]);
					}
				}
			}
		}
		return results;
	}
}
