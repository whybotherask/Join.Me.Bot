


const Moment = require('moment')
const _ = require('underscore')


var Database = {}

Database['havastorux'] = {
	'2018-02-10': {},
	'2018-03-01': {},
}
Database['havastorux1'] = {
	'2018-02-10': {},
	'2018-03-01': {},
}
Database['havastorux2'] = {
	'2018-02-10': {},
	'2018-03-01': {},
}

Database['havastorux']['2018-02-10'] = [
	{
		start: '2018-02-10 08:30',
		end: '2018-02-10 09:00',
		user_name: 'Megan'
	},{
		start: '2018-02-10 09:10',
		end: '2018-02-10 10:30',
		user_name: 'Avi'
	},{
		start: '2018-02-10 15:00',
		end: '2018-02-10 16:00',
		user_name: 'Anita'
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


function add (date, user, account) {
	 
}

function remove (date, user, account) {

}

function get (date, user, account) {
	return Database[account][date];
}

function processData (json) {
	// {
//     	user 		: username,
//     	intent      : intent.intent,
//     	account     : _.find(response.entities, entity=>entity.entity == 'account'),
//     	startDate   : date[0].start.date(),
//     	endDate     : date[0].end.date()
//     }
	

	// end date can be null
	// account can be null

	if ( json.intent == 'create_meeting'){

	}

	if ( json.intent == 'see_schedule'){
		// need to trim and lowercase all the data points
		return get('2018-02-10', 'Megan', 'havastorux');
	}

	if ( json.intent == 'cancel_meeting') {

	}

	if ( json.intent == 'other') {

	}
}


exports.print = print;
exports.get = get;
exports.process = processData;


