const mongoose = require('mongoose')


const notificationSchema = new mongoose.Schema({

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


const Notification = new mongoose.model('Notification', notificationSchema)
module.exports = Notification