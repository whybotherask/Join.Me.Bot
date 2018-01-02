
'use strict';


const _           = require('underscore')
const Moment      = require('moment')
const request     = require('request')
const TIME_FORMAT = 'HH:mm'
const DATE_FORMAT = 'YYYY-MM-DD'



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
  // return all overlapping bookings
  return _.filter(bookinglist, (booking)=>{
    return ( Moment(booking.start).isBetween( request.start, request.end, null, '()')
            || Moment(booking.end).isBetween( request.start, request.end, null, '()') 
            || (Moment(booking.start).isSame(request.start) && Moment(booking.end).isSame(request.end)) ) 
  });
}

exports.formatTextAttachment = function (text, data) {

	var attachments = _.map( data, (booking, index)=>{
		var ret = {
			"pretext": (index == 0) ? '_havastorux_': '',
            "text": '*' + Moment(booking.start).format(TIME_FORMAT) + ' - '+ Moment(booking.end).format(TIME_FORMAT)+ '*'+'  '+ booking.user_name + '\n',
            "fallback": 'n/a',
            "color": "#3AA3E3",
            "mrkdwn_in": ["text", "pretext"],
        }// end ret

        return ret;
	});

	return {
        "text": text,
        "mrkdwn": true,
        "attachments": attachments
    }// end message

}

exports.formatTextAttachment2 = function (text, data) {
	var message = _.reduce( data, (memo, booking) => {
		return [
			memo, 
			'*', Moment(booking.start).format(timeFormat), ' - ', Moment(booking.end).format(timeFormat), '*', 
			'  ', booking.user_name, '\n' 
			].join('');
	}, '' );

	return {
        "text": text,
        "mrkdwn": true,
        "attachments": [
            {
            	"pretext": "_havastorux_",
                "text": message,
                "fallback": message,
                "callback_id": "button_tutorial",
                "color": "#3AA3E3",
                "mrkdwn_in": ["text", "pretext"]
            }
        ]
    }// end message
}


exports.sendMessageToSlackResponseURL = function (responseURL, JSONmessage){
    var postOptions = {
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







