describe( `${require('path').basename(__dirname)}/${require('path').basename(__filename)}`, function () {
	it('valid title', function () {
		browser.url('/');
		expect( browser.getTitle() ).to.equal('Swag Labs', 'Invalid Title');
	});
});
