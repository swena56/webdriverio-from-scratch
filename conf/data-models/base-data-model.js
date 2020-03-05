const xml2js = require('xml2js');
const glob = require('glob');
const util = require('util');
const fs = require('fs');

export default class BaseDataModel {

	async parseXmlFile(file){
		if( ! file || fs.existsSync(file) ) throw new Error(`BaseDataModel::loadFromFile file does not exist`);
		const xmlString = fs.readFileSync(file).toString();
		const parser = new xml2js.Parser();
		return await util.promisify(parser.parseString.bind(parser))(xmlString);
	}

	slugify(string) {
		return new String(string)
			.toLowerCase()
			.trim()
			.replace(/[^a-zA-Z0-9]/g, '_');
	}

	async fileFetcher(path){
		const results = await util.promisify(glob)(path);
		return results;
	}

	getFileData(file){
		if( ! file || ! fs.existsSync(file) ) return null;
		return fs.readFileSync(file).toString();
	}

	doesFileContainString(file, string){
		if( ! string ) throw new Error(`Invalid String: ${string}`);
		const fileData = this.getFileData(file);
		if( ! fileData ) return false;
		return !! fileData.includes(string);
	}

	doesFileContainAllStrings(file, ...strings ){
		const fileData = this.getFileData(file);
		if( fileData ){
			for (let i = 0; i < strings.length; i++) {
				if( ! fileData.includes(strings[i]) ){
					return false;
				}
			}
			return true;
		}
		return false;
	}
}
