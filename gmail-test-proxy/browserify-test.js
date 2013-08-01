'use strict';

var inbox = require('inbox');

var client = inbox.createConnection(false, "imap.gmail.com", {
	secureConnection: true,
	auth: {
		XOAuth2: {
			user: "safewithme.testuser@gmail.com",
			clientId: "440907777130.apps.googleusercontent.com",
			accessToken: "ya29.AHES6ZTVj9_kCdP8zEYCA9OZ6fvTqT_TmCe4UsmYPF3ffYM8eGHX2uw"
		}
	}
	// auth: {
	// 	user: "safewithme.testuser@gmail.com",
	// 	pass: "hellosafe"
	// }
});

console.log("Connecting to server...");
client.connect();

client.on("connect", function() {

	console.log("Connected!");

	// client.openMailbox("INBOX", function(error, mailbox) {
	// 	if (error) throw error;

	// 	// List newest 10 messages
	// 	client.listMessages(-10, function(err, messages) {
	// 		console.log("Listing messages server...");
	// 		messages.forEach(function(message) {
	// 			console.log(message.UID);
	// 			// client.createMessageStream(message.UID).pipe(process.stdout, {
	// 			// 	end: false
	// 			// });
	// 		});

	// 		client.close();
	// 	});
	// });
});

// client.on('error', function(err) {
// 	console.log('Error');
// 	console.log(err)
// });

// client.on('close', function() {
// 	console.log('DISCONNECTED!');
// });