
'use strict';

const _ 		       = require('underscore')
const Moment 	     = require('moment')
const Data 		     = require('./data.js')
const TIME_FORMAT  = 'HH:mm'
const DATE_FORMAT  = 'YYYY-MM-DD'

const ALL_ACCOUNTS = ['havastorux', 'havastorux1', 'havastorux2']



Moment.prototype.dayStart = function () {
  return this.clone().set({hour:0,minute:0,second:0,millisecond:0}) 
}

Moment.prototype.dayEnd = function () {
  return this.clone().set({hour:23,minute:59,second:99,millisecond:999}) 
}


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
    dates.startDate = Moment( new Date() ).format('YYYY-MM-DD')
  }
  if (!dates.endTime && dates.startTime) {  // implied end time for 1 hour after start time
    // book 10am -> book today 10 am (above) -> book today 10-11am
    // book monday 9am -> book monday 9-10am
    dates.endTime = Moment( dates.startDate + ' ' + dates.startTime).add(1, 'hours').format('HH:mm')
  }
  // assign end date
  dates.endDate = dates.startDate;

	return {
    start : Moment(dates.startDate + ' ' + dates.startTime),
    end   : Moment(dates.endDate + ' ' + dates.endTime)
  };
}

function overlaps (requestDates, scheduleForDay) {
  // check if the requestedDates overlaps with any entry from schedule
  return false;
}

function findAvailableAccount (schedule) {
  return 'havastorux';
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

      var day = { start: requestDates.start.dayStart(), end: requestDates.start.dayEnd() }
 
      // get the schedule for the day
      // check if overlaps
      // otherwise, create the meeting
      // then get the new schedule and display     
      Data.get(null, day, accounts)

      .then((scheduleForDay)=> {

        console.log('schedule for day');
        console.log(scheduleForDay);
        console.log('end schedule for day')
      
        if ( overlaps(requestDates, scheduleForDay ) ) {
          var message = 'Oh no, your request overlaps with another booking'
          return;
        } 
        else {  // no overlap
          var account = findAvailableAccount(day, accounts);          
          Data.create( username, requestDates, account)
          
          .then((entry) => {
              console.log('created meetings')
              console.log(entry)
              return Data.get(null, day, accounts) // highlight the booked entry
              // sendMessage('as you command', attachment);
          })
          .then((meetings)=>{
              console.log('meetings')
              console.log(meetings)
              var message = 'as you command'
              return meetings
          });
        }// end else
          //---- 
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


