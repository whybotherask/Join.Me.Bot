
'use strict';


const _           = require('underscore')
const Moment      = require('moment')
const request     = require('request')
const TIME_FORMAT = 'HH:mm'
const DATE_FORMAT = 'YYYY-MM-DD'
const DATE_TEXT_FORMAT = 'MMM DD YYYY'



Moment.prototype.dayStart = function () {
  return this.clone().set({hour:0,minute:0,second:0,millisecond:0}) 
}

Moment.prototype.dayEnd = function () {
  return this.clone().set({hour:23,minute:59,second:99,millisecond:999}) 
}

// check if the requested starttime is between any booking time
// check if the requested endtime is between any booking time
// it is considered no-overlap if the endpoints overlap
exports.overlaps = function (request, bookinglist) {
  return _.filter(bookinglist, (booking)=>{
    return ( Moment(booking.start).isBetween( request.start, request.end, null, '()')
            || Moment(booking.end).isBetween( request.start, request.end, null, '()') 
            || (Moment(booking.start).isSame(request.start) && Moment(booking.end).isSame(request.end)) ) 
  });
}


exports.sendMessageToSlackResponseURL = function (responseURL, JSONmessage){
    let postOptions = {
        uri: responseURL,
        method: 'POST',
        headers: {
            'Content-type': 'application/json'
        },
        json: JSONmessage
    }
    request(postOptions, (error, response, body) => {
        if (error){
            console.log(error);
            // handle errors as you see fit
        }
    })
}


exports.Message = {};

exports.Message.Schedule = function (text, data) {
    
    let prevAccount = null 
    let acct = ''
	let attachments = _.map( data, (booking, index)=>{
        
        if (booking.account !== prevAccount ) acct = prevAccount = booking.account;
        else acct = '';

        let basicStyle = {
            "pretext"   : (acct) ? ':label: _' + Moment(booking.start).format(DATE_TEXT_FORMAT) + '_ @ [' + acct + ']' : '',
            "text"      : '*' + Moment(booking.start).format(TIME_FORMAT) + ' - '+ Moment(booking.end).format(TIME_FORMAT)+ '*   '+ booking.user_name,
            "fallback"  : 'n/a',
            "color"     : "#CCCCCC",
            "mrkdwn_in" : ["text", "pretext"],
        }// end ret

        if (booking.flag == 'new_item') { // do modifications for new items
            // basicStyle.text = ':ocean: ' + basicStyle.text,
            basicStyle.color =  "#3AA3E3"
        }

        return basicStyle;
	});

	return {
        "text"  : text,
        "mrkdwn": true,
        "attachments": attachments
    }// end message

}

exports.Message.Simple = function (text) {
    return {
        "text"  : text,
        "mrkdwn": true
    }// end message
}


// exports.Format.schedule2 = function (text, data) {
// 	let message = _.reduce( data, (memo, booking) => {
//         let $start_to_end = Moment(booking.start).format(timeFormat) + ' - ' + Moment(booking.end).format(timeFormat)
// 		return memo +'\n' + '*' + $start_to_end + '*   @' + booking.user_name
// 	}, '' );

// 	return {
//         "text"   : text,
//         "mrkdwn" : true,
//         "attachments": [
//             {
//             	"pretext"  : "_havastorux_",
//                 "text"     : message,
//                 "fallback" : message,
//                 "callback_id": "button_tutorial",
//                 "color"    : "#3AA3E3",
//                 "mrkdwn_in": ["text", "pretext"]
//             }
//         ]
//     }// end message
// }







