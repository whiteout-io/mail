module("Util");

test("JQuery and basic requirements", 7, function() {
	ok( Array.prototype.push, "Array.push()" );
	ok( Function.prototype.apply, "Function.apply()" );
	ok( document.getElementById, "getElementById" );
	ok( document.getElementsByTagName, "getElementsByTagName" );
	ok( RegExp, "RegExp" );
	ok( jQuery, "jQuery" );
	ok( $, "$" );
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
	var date = util.parseDate('1900-01-31 18:17:53');
	ok(date, "Date: " + date);
});

test("String -> ArrayBuffer -> String", 3, function() {
	var util = new app.crypto.Util(window);
	
	var input = "asdf";
	var buf = util.binStr2ArrBuf(input);
	ok(buf);
	
	// test slow conversion in js
	var binStr = util.arrBuf2BinStr(buf);
	ok(binStr);
	equal(binStr, input);
	
	// // test native conversion with BlobBuilder Api
	// var blob = util.arrBuf2Blob(buf, 'application/octet-stream');
	// ok(blob);
	// 
	// util.blob2BinStr(blob, function(output) {
	// 	equal(output, input);
	// 
	// 	start();
	// });
});
