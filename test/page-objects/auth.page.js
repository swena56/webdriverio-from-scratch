// import BasePage from './base.page';

class Auth {
	get USERNAME () { return $('#user-name'); }
	get PASSWORD () { return $('#password'); }
	get SUBMIT () { return $('.btn_action'); }
	get ERROR_BUTTON () { return $('.error-button'); }

	login (username, password) {
		this.USERNAME.setValue(username);
		this.PASSWORD.setValue(password);
		this.SUBMIT.click();
		expect( this.ERROR_BUTTON.isExisting() ).to.equal(false,
			'Detected login failure');
	}

	loginWithStandardUser () {
		this.login('standard_user', 'secret_sauce');
	}

	submitWithEnter () {
		browser.keys(['Enter']);
		this.waitForPageLoad();
	}
}

module.exports = new Auth();
