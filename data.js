


var Moment = require('moment')


var Database = {}

// schedules is an object of days, with each day containing the times that are booked
Database._schedules = {
	'2018-02-10': {},
	'2018-03-01': {},
}

Database._schedules['2018-02-10'] = [
	{
		start_date: '2018-02-10',
		start_time: '08:30',
		end_date: '2018-02-10',
		end_time: '09:00', 
		user_name: 'Megan'
	},{
		start_date: '2018-02-10',
		start_time: '09:10',
		end_date: '2018-02-10',
		end_time: '10:30',
		user_name: 'Avi'
	},{
		start_date: '2018-02-10',
		start_time: '15:00',
		end_date: '2018-02-10',
		end_time: '16:00',
		user_name: 'Anita'
	},{

	}
]


function print (format) {
	Database._schedules['2018-02-10'].forEach( (booking)=>{
		if (! booking.start_date || ! booking.start_time 
			|| !booking.end_date || !booking.end_time) 
			return;

		var disFormat 	= format || 'YYYY-MM-DD HH:mm';
		var starttime 	= Moment( booking.start_date + ' ' + booking.start_time ).format(disFormat);
		var endtime 	= Moment( booking.end_date + ' ' + booking.end_time 	).format(disFormat);
		var user 		= booking.username;
		console.log( starttime + " - " + endtime + " " + booking.user_name );
	});
}

function get(date) {
	if (!date) return Database._schedules;
	return Database._schedules[date];
}

exports.print = print;
exports.get = get;


