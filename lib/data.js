
//mongo ds133657.mlab.com:33657/heroku_jgwbwz7f -u whybotherask -p one2six

const _ 		= require('underscore')
const Moment 	= require('moment')
const mongoose 	= require("mongoose")
const Meeting 	= require("../models/meeting.js")

const db 		= mongoose.connect(process.env.MONGODB_URI)


/* 
 * Function  Creates a meeting entry. Does not check for repeats or validity.
 * @user 	 is the user name
 * @dates 	 is object that contains "start" and "end" for the meeting 
 * @accounts is the specific account to create meeting on
 * returns	 meeting entry that is created
 */
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

/* 
 * Function  takes the parameters and generates the meeting list.
 *           The query generated is a list of meetings that overlap with the dateRange of interest
 *           and is from the accounts of interest
 * @user 	 (optional) is the user name to retrieve for. Leave blank for any users
 * @dates 	 is object that contains "start" and "end" key for the dateRange of interest 
 * @accounts (optional) is an array[] of the accounts that we are interested in
 * returns	 List of meetings that satisfy the params, sorted by Account first, then by start date
 */
function get (user, dates, accounts) {
	console.log('query', JSON.stringify(_generateQuery(user,dates,accounts)) )

	return Meeting
	.find( _generateQuery(user, dates, accounts) )
	.sort([
		['account', 1],		// sort by result.account first, in ascending (+1) order
		['start', 1]		// sort by result.start next, in ascending (+1) order
	]).exec()
}

/* 
 * Function  is a helper function for get()
 * @user 	 (optional) is the user name
 * @dates 	 (optional) is object that contains "start" and "end" key for the dateRange of interest 
 * @accounts (optional) is an array[] of the accounts that we are interested in
 * returns	 Object that represents the Mongoose Query
 */
function _generateQuery(user, dates, accounts){
	var query = { '$and': [] }
	if (_.isString(accounts)) accounts = [accounts];

	if (!_.isEmpty(dates)) {
		query['$and'].push( _$or_itemOverlapsWith(dates, false) );
	}
	if (_.isArray(accounts)) {
		query['$and'].push( _$or_itemHasAccounts(accounts, false) );
	}
	if (!_.isNull(user) || !_.isUndefined(user) ){
		query['username'] = user;
	}
	return query;
}

/* 
 * Function 	create partial query that looks for results which *overlaps* with @dates
 * @dates 		is {} with 'start' and 'end' representing the datetime interest
 * @flag 	 	(optional) set 'true' to return non-objected version ( {'$or' : []} vs '$or':[] ) 
 * returns	 	Object that represents Mongoose Query partial query
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
	  ]	// end $or
	} // end object
}

/* 
 * Function 	creates a partial query that looks for results with uses any of the @accounts
 * @accounts 	is [] of accounts to be queried
 * @flag 	 	(optional) set 'true' to return non-objected version ( {'$or' : []} vs '$or':[] ) 
 * returns	 	Object that represents Mongoose Query partial query
 */
function _$or_itemHasAccounts (accounts, flag) {
	return {
		'$or': _.map(accounts, function (item) {
			return {'account': item }
		})// covert the array to object	
	}
	// e.g. . '$or' : [{account: havastorux}, {account: havascanada}, {account: abc}]; 
}


exports.get = get;
exports.create = create;
// exports.remove = remove;







