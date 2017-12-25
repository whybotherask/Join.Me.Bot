

const chrono = require('chrono-node')


var c = chrono.parse('today from 12:00 - 5:00');
console.log( c[0].start.date().toString() );
console.log( c[0].end.date().toString() );

function fcns = {
	'book' 		: addBooking,
	'list' 		: displayBookings,
	'see all' 	: displayBookings,
	'cancel' 	: cancelBooking
}

function addBooking() {
	console.log('book')
}

function displayBookings() {
	console.log('display')
}

function cancelBooking() {
	console.log('cancel')
}

function cancelBooking() {
	console.log('cancel')
}




module.exports = {
	parse: function (reqBody) {
		var message = reqBody.text;
		var username = reqBody.user_name;

		var command = message.split(' ').toLowerCase();

		switch ( message.split(' ').toLowerCase() ) {
			case 'book': 


			case ' ':

			case ' ':

		}

	}, // end parse


} // end export


