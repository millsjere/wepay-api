const mongoose = require('mongoose')


const activitySchema = new mongoose.Schema({

    user: mongoose.SchemaTypes.ObjectId,
    title: String,
    body: String,
    status: { type: String, default: 'unread' }
},{
    timestamps: true, 
    toJSON: {virtuals: true}, 
    toObject: {virtuals: true}
});



// set up Virtuals to populate


const Activity = new mongoose.model('Activity', activitySchema)
module.exports = Activity