
'use strict';

const extend = require('extend');
const chrono = require('chrono-node');
const moment = require('moment');
const watson = require('watson-developer-cloud');
const conversation = watson.conversation({
  username: process.env.WATSON_USERNAME,
  password: process.env.WATSON_PASSWORD,
  version: 'v1',
  version_date: '2017-02-03'
});  


module.exports = {
  /**
   * Sends a message to the conversation. If context is null it will start a new conversation
   * @param  {Object}   params   The conversation payload. See: http://www.ibm.com/watson/developercloud/conversation/api/v1/?node#send_message
   * @param  {Function} callback The callback
   * @return {void}
   */
  parse: function(params, controller_callback) {

    var _params = extend({}, params);
    
    const payload = {
      workspace_id: process.env.WATSON_WORKSPACE_ID,
      input: {'text': _params.text },
      context: params.context || {}  // should be retrieved from a database
    };

    return new Promise((resolve, reject) => conversation.message(payload, 
      function(err, data) {
        if (err) {
          reject(err);
        } else {
          resolve(data);
        }
      })
    )
  },

  no_name : function () {},


// ------
} // end module exports


