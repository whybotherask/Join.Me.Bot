
'use strict';

const _ 		       = require('underscore')
const Moment 	     = require('moment')
const Data 		     = require('./data.js')
const Util         = require('./util.js')
const TIME_FORMAT  = 'HH:mm'
const DATE_FORMAT  = 'YYYY-MM-DD'
const DATETIME_FORMAT = DATE_FORMAT + ' ' + TIME_FORMAT
const DATE_TEXT_FORMAT = 'MMM DD YYYY'
const DATETIME_TEXT_FORMAT = DATE_TEXT_FORMAT + ' ' + TIME_FORMAT

const ALL_ACCOUNTS = ['havastorux', 'havastorux1', 'havastorux2']


function _parseDates (entities) {

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

  // book 10-11pm -> book today 10-11pm
  // book 10am -> book today 10am
  if (!dates.startDate) {  // implied start date
    dates.startDate = Moment( new Date() ).format(DATE_FORMAT)
  }
  // book 10am -> book today 10 am (above) -> book today 10-11am
  // book monday 9am -> book monday 9-10am
  if (!dates.endTime && dates.startTime) {  // implied end time for 1 hour after start time
    dates.endTime = Moment( dates.startDate + ' ' + dates.startTime).add(1, 'hours').format(TIME_FORMAT)
  }
  // view today
  // cancel my friday meetings
  if (!dates.startTime && !dates.endTime) {
    dates.startTime = '00:00'
    dates.endTime = '23:59:59.999'
  }
  // assign end date  
  dates.endDate = dates.startDate;

	return {
    start : Moment( [dates.startDate, dates.startTime].join(' ').trim() ),   // have to use join, in case startTime is null
    end   : Moment( [dates.endDate,   dates.endTime].join(' ').trim() )        
  };
}

// function _parseNullTime(entities) {
//   const Now = Moment( new Date() )
//   var dates = {
//     startDate: null,  startTime: null,
//     endDate: null,    endTime: null
//   };
//   // assign and find startDate
//   _.each( entities, (entity, index)=>{
//     if(entity.entity == 'sys-date' && !dates.startDate ) {
//       dates.startDate = entity.value
//     }
//   });
//   // if there is startDate, assign as date, otherwise use today
//   return {
//     start: (dates.startDate) ? Moment(dates.startDate).dayStart() : Now.dayStart(), 
//     end: ret.start.dayEnd()
//   }
// }

function _parseAccounts (entities) {
  var accounts = _.filter(entities, (entity)=>entity.entity == 'account');
  return (_.isEmpty(accounts)) ? ALL_ACCOUNTS : _.pluck(accounts, 'value')
}

function _dateIsInPast (dates) {
  const Now = Moment(new Date()).dayStart().add(-1, 'minutes');
  console.log('dateIsInPast:now', Now);
  console.log('dateIsInPast:dates', dates);
  return Moment(dates.start).isBefore( Now ) || Moment(dates.end).isBefore( Now )
}

/* 
 * Function           Generates the response for "create_meeting" intent 
 *                    Assumes that the parameters have been processed and validated
 *                    1. Get schedule for the day
 *                    2. Check that the request is bookable. Remedy as needed
 *                    3. Create entry if possible
 *                    4. Get the final schedule and display to user
 *
 * @username          is the user's name to be used as host of meeting
 * @requestDates      is object containing "start" and "end" key for the dateRange to be booked
 * @requestAccounts   is an array[] of the accounts to book on
 * returns            Slack-friendly object of day's schedule with booked entry, or remedy messages if not bookable
 */
function createMeeting(username, requestDates, requestAccounts) {

  var day = { start: requestDates.start.dayStart(), end: requestDates.start.dayEnd() }
    
  // Step 1 -> get today's or the requested day's schedule
  return Data.get(null, day, null)
  
  .then( (scheduleForDay)=>{
  
    // step 2 -> check the request is bookable 
    console.log('schedule for day', scheduleForDay); 
    var overlaps        = Util.overlaps(requestDates, scheduleForDay )
    var bookedAccounts  = _.unique(_.pluck(overlaps, 'account'))
    var bookableRequest = _.difference(requestAccounts, bookedAccounts)     // any item from requested requestAccounts that is not bookedAccounts
    var altAccounts     = _.difference(ALL_ACCOUNTS, bookedAccounts)        // any item from ALL_ACCOUNTS that is not bookedAccounts

    // (Step 2a) no overlaps, all is good
    if( _.isEmpty(overlaps) ) {
      var account = requestAccounts[0]; 
    }
    // (Step 2b) has overlap, but one of the requested account is bookable
    else if (!_.isEmpty(overlaps) && !_.isEmpty(bookableRequest) ){
      var account = bookableRequest[0];
    }
    // (Step 2c) timeslot is booked on all requestAccounts
    else if (!_.isEmpty(overlaps) && _.isEmpty(bookableRequest) && _.isEmpty(altAccounts) ){
      let $date_range = Moment(requestDates.start).format(DATETIME_FORMAT) + ' - ' + Moment(requestDates.start).format(DATETIME_FORMAT)
      let message = "Oh no! " + $date_range + " is booked on all the accounts."
      return Util.Message.Schedule(message, scheduleForDay);
    }
    // (Step 2d) has overlap, luckily, one of the alternate account is bookable
    else if (!_.isEmpty(overlaps) && _.isEmpty(bookableRequest) && !_.isEmpty(altAccounts) ){
      let $date_range = Moment(requestDates.start).format(DATE_TEXT_FORMAT) + ' from ' + Moment(requestDates.start).format(TIME_FORMAT) + ' - ' + Moment(requestDates.start).format(TIME_FORMAT)
      let message = ":dizzy_face: Oh no! *" + $date_range + "* is booked on _" + requestAccounts.join(' ') + '_';
      let message2 = "Fear not, *[" + altAccounts[0] + "]* is available. Try booking again on that account";
      return [ Util.Message.Simple( message ), Util.Message.Simple( message2 ) ]
    }

    // Step 3, create entry 
    // Step 4, display and confirm to the user, the final schedule for selected account
    var createdEntry = null;
    return Data.create(username, requestDates, account)
    .then( (entry)=>{
        createdEntry = entry;
        return Data.get(null, day, account)
    })
    .then( (meetingsList)=>{
        let message = ':white_check_mark: Your meeting has been booked on *'+ account + '* \n -'
        let toFlag = _.find(meetingsList, (item) =>{ return item._id.equals(createdEntry._id) }) // object id uses mongoDB's ObjectID object, not native string
            toFlag.flag = 'new_item';
        return Util.Message.Schedule( message, meetingsList )
    }); 
  });
}

