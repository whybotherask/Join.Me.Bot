
'use strict';

const _ 		       = require('underscore')
const Moment 	     = require('moment')
const Data 		     = require('./data.js')
const TIME_FORMAT  = 'HH:mm'
const DATE_FORMAT  = 'YYYY-MM-DD'


function parseDates (entities) {

	const Now = Moment( new Date() );
	var dates = {};
	
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

	// if startDate, startTime, endDate, endTime was not assigned previously,
	// assign some defaults. e.g. "book something for 5"
	if(!dates.startDate) {
		dates.startDate = Now.format(DATE_FORMAT)
	} 
	if(!dates.startTime) {
		dates.startTime = Now.format(TIME_FORMAT)
	} 
	if(!dates.endDate) {
		dates.endDate = dates.startDate // booking must be for same day
	}
	if(!dates.endTime) {
		dates.endTime = Moment(dates.startDate + ' ' + dates.startTime).add(1, 'hours').format(TIME_FORMAT)
	}

  // assemble the final dates
	return {
    start : dates.startDate + ' ' + dates.startTime,
    end   : dates.endDate + ' ' + dates.endTime 
  };

}


function parseAccounts (entities) {
  var accounts = _.filter(entities, (entity)=>entity.entity == 'account');
  return (_.isEmpty(accounts)) ? null : _.pluck(accounts, 'value')
}


exports.process = function (response, username){

    console.log(username);
    var output = response.output.text[0]; // we configured watson to send semi-intent as output
    var accounts = parseAccounts(response.entities);
    var dates = {};

    if (output == 'create_meeting') {
    	dates = parseDates(response.entities)
      Data.create(dates, username, accounts);
      return Data.get(dates, null, accounts);   // get all the meetings
    }
    if (output == 'see_schedule') {
    	dates = parseDates(response.entities)
      return Data.get(dates, null, accounts)
    }
   	if (output == 'cancel_meeting') {
    	dates = parseDates(response.entities)
   	} 
   	// e.g. "/joinme book meeting". It is really a request to see the available times
   	if (output == 'create_meeting_no_time') {	
   		dates = { start: null, end: null }
      return Data.get(dates, username, accounts) 
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

    return Data.get(dates, null, accounts);

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


