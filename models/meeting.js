
const mongoose 	= require("mongoose");
const Schema 	= mongoose.Schema;

var Meeting = new Schema({
	_id: 		Schema.Types.ObjectId,
	start: 		{type: Date}, 			// date string - uses ISODates
	end: 		{type: Date},			// date String
	user_name:  {type: String}, 		// user name
	account: 	{type: String},			// havastorux, havastorux1
}, 
{ collection : 'meetings' });



// var Dates = new Schema({
// 	date: 		{type: String}, 
// 	values: 	[Meeting]
// })

// var Account = new Schema({
// 	_id: 		mongoose.Types.ObjectId()
// 	account: 	{type: String},  		// havastorux, havastorux1
// 	values: 	[Meeting]	
// })	


module.exports = mongoose.model("Meetings", Meeting);







