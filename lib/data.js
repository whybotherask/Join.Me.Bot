


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


function add (dates, user, account) {
	 
}

function remove (dates, user, account) {

}

function get (dates, user, accounts) {
	// see_schedule havastorux startDate
	// see_schedule startDate
	// see_schedule
	console.log('database.get');

	if ( _.isEmpty(accounts)) {}

	var date = Moment(dates.startDate).format('YYYY-MM-DD');


	var accounts = 'havastorux',	// fake data
		date = '2018-02-10';


	if (accounts) {	// there can be multiple accounts
		if (Database[accounts]) {
			return Database[accounts][date];		
		}
		else {
			// return error, no accounts found
		}
	} else {
		var ret = {}
		for (account in Database) {
			ret[account] = Database[account][date];
		}
		return ret;
	}
}


function getFake (dates, user, accounts) {
	console.log('database.getFake');

	var accounts = 'havastorux',	// fake data
		date = '2018-02-10';	
		
	return Database[accounts][date];		
}

exports.get = get;
exports.get = getFake;
// exports.remove = remove;
// exports.add = add;


