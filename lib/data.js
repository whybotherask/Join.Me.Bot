
//mongo ds133657.mlab.com:33657/heroku_jgwbwz7f -u whybotherask -p one2six

const _ = require('underscore')
const Moment = require('moment')
const mongoose = require("mongoose")
const db = mongoose.connect(process.env.MONGODB_URI)
const Meeting = require("../models/meeting.js")


function mapAccounts (accounts) {
	if ( Array.isArray(accounts) ) {
		return _.map(accounts, function (item) {
			return {'account': item }
		}); // covert the array to object	
	}	// end if
}

function create (user, dates, account) {
	return Meeting
	.create({
		_id 		: new mongoose.Types.ObjectId,
		user_name 	: user,
		account 	: account,
		start 		: Moment(dates.start).toDate(),
		end 		: Moment(dates.end).toDate()
	
	})
}

function remove (user, dates, account) {

}

// get meetings between the dateRange, for the user, under these accounts
function get (user, dates, accounts) {
	var query = {
		// user_name: user // only if user is needed
		"$and": [
			{
			  "$or": [
			    {
			      "start": {
			        "$gt": Moment(dates.start).toDate(),
			        "$lt": Moment(dates.end).toDate()
			      }
			    },{
			      "end": {
			        "$gt": Moment(dates.start).toDate(),
			        "$lt": Moment(dates.end).toDate()
			      }
			    }
			  ]
			},{
			  "$or": mapAccounts(accounts)
			} 	// end $or
		]// end $and
	}	// end query

	if (user) query['username'] = user;

	return Meeting
	.find(query)
	.sort([
		['account', 1],		// sort by result.account first, in ascending (+1) order
		['start', 1]		// sort by result.start next, in ascending (+1) order
	]).exec()
}

exports.get = get;
// exports.remove = remove;
exports.create = create;


