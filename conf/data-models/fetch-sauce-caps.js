/**
 * Example:
 * 		const fetchSauceCaps = require('./fetch-sauce-caps').fetchSauceCaps;
 * 		fetchSauceCaps.applyFilter(process.env.SAUCE).list;
 */
class FetchSauceCaps {
	constructor(){
		this.listData = this.verifyListData(require('../caps/sauce.caps').caps);
		this.listData = this.listData.filter( o => ! o.broken );
		const argv = require('yargs').parse();
		if( argv['sv'] ) this.listData = this.listData.filter( o => o.view === '@sv' );
		if( argv['lv'] ) this.listData = this.listData.filter( o => o.view === '@lv' );
		this.limit = argv['limit'] ? argv['limit'] : null;
		this.list = this.listData.map( o => o.cap );
	}

	/**
	 * Quick Check to make sure the sauce.caps.js file ( a heavily modified file ) is clean and in the right format
	 * @param data
	 * @returns {*}
	 */
	verifyListData(data){
		const assert = require('assert');
		for (let i = 0; i < data.length; i++) {
			const message = `verifyListData has detected missing caps data: ${JSON.stringify(data[i])}, modify the list accordingly`;
			const cap = data[i]['cap'];
			assert.ok( data[i]['view'], message );
			//check if view size is @lv or @sv
			assert.ok( data[i]['keywords'], message );
			//assert.ok( data[i]['build'], message );
			assert.ok( data[i]['notes'], message );
			assert.ok( cap, message );
			assert.ok( cap['browserName'], message );
		}
		return data;
	}

	getAllCaps(){
		return this.listData.map( o => o.cap );
	}

	applyExclusionRules(){

	}

	getCapString(cap){
		return [
			cap['deviceName'],
			cap['browserName'],
			cap['browserVersion'],
			cap['platformName'],
			cap['platformVersion'],
			cap['deviceOrientation'],
		].filter(Boolean)
			.join('-')
			.replace(/\s+/g, '-')
			.trim()
			.toLowerCase();
	}

	getViewSize(cap){
		if( ! cap ){
			cap = browser.capabilities;
		}
		return this.map.get(this.getCapString(cap))['view'];
	}

	listToLog(){
		const logger = require('@wdio/logger').default;
		logger(`SAUCE - Available Caps: ${this.list.length}`).error(
			require('chalk').green(JSON.stringify(this.list,null,'\t'))
		);
	}

	printList(exitAfter=false){
		this.map = this.getSearchMap();
		const keys = Array.from( this.map.keys() );
		const logger = require('@wdio/logger').default;
		logger(`Condensed Caps List ${keys.length}`).error(
			require('chalk').green(JSON.stringify(keys,null,'\t'))
		);
		if( exitAfter ) process.exit(1);
		return keys;
	}

	/**
	 * Will reset list each time it is run
	 * @param filterString
	 * @returns {FetchSauceCaps}
	 */
	applyFilter(filterString){
		const filter = filterString.split(',').map( o => new String(o).toLowerCase().trim() );

		this.map = this.getSearchMap();
		const keysArray = Array.from( this.map.keys() );

		if( filterString === 'all' ){
			this.list = this.getAllCaps();
			return this;
		}

		//get unique matches
		let results = [];
		for (let i = 0; i < filter.length ; i++) {
			const match = new String(filter[i]).trim().toLowerCase();
			if( match ){
				results = [
					...new Set([
						...results,
						...keysArray.filter( o => o.includes(match) ),
					])
				];
			}
		}

		this.list = results.map( o => this.map.get(o)['cap'] );
		if( this.limit && this.limit > 0 ){
			this.list = this.list.slice(0,this.limit);
		}

		return this;
	}

	getSearchMap(){
		this.processSearchStrings();
		const map = new Map();
		for (let i = 0; i < this.listData.length; i++) {
			map.set(this.listData[i]['searchString'],this.listData[i]);
		}
		return map;
	}

	processSearchStrings(){
		for (let i = 0; i < this.listData.length; i++) {
			const cap = this.listData[i]['cap'];
			const searchString = [
				cap['deviceName'],
				cap['browserName'],
				cap['browserVersion'],
				cap['platformName'],
				cap['platformVersion'],
				cap['deviceOrientation'],
			].filter(Boolean)
				.join('-')
				.replace(/\s+/g, "-")
				.trim()
				.toLowerCase();
			this.listData[i]['searchString'] = searchString;
		}
	}

	checkCapsExclusionRules(cap){
		//TODO might be done differently
	}
}

exports.fetchSauceCaps = new FetchSauceCaps();
