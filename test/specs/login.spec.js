import Auth from './../page-objects/auth.page';

describe( `${require('path').basename(__dirname)}/${require('path').basename(__filename)}`, function () {

	beforeEach(() => {
		browser.url('/');
	});

	it('login', function () {
		Auth.login('automation-workshop', 'SauceDayMSP2020');
	});

	it('standard user', function () {
		Auth.login('standard_user', 'secret_sauce');
		$('#shopping_cart_container').waitForExist();
		expect( browser.getTitle() ).to.equal('/inventory.html');
	});
});
