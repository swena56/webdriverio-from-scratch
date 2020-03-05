const BaseDataModel = require('./base-data-model').default;
const fs = require('fs');
const glob = require('glob');
const xml2js = require('xml2js');
const util = require('util');

const ROOT_DIR = 'junit-results';

export default class JunitHelper extends BaseDataModel {
	/**
	 * Read file in
	 * @param data
	 */
	constructor(){
		super();
	}

	async loadFromFile(file){
		const fileData = await this.parseXmlFile(file);
		this.loadData(fileData);
	}

	loadData(data){
		if( ! data ) throw new Error('JunitHelper::loadData is expect data');
		if( data && data['testsuites']['testsuite'] ){
			this.testsuite = data['testsuites']['testsuite'];
			this.details = this.testsuite[0]['$'];
			this.properties = this.testsuite[0]['properties'];
			this.capabilities = this.testsuite[0]['properties'];
			this.specFilename = this.properties.filter( o => o['$']['name'] === 'file' )[0]['$']['value'];
			if( ! this.isValid() ) throw new Error('Invalid or unexpected Junit data');
		}
	}

	isValid(){
		return ( this.testsuite && this.details && this.properties );
	}

	async getFilesInRootDirectory(){
		return await util.promisify(glob)(`${ROOT_DIR}/*.xml`);
	}


	readFile(){
		return this.properties.filter( o => o['$']['name'] === 'file' )[0]['$']['value'];
	}

	deleteJunitFile(file){
		if( file && file.includes(`${ROOT_DIR}/`) && fs.existsSync(file) ){
			fs.unlinkSync(file);
		} else {
			throw new Error('deleteJunitFile failed to delete file');
		}
	};
	getErrorMessages(){

	}

	async deleteJunitTestCasesMatching(spec,cap){
		const fs = require('fs');
		const parser = new xml2js.Parser();
		let tests = glob.sync( 'junit-results/*.xml' );
		let data = [];
		for (let i = 0; i < tests.length; i++) {
			const xml = fs.readFileSync(tests[i]).toString();
			let testCase = await new Promise( (resolve, reject ) => {
				parser.parseString(xml, function (err, result) {
					resolve(result);
					const test = result['testsuites']['testsuite'][0];

					if( test ){
						resolve({
							name: test['testcase'][0]['$']['name'],
							spec: test['properties'][0]['property'].filter( o => o['$']['name'] === 'file' )[0]['$']['value'],
						});
					} else {
						resolve(null);
					}
				});
			});
			await data.push({ file: tests[i], data: testCase});
		}

		const sluggifyCap = this.slugify(cap);
		const deleted = [];
		if( data.length ){
			for (let i = 0; i < data.length ; i++) {
				if( data[i]['data']['spec'] && data[i]['data']['spec'].includes(spec) ){

					if( data[i]['data']['name'] && data[i]['data']['name'].includes(sluggifyCap) ){

						if( data[i]['file'] && data[i]['file'].includes('junit-results/') && fs.existsSync( data[i]['file'] ) ){
							deleted.push(data[i]['file']);
							//fs.unlinkSync(data[i]['file']);
						}
					}
				}
			}
		}

		return await deleted;
	};



};