/* 
 * Function           Generates the response for "see_schedule" intent 
 *                    Assumes that the parameters have been processed and validated
 *                    Sets the search parameter to be for the day (e.g. "see Friday 9-10" -> "see Friday 00:00-24:00")
 *
 * @username          (optional) will not be used.
 * @requestDates      is object that contains "start" and "end" key for the dateRange of interest
 * @requestAccounts   is an array[] of the accounts that we are interested in
 * returns            Slack-friendly object for list of meetings for the day of the specific date for the specific accounts
 */
function seeSchedule (usermame, requestDates, requestAccounts) {

    var day = { start: requestDates.start.dayStart(), end: requestDates.start.dayEnd() }

    return Data
    .get(null, day, requestAccounts)  // get the schedule for that day
    .then( (scheduleForDay)=>{
      
      if ( _.isEmpty(scheduleForDay) ) {
        let message = ':tada: No bookings on *' + Moment(day.start).format(DATE_TEXT_FORMAT) + '* for ' + requestAccounts.join(' ') + '. You may book whatever your :heart: desires';
        return Util.Message.Simple( message );
      
      } else {
        let message = 'Here are the booked times for *' + Moment(day.start).format(DATE_TEXT_FORMAT) + '*\n -'
        return Util.Message.Schedule( message, scheduleForDay )
      }
    }); // end then

}

/* 
 * Function  takes a Watson response and username and generates the response messages
 *           This is the brains of the bot:
 *           1. process the params into output, accounts, and dates
 *           2. check validity of inputs
 *           3. process each output (intent) separately
 *           4. return the appropriate response message
 *
 * @response is the user name to retrieve for. Leave blank for any users
 * @username is object that contains "start" and "end" key for the dateRange of interest 
 * returns   Slack-friendly-message response object
 */
exports.process = function (response, username){

    var output          = response.output.text[0]         // we configured watson to send semi-intent as output
    var requestAccounts = _parseAccounts(response.entities)
    var requestDates    = _parseDates(response.entities)
    var invalid         = _.difference(requestAccounts, ALL_ACCOUNTS)  // return any item in requestAccounts not in ALL_ACCOUNTS

    // validation check
    if ( !_.isEmpty(invalid) ) {
      let message = "Hmm...'" + invalid.join(' ') + "' do not seem to be valid join.me accounts";
      return Util.Message.Simple( message )
    }
    // if ( _dateIsInPast(requestDates) ) {
    //   let message = "Yikes! The request *"+ response.input.text + "* occurs in the past! :alarm_clock: :back:"
    //   return Util.Message.Simple( message )
    // }

    //------ validated inputs ----------
    if (output == 'create_meeting') {
      return createMeeting(username, requestDates, requestAccounts);
    } 
    else if (output == 'see_schedule') {
      return seeSchedule(username, requestDates, requestAccounts);
    }
   	else if (output == 'cancel_meeting') {
      // ?
   	} 
   	// *_no_time indicates that no @sys-time was provided. only a date, or no dates at all
   	// e.g. "/joinme book meeting" or "/joinme book friday". It is really a request to see the available times
    else if (output == 'create_meeting_no_time' || output == 'cancel_meeting_no_time') {	
      return viewMeeting(username, requestDates, requestAccounts);
   	}
    // generic responses
   	else if (output == 'no_intent') {
      let message = "Sorry I don't understand the request. Type 'help' for usage instructions." 
   		return Util.Message.Simple( message )
   	}
    else if (output == 'help') {
      console.log('controller: output=help');
      let message = [
        "Hi, I am the Join.Me Slackbot",
        "> To *Book* meetings, try _'Book havastorux 9-10'_ or _'Create Friday 9-10'_",
        "> To *View* meetings, try _'What is booked on Friday?'_ or _'See Friday'_",
        "> To *Cancel* meetings, try _'Cancel my 9am'_ or _'Remove Friday 11:30am'_",
        ":point_right: Remember, try to use specific times.  e.g. _Thr 08:30am_:white_check_mark:   _Early today_:X:"
      ].join('\n');
      return Util.Message.Simple( message );
    }


} // exports











