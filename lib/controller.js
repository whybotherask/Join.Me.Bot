
'use strict';

const _ 		       = require('underscore')
const Moment 	     = require('moment')
const Data 		     = require('./data.js')
const Util         = require('./util.js')
const TIME_FORMAT  = 'HH:mm'
const DATE_FORMAT  = 'YYYY-MM-DD'

const ALL_ACCOUNTS = ['havastorux', 'havastorux1', 'havastorux2']


function parseDates (entities) {

	var dates = {
    startDate: null,  startTime: null,
    endDate: null,    endTime: null
  };
	
	// startDate = first @sys-date, 
	// startTime = first @sys-time, endTime = second @sys-time
	_.each( entities, (entity, index)=>{
		
		if(entity.entity == 'sys-date' && !dates.startDate ) {
			dates.startDate = entity.value
		}
		else if(entity.entity == 'sys-time' && !dates.startTime ) {
			dates.startTime = entity.value.slice(0,5)	// "09:00:00" -> "09:00"
		}
		else if(entity.entity == 'sys-time' && dates.startTime ) {
			if (dates.startTime != entity.value) // prevent repeats, which oddly happens
				dates.endTime = entity.value.slice(0,5)
		}
	});

  if (!dates.startDate && dates.startTime) {  // implied start date
    // book 10-11pm -> book today 10-11pm
    // book 10am -> book today 10am
    dates.startDate = Moment( new Date() ).format(DATE_FORMAT)
  }
  if (!dates.endTime && dates.startTime) {  // implied end time for 1 hour after start time
    // book 10am -> book today 10 am (above) -> book today 10-11am
    // book monday 9am -> book monday 9-10am
    dates.endTime = Moment( dates.startDate + ' ' + dates.startTime).add(1, 'hours').format(TIME_FORMAT)
  }
  // assign end date
  dates.endDate = dates.startDate;

	return {
    start : Moment(dates.startDate + ' ' + dates.startTime),
    end   : Moment(dates.endDate + ' ' + dates.endTime)
  };
}


function findAvailableAccount (overlaps, accounts) {
  var bookedAccounts = _.pluck(overlaps, 'account');
  return _.difference(accounts, bookedAccounts);  // returns the  values from ALL_ACCOUNTS that are not present in the bookedAccounts
}


function parseAccounts (entities) {
  var accounts = _.filter(entities, (entity)=>entity.entity == 'account');
  return (_.isEmpty(accounts)) ? ALL_ACCOUNTS : _.pluck(accounts, 'value')
}

function invalidAccounts (accounts, masterList) {
  return _.difference(accounts, masterList); // return any elements from accounts that is not also in masterList
}

function dateIsInPast (dates) {
  const Now = Moment(new Date());
  console.log(Now);
  if (dates.startDate == null || dates.startTime == null) return false;
  return Moment(dates.startDate + ' ' + dates.startTime).isBefore( Now );
}

