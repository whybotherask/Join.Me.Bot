
'use strict';


const _ = require('underscore')
const chrono = require('chrono-node')
const Moment = require('moment')
const timeFormat = 'HH:mm'


exports.process = function (response, username){
	if (_.isEmpty(response.intents) ) {
		return {
			user 	: username,
			intent 	: 'other',
			account : null,
			startDate : null,
			endDate: null
		}
	}
    var date = chrono.parse(response.input.text);
    var intent = _.max(response.intents, intent=>intent.confidence )
    return {
    	user 		: username,
    	intent      : intent.intent,
    	account     : _.find(response.entities, entity=>entity.entity == 'account'),
    	startDate   : (date[0] && date[0].start) ? date[0].start.date() : null,
    	endDate     : (date[0] && date[0].end  ) ? date[0].end.date() 	: null
    }
},




exports.formatTextAttachment = function (text, data) {

	var attachments = _.map( data, (booking, index)=>{
		var ret = {
			"pretext": (index == 0) ? '_havastorux_': '',
            "text": '*' + Moment(booking.start).format(timeFormat) + ' - '+ Moment(booking.end).format(timeFormat)+ '*'+'  '+ booking.user_name + '\n',
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










