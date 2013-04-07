module("Util");

test("JQuery and basic requirements", 7, function() {
	ok(Array.prototype.push, "Array.push()");
	ok(Function.prototype.apply, "Function.apply()");
	ok(document.getElementById, "getElementById");
	ok(document.getElementsByTagName, "getElementsByTagName");
	ok(RegExp, "RegExp");
	ok(jQuery, "jQuery");
	ok($, "$");
});

test("UUID", 2, function() {
	var util = new app.crypto.Util(window, uuid);
	var id = util.UUID();
	ok(id, "UUID: " + id);
	ok(id.length === 36, "UUID length");
});

test("random", 3, function() {
	var util = new app.crypto.Util(window, uuid);
	var base64 = util.random(128);
	var str = window.atob(base64);
	ok(base64, "Random base64: " + base64);
	ok(str, "Random binary string: " + str);
	ok(str.length === 16, "Random length");
});

test("Parse Date", 1, function() {
	var util = new app.crypto.Util(window, uuid);
	var str = '1900-01-31 18:17:53';
	var date = util.parseDate(str);
	var formated = util.formatDate(date);
	equal(formated, str, "Date: " + date);
});

test("String -> Uint8Array -> String", 3, function() {
	var util = new app.crypto.Util(window);

	var input = "asdf";
	var buf = util.binStr2Uint8Arr(input);
	ok(buf);

	// test slow conversion in js
	var binStr = util.uint8Arr2BinStr(buf);
	ok(binStr);
	equal(binStr, input);
});