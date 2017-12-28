
'use strict';


const _           = require('underscore')
const Moment      = require('moment')
const request     = require('request')
const TIME_FORMAT = 'HH:mm'
const DATE_FORMAT = 'YYYY-MM-DD'


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
	console.log(attachments);

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


// // check dates for empty start dates and end dates
// // sets defaults for them
// exports.checkDates = function (dates, intent) {
// 	// if date == null -> there was no dates object, use null
// 	// if !date[0].start || !date[0].end -> there was no object
// 	// if date[0].start == null -> not a valid case
// 	// if date[0].end == null -> use 1 hour from the start time
// 	return dates;
// 	var ret = {};
// 	if ( _.isEmpty(date) ) {		// ensures that date[0] is accessible
// 		ret.startDate = ret.endDate = null;
// 	}
// 	else if ( !date[0].end ) {
// 		// assumes that date[0].start is available too. both should not be unavailable.
// 	}
// },






