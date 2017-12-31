

const _ = require('underscore')
const Moment = require('moment')

const mongoose = require("mongoose");
const db = mongoose.connect(process.env.MONGODB_URI);
const Meeting = require("../models/meeting.js");


function create (dates, user, account) {
	// check if the database has the date, for the user, for the specific account
	// findAvailable -> then assess which account to use
	Meeting
	.create({
		_id 		: new mongoose.Types.ObjectId,
		user_name 	: user,
		account 	: account[0],
		start 		: Moment(dates.start).toDate(),
		end 		: Moment(dates.end).toDate()
	}, 
	(err, meeting)=>{
		if (err) console.log(err)
		console.log(meeting);
	})
}

function remove (dates, user, account) {

}

function getLocal (dates, user, accounts) {
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


// get meetings between the dateRange, for the user, under these accounts
function get (dates, user, accounts) {
	// see_schedule havastorux startDate
	// see_schedule startDate
	// see_schedule
	var query = {};
	if ( Array.isArray(accounts) ) {
		query.accounts = _.map(accounts, (item) =>{return {'account': item}} ); // covert the array to object	
	}
	if (user) query.user_name = user;
	query.start = { 
		'$gte': Moment(dates.start).set({hour:0,minute:0,second:0,millisecond:0}).toDate(),
 		'$lte': Moment(dates.start).set({hour:0,minute:0,second:0,millisecond:0}).add(1, 'day').toDate()
 	}
	Meeting
	.find(query)
	.sort([
		['account', 1],		// sort by result.account first, in ascending (+1) order
		['start', 1]		// sort by result.start next, in ascending (+1) order
	])
	.exec((err, meetings)=>{
		console.log(meetings);
	})


}

exports.get = get;
// exports.remove = remove;
exports.create = create;


