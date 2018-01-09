// Import library to manage .env variables
require('dotenv').config();


// Import express and request modules and urlencoded parsers
const express     = require('express')
const bodyParser  = require('body-parser')
const _           = require('underscore')
const urlencodedParser  = bodyParser.urlencoded({limit: '10mb', extended: true})

const Util        = require('./lib/util.js')
const Controller  = require('./lib/controller.js')
const Conversation= require('./lib/watson-conversation.js')

// environment parameters
const PORT        = process.env.PORT || 8080
const clientId    = process.env.SLACKAPP_CLIENT_ID
const clientSecret= process.env.SLACKAPP_CLIENT_SECRET


// start app
const app = express()


// Lets start our server
app.listen(PORT, function () {
    //Callback triggered when server is successfully listening. Hurray!
    console.log("/Join.Me listening on port " + PORT)
});


// This route handles GET requests to our root ngrok address and responds with the same "Ngrok is working message" we used before
app.get('/', function(req, res) {
    res.send('Ngrok is working! Path Hit: ' + req.url)
});


// This route handles get request to a /oauth endpoint. We'll use this endpoint for handling the logic of the Slack oAuth process behind our app.
app.get('/oauth', function(req, res) {
    // When a user authorizes an app, a code query parameter is passed on the oAuth endpoint. If that code is not there, we respond with an error message
    if (!req.query.code) {
        res.status(500);
        res.send({"Error": "Looks like we're not getting code."});
        console.log("Looks like we're not getting code.");
    } else {
        // If it's there...

        // We'll do a GET call to Slack's `oauth.access` endpoint, passing our app's client ID, client secret, and the code we just got as query parameters.
        request({
            url: 'https://slack.com/api/oauth.access', //URL to hit
            qs: {code: req.query.code, client_id: clientId, client_secret: clientSecret}, //Query string data
            method: 'GET', //Specify the method

        }, function (error, response, body) {
            if (error) {
                console.log(error);
            } else {
                res.json(body);

            }
        })
    }
});




// Route the endpoint that our slash command will point to and send back a simple response to indicate that ngrok is working
app.post('/command', function(req, res) {
    res.send('Your ngrok tunnel is up and running!');
});



app.post('/joinme', urlencodedParser, (req, res) =>{

    res.status(200).end() // best practice to respond with empty 200 status code

    if (req.body.token != process.env.SLACK_VERIFICATION_TOKEN){
        res.status(403).end("Access forbidden");
        return;
    }

    Conversation
    .parse({ text: req.body.text })
    .then( response=>{
        console.log(response);
        return Controller.process(response, req.body.user_name)   // process the request to get data
    })
    .then( messages=>{
        if ( _.isArray(messages) ){    // if array of messages, send each message at 1000 ms apart
            _.each(messages, (message, index)=>{
               setTimeout( Util.sendMessageToSlackResponseURL, index*1800, req.body.response_url, message);
            });
        }
        else {
           Util.sendMessageToSlackResponseURL(req.body.response_url, messages);
        }
    });

})



app.post('/actions', urlencodedParser, (req, res) =>{
    // res.status(200).end() // best practice to respond with 200 status
    var actionJSONPayload = JSON.parse(req.body.payload) // parse URL-encoded payload JSON string
    
    Controller
    .processActions(actionJSONPayload)
    .then( (message)=>{
        console.log(message) 
        Util.sendMessageToSlackResponseURL(actionJSONPayload.response_url, message)
        res.status(200).end()
    })

})

/*
    How to do Bots
    https://olegkorol.de/2017/04/23/Creating-a-smart-ChatBot-for-Slack/
 
    How to do Slash Commands
    https://api.slack.com/tutorials/intro-to-message-buttons
 */





 

