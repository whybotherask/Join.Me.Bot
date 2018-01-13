
'use strict';

const _ 		       = require('underscore')
const Moment 	     = require('moment')
const Data 		     = require('./data.js')
const Util         = require('./util.js')
const TIME_FORMAT           = 'HH:mm'
const DATE_FORMAT           = 'YYYY-MM-DD'
const DATETIME_FORMAT       = DATE_FORMAT + ' ' + TIME_FORMAT
const DATE_TEXT_FORMAT      = 'MMM DD YYYY'
const DATETIME_TEXT_FORMAT  = DATE_TEXT_FORMAT + ' ' + TIME_FORMAT

const ALL_ACCOUNTS = (process.env.JOIN_ME_ACCOUNTS) 
                    ? process.env.JOIN_ME_ACCOUNTS.split(' ') 
                    : ['havastorux', 'havastorux2', 'havas_canada']


// extracts and assigns the start and end datetimes from entities json. uses today, and start of day if not found
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
    end   : Moment( [dates.endDate,   dates.endTime].join(' ').trim()   )        
  };
}

/* 
 * helper function
 * extracts the accounts in the entities response as an array of string. 
 * if nothing found, then assigns all the accounts
 */
function _parseAccounts (entities) {
  var accounts = _.filter(entities, (entity)=>entity.entity == 'account');
  return (_.isEmpty(accounts)) ? ALL_ACCOUNTS : _.pluck(accounts, 'value')
}

/* 
 * helper function
 * extracts the names in the entities response as an array of string. 
 * the @username will be omitted from the results
 */
function _parseNames (entities, username) {
  return _.filter( entities, (entity)=>{
    return (entity.entity =='sys-person' && entity.value != username )  
    // if it has the user's own name, thats ok
  })// end filter
}

/* 
 * helper function
 * checks if a meeting's start and end time is in the past
 */
function _dateIsInPast (dates) {
  const Now = Moment(new Date()).dayStart().add(-1, 'minutes');
  return Moment(dates.start).isBefore( Now ) || Moment(dates.end).isBefore( Now )
}

/* 
 * helper function for cancelMeeting
 * checks if the @scheduleForDay matches the other parameters
 * @requestAccounts may be an array of possible accounts to delete
 * @flag is used to check for fuzzy date match, or exact time match 
 * e.g. cancel my friday meeting, using "only date" return any matched meetings on friday anytime
 */
function findBooking (flag, scheduleForDay, username, requestDates, requestAccounts) {

  // if only date was supplied, compare only datel otherwise go down to seconds
  let compareType = (flag == 'only date') ? 'day' : 'second';  

  return _.filter( scheduleForDay, (booking) => {
    return (   username == booking.user_name
            && Moment(requestDates.start).isSame(booking.start, compareType)
            && requestAccounts.includes(booking.account) )
  }); 
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
      let message = ":dizzy_face: Oh no! *" + $date_range + "* is not available on _" + requestAccounts.join(' ') + '_';
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
        let message = ':white_check_mark: Your meeting has been booked on *'+ account + '*'
        let toFlag = _.find(meetingsList, item=>item._id.equals(createdEntry._id) ) // object id uses mongoDB's ObjectID object, not native string
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
        let message = ':tada: No bookings on *' + Moment(day.start).format(DATE_TEXT_FORMAT) + '* for ' + requestAccounts.join(' ') + '.\n Book whatever your :heart: desires';
        return Util.Message.Simple( message );
      
      } else {
        let message = 'Here are the booked times for *' + Moment(day.start).format(DATE_TEXT_FORMAT) + '*\n -'
        return Util.Message.Schedule( message, scheduleForDay )
      }
    }); // end then
} // end seeSchedule()

/* 
 * Function           Generates the response for "cancel_meeting" intent 
 *                    Assumes that the parameters have been processed and validated
 *                    Sets the search parameter to be for the day (e.g. "see Friday 9-10" -> "see Friday 00:00-24:00")
 *
 * @flag              a flag that indicates the way bookings will be matched. 'only date' indicates that user only specified a date and no time
 * @username          the username on the booking to cancel
 * @requestDates      is object that contains "start" and "end" key for the dateRange of booking to delete
 * @requestAccounts   is an array[] of the accounts that the booking should delete
 * returns            if there are multiple matching meetings, sends the matched meetings with delete options on each
 *                    if only one matched, deletes that meeting and sends a confirmation
 *                    if no matches, sends a message and displays the day's schedule
 */
