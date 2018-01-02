
'use strict';

const _ 		       = require('underscore')
const Moment 	     = require('moment')
const Data 		     = require('./data.js')
const Util         = require('./util.js')
const TIME_FORMAT  = 'HH:mm'
const DATE_FORMAT  = 'YYYY-MM-DD'
const DATETIME_FORMAT = DATE_FORMAT + ' ' + TIME_FORMAT


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
    start : Moment( [dates.startDate, dates.startTime].join(' ').trim() ),   // have to use join, in case startTime is null
    end   : Moment( [dates.endDate, dates.endTime].join(' ').trim() )        
  };
}

function parseNullTime(entities) {
  const Now = Moment( new Date() )
  var dates = {
    startDate: null,  startTime: null,
    endDate: null,    endTime: null
  };
  // assign and find startDate
  _.each( entities, (entity, index)=>{
    if(entity.entity == 'sys-date' && !dates.startDate ) {
      dates.startDate = entity.value
    }
  });
  // if there is startDate, assign as date, otherwise use today
  return {
    start: (dates.startDate) ? Moment(dates.startDate).dayStart() : Now.dayStart(), 
    end: ret.start.dayEnd()
  }
}

function parseAccounts (entities) {
  var accounts = _.filter(entities, (entity)=>entity.entity == 'account');
  return (_.isEmpty(accounts)) ? ALL_ACCOUNTS : _.pluck(accounts, 'value')
}

function dateIsInPast (dates) {
  const Now = Moment(new Date()); console.log('now', Now)
  return Moment(dates.start).isBefore( Now ) || Moment(dates.end).isBefore( Now )
}

function processCreateMeeting(username, requestDates, accounts) {

  var day = { start: requestDates.start.dayStart(), end: requestDates.start.dayEnd() }
    
  // get today's or the requested day's schedule
  Data.get(null, day, null)
  
  .then((scheduleForDay)=> {
  
    // step 1 -> check the request is bookable 
    console.log('schedule for day', scheduleForDay); 
    var overlaps          = Util.overlaps(requestDates, scheduleForDay );
    var bookedAccounts    = _.unique(_.pluck(overlaps, 'account'));
    var acceptableRequest = _.difference(accounts, bookedAccounts); // is anything from requested accounts that is not in bookedAccounts?
    var alternateAccounts = _.difference(ALL_ACCOUNTS, bookedAccounts); // try to see if any item from ALL_ACCOUNTS not in the bookedAccounts

    // (1a) no overlaps, all is good
    if( _.isEmpty(overlaps) ) {
      var account = accounts[0]; 
    }
    // (1b) has overlap, but one of the requested account is bookable
    if (!_.isEmpty(overlaps) && !_.isEmpty(acceptableRequest) ){
      var account = acceptableRequest[0];
    }
    // (1c) timeslot is booked on all accounts
    if (!_.isEmpty(overlaps) && _.isEmpty(acceptableRequest) && _.isEmpty(alternateAccounts) ){
      let message = 'Oh no! That time slot is booked in all accounts'
      console.log(message)
      return { message: message, data: scheduleForDay }
    }
    // (1d) has overlap, luckily, one of the alternate account is bookable
    if (!_.isEmpty(overlaps) && _.isEmpty(acceptableRequest) && !_.isEmpty(alternateAccounts) ){
      let message = 'Oh no! The time slot you requested is booked.'
      let endingMessage = 'Fear not, "' + alternateAccounts[0] + '" is available. Try booking on that account';
      console.log(message, endingMessage);
      return { message: message, data: scheduleForDay, endingMessage: endingMessage }
    }

    // Step 2, create entry 
    // Step 3, display and confirm the final schedule for selected account to the user
    Data.create( username, requestDates, account)
    .then((entry) => {
        console.log('created meetings'); console.log(entry);
        return Data.get(null, day, account) // highlight the booked entry
    })
    .then((meetings)=>{
        console.log('meetings'); console.log(meetings);
        let message = 'As you command'
        return { message: message, data: meetings }
    }); 
  });
}


exports.process = function (response, username){

    var output        = response.output.text[0]; // we configured watson to send semi-intent as output
    var accounts      = parseAccounts(response.entities);
    var requestDates  = parseDates(response.entities);
    var invalid       = _.difference(accounts, ALL_ACCOUNTS);  // return any item in accounts that is not in ALL_ACCOUNTS

    // validation
    if ( !_.isEmpty(invalid) ) {
      let message = '"' + invalid_accounts.join(' ') + '" is not a valid join.me account. Please try again.';
      console.log(message)
      return { message: message }
    }
    if (dateIsInPast(requestDates) && ! Moment(requestDates.start).isSame(requestDates.end)) {
      let message = 'Yikes! *'+ Moment(requestDates.start).format(DATETIME_FORMAT) + '* - *' + Moment(requestDates.end).format(DATETIME_FORMAT) + '* occurs in the past! #timetravel'
      console.log(message)
      return { message: message }
    }
    if (dateIsInPast(requestDates) && Moment(requestDates.start).isSame(requestDates.end)) {
      let message = 'Yikes! *'+ Moment(requestDates.start).format(DATETIME_FORMAT) + '* occurs in the past! #timetravel'
      console.log(message)
      return { message: message }
    }

    //------ validation has passed
    if (output == 'create_meeting') {
        return processCreateMeeting(username, requestDates, accounts);
    } // end if

    if (output == 'see_schedule') {
      // return Data.get(null, dates, accounts)
    }
   	if (output == 'cancel_meeting') {
   	} 
   	// e.g. "/joinme book meeting" or "/joinme book friday". It is really a request to see the available times
   	if (output == 'create_meeting_no_time' || output == 'cancel_meeting_no_time') {	
      // *_no_time indicates that no @sys-time was provided. only a date, or no dates at all
      // either use today or the specified day as dateRange
      requestDates = parseNullTime(response.entities);  
      // return Data.get(dates, username, accounts) 
   	}
   	if (output == 'no_intent') {
   		// send error message
   		console.log('no intents detected');
   		return ;
   	}

    // return Data.get(null, dates, accounts);

} // exports