exports.process = function (response, username){

    var output = response.output.text[0]; // we configured watson to send semi-intent as output
    var accounts = parseAccounts(response.entities);
    var requestDates = parseDates(response.entities);
    var invalid_accounts = invalidAccounts(accounts, ALL_ACCOUNTS);

    // validation
    if ( !_.isEmpty(invalid_accounts) ) {
      var message = '"' + invalid_accounts.join(' ') + '" is not a valid havas join.me account. Please try again.';
      console.log(message);
      return;
    }
    // if ( dateIsInPast(dates) ){
    //   var message = 'Oh no! The date you want to book for is in the past! #time_travel';
    //   console.log(message);
    //   return;
    // }

    // validation has passed
    // dates have values and are present dates
    // accounts have values and are valid accounts
    if (output == 'create_meeting') {

      let day = { start: requestDates.start.dayStart(), end: requestDates.start.dayEnd() }
    
      // get today's schedule
      Data.get(null, day, null)

      .then((scheduleForDay)=> {
        console.log('schedule for day'); console.log(scheduleForDay); 
        var overlaps          = Util.overlaps(requestDates, scheduleForDay );
        var bookedAccounts    = _.pluck(overlaps, 'account');
        var acceptableRequest = _.difference(accounts, bookedAccounts); // is anything from requested accounts that is not in bookedAccounts?
        var availAccounts     = _.difference(ALL_ACCOUNTS, bookedAccounts); // try to see if there are any from ALL_ACCOUNTS not in the booked accounts

        console.log('overlaps', overlaps);

        console.log('  ');
        console.log('ALL_ACCOUNTS', ALL_ACCOUNTS);
        console.log('bookedAccounts', bookedAccounts);
        console.log('acceptableRequests', acceptableRequests);
        console.log('availAccounts', availAccounts);
        console.log('  ');

        if ( !_.isEmpty(overlaps) ) {
          // if there are overlap in the booking
          if ( _.isEmpty( acceptableRequest ) ) {
            // the accounts the user requested are all unavailable
            if ( _.isEmpty(availAccounts) ) {
                var message = 'Oh no! That time slot is booked in all accounts'
                console.log(message)
                return { message: message, data: scheduleForDay }
            
            } else /* avilAccounts is not empty, a non-requested account is bookable */ {  
                var message = 'Oh no! The time slot you requested is booked.'
                var endingMessage = 'Fear not, there is availability on [' + availAccounts[0] + ']. Try booking again on that account';
                console.log(message, endingMessage);
                return { message: message, data: scheduleForDay, endingMessage: endingMessage }
 
            } // end if-else _.isEmpty(availAccounts)
          
          } else /* acceptableRequests is not empty, one of the requestedAccounts is bookable */{  
            var account = acceptableRequest[0];
          }

        } else /* no overlaps, all of the requestedAccounts is bookable */{
          var account = accounts[0]; 
        }
        
        console.log(account);
        // ------ no overlap in bookings -------
        
        Data.create( username, requestDates, account)
        .then((entry) => {
            console.log('created meetings'); console.log(entry);
            return Data.get(null, day, accounts) // highlight the booked entry
        })
        .then((meetings)=>{
            console.log('meetings'); console.log(meetings);
            var message = 'as you command'
            return { message: message, data: meetings }
        }); 
      });
      
    } // end if

    if (output == 'see_schedule') {
      // return Data.get(null, dates, accounts)
    }
   	if (output == 'cancel_meeting') {
   	} 
   	// e.g. "/joinme book meeting" or "/joinme book friday". It is really a request to see the available times
   	if (output == 'create_meeting_no_time') {	
      // if there is date, use the date
      // otherwise user today
   		dates = { start: null, end: null }
      // return Data.get(dates, username, accounts) 
   	}
    if (output == 'create_meeting_no_date_time') { 
      dates = { start: null, end: null }
      // return Data.get(dates, username, accounts) 
    }
   	// e.g. "/joinme cancel meeting". It is really a request to see all the booked times
   	if (output == 'cancel_meeting_no_time') {
   	  dates = { start: null, end: null }
   	}

   	if (output == 'no_intent') {
   		// send error message
   		console.log('no intents detected');
   		return ;
   	}

    // return Data.get(null, dates, accounts);

} // exports



/*
	 { intents: [ { intent: 'create_meeting', confidence: 0.9033565998077393 } ],
  entities: 
   [ { entity: 'sys-date',
       location: [Object],
       value: '2017-12-27',
       confidence: 1,
       metadata: [Object] },
     { entity: 'sys-time',
       location: [Object],
       value: '09:00:00',
       confidence: 1,
       metadata: [Object] },
     { entity: 'sys-time',
       location: [Object],
       value: '09:00:00',
       confidence: 1,
       metadata: [Object] },
     { entity: 'sys-time',
       location: [Object],
       value: '10:00:00',
       confidence: 1,
       metadata: [Object] } ],
  input: { text: 'i want to book havasTorUX1 for tomorrow at 9:00 - 10:00' },
  output: 
   { text: [ 'create meeting' ],
     nodes_visited: [ 'node_48_1514182760045' ],
     log_messages: [] },
  context: {}

*/