function cancelMeeting (flag, username, requestDates, requestAccounts) {

  var day = { start: requestDates.start.dayStart(), end: requestDates.start.dayEnd() }

  return Data.get(null, day, null)
  
  .then( (scheduleForDay)=>{
 
    if ( _.isEmpty(scheduleForDay) ){
      let message = 'Oops, it looks like there isnt any bookings on that day.'
      return Util.Message.Simple( message )
    } 

    // check what is booked, and if anything that matches the request
    var toDelete = findBooking(flag , scheduleForDay, username, requestDates, requestAccounts) 

    // if there are no matches, ask user to check the schedule again
    if (toDelete.length < 0) {
      let message = 'Hm...I can\'t seem to find that meeting...'
      return Util.Message.Schedule( message, scheduleForDay)
    }
    // if there is only 1 booking, then remove the requested one
    else if (toDelete.length == 1) {
      return Data.removeById(toDelete[0]._id)
      .then( (removedEntry) => {

        if (_.isUndefined(removedEntry)) {
          let message = ':dizzy_face: Something went wrong. I could not delete the requested meeting.'
          console.log(username, requestDates, requestAccounts);
          return Util.Message.Simple(message);
        }

        let $date_range = Moment(removedEntry.start).format(DATE_TEXT_FORMAT) + ' from ' + Moment(removedEntry.start).format(TIME_FORMAT) + ' - ' + Moment(removedEntry.end).format(TIME_FORMAT)
        let message = ':white_check_mark: Your *' + $date_range + ' on ' + removedEntry.account + '* meeting has been removed.'
        return Util.Message.Simple( message )
      }) // end Data.remove().then()
    }
    // if there are more than one meeting that match, then ask the use
    else if (toDelete.length > 1) {
      let message = 'Oh, you have more than one meeting that day on ' + requestAccounts.join(' ') + '. Which would you like to cancel?'
      return Util.Message.MultiSelect( message, toDelete )
    }
  
  }); // end Data.get().then()

} // end cancelMeeting()

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
    var otherNames      = _parseNames(response.entities, username)

    // validation check
    if ( !_.isEmpty(invalid) ) {
      let message = "Hmm...'" + invalid.join(' ') + "' do not seem to be valid join.me accounts";
      return Util.Message.Simple( message )
    }
    if ( _dateIsInPast(requestDates) ) {
      let message = "Yikes! The request *"+ response.input.text + "* occurs in the past! :alarm_clock: :back:"
      return Util.Message.Simple( message )
    }
    if (!_.isEmpty(otherNames)) {
      let message = ":cop: Hey, you cannot add or delete other people's meetings. Hands in your own cookie jar!"
      return Util.Message.Simple( message)
    }
    
    //------ validated inputs ----------
    if (output == 'create_meeting') {
      return createMeeting(username, requestDates, requestAccounts);
    } 
    else if (output == 'see_schedule') {
      return seeSchedule(username, requestDates, requestAccounts);
    }
   	else if (output == 'cancel_meeting_both_date_time') {
      return cancelMeeting('date time', username, requestDates, requestAccounts);
   	} 
    else if (output == 'cancel_meeting_only_date') {
      return cancelMeeting('only date', username, requestDates, requestAccounts);
    }
   	// *_no_time indicates that no @sys-time was provided. only a date, or no dates at all
   	// e.g. "/joinme book meeting" or "/joinme book friday". It is really a request to see the available times
    else if (output == 'create_meeting_no_time' || output == 'cancel_meeting_no_time') {	
      return seeSchedule(username, requestDates, requestAccounts);
   	}
    // generic responses
   	else if (output == 'no_intent') {
      let message = "Sorry I don't understand the request. Type 'help' for usage instructions." 
   		return Util.Message.Simple( message )
   	}
    else if (output == 'help') {
      console.log('controller: output=help');
      let message = [
        "Hi, I am the JoinMe Slackbot",
        "> To *Book* meetings, try '/joinme Book havastorux 9-10' or '/joinme Create Friday 9-10'",
        "> To *View* meetings, try '/joinme What is booked on Friday?' or '/joinme See Friday'",
        "> To *Cancel* meetings, try '/joinme Cancel my 9am' or '/joinme Remove Friday 11:30am'",
        ":point_right: Remember, try to use specific times:   Thr 08:30am :white_check_mark:   Early today :X:"
      ].join('\n');
      return Util.Message.Simple( message );
    }


} // exports


/* 
 * Function   processes action requests from Slack (these are callback from buttons)
 *            there is only 1 kind of message that has buttons right now, so no helper functions
 *
 * @json      the json response of the Slack request for button callbacks
 * return     Slack-friendly update to the original message, 
 */ 
exports.processActions = function (json) {

  var type = json.callback_id
  // we only have one message action for now. in future need to fix message

  if (type.includes('cancel')) {

    let id = type.replace('cancel_', '').trim()
    
    return Data.removeById(id)
    .then( (removedEntry) => {
      console.log('removedEntry', removedEntry)
      let $date_range = Moment(removedEntry.start).format(DATE_TEXT_FORMAT) 
                        + ' from ' + Moment(removedEntry.start).format(TIME_FORMAT) 
                        + ' - ' + Moment(removedEntry.end).format(TIME_FORMAT)
      let message = {
        text : '',
        replace_original: true,
        "attachments": [
            {
              "text"      : ':white_check_mark: Your meeting *' + $date_range + '* on ' + removedEntry.account + ' has been cancelled.',
              "color"     : "#CCCCCC",
              "mrkdwn_in" : ["text", "pretext"]
            }
        ]
      }
      return message
    }) // end Data.remove().then()
  } // end if

} // end export.processActions()










