
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
	return [];
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
	return Meeting
	.find( generateQuery(user,dates,accounts) )
	.sort([
		['account', 1],		// sort by result.account first, in ascending (+1) order
		['start', 1]		// sort by result.start next, in ascending (+1) order
	]).exec()
}

function generateQuery(user, dates, accounts){
	var query = { 'and' : [] }
	if (dates) {
		query['and'].append( _$or_itemOverlapsWith(dates, false) );
	}
	if (Array.isArray(accounts) ) {
		query['and'].append( _$or_itemHasAccounts(accounts, false) );
	}	
	if (user){
		query['username'] = user;
	}
	return query;
}

/* 
 * Function takes a list of accounts and converts to a Mongoose Query that satisfies any of the @accounts
 * @dates is [] of accounts to be queried
 * @flag 	 can be turned to 'true' to return non-objected version ( {'$or' : []} vs '$or':[] ) 
 * returns	 object that represents Mongoose Query partial
 */
function _$or_itemOverlapsWith(dates, flag) {
	return {
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
	  ]	// end or
	} // end object
}

/* 
 * Function takes a list of accounts and converts to a Mongoose Query that satisfies any of the @accounts
 * @accounts is [] of accounts to be queried
 * @flag 	 can be turned to 'true' to return non-objected version ( {'$or' : []} vs '$or':[] ) 
 * returns	 object that represents Mongoose Query partial
 */
function _$or_itemHasAccounts (accounts, flag) {
	// e.g. . '$or' : [{ account: havastorux}, {account: havascanada}, {account: abc}]; 
	return {
		'$or': _.map(accounts, function (item) {
			return {'account': item }
		}); // covert the array to object	
	}
}


exports.get = get;
// exports.remove = remove;
exports.create = create;


