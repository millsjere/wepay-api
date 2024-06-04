const mongoose = require('mongoose')

const popSchema = new mongoose.Schema({ 
    userID: { type : mongoose.Schema.ObjectId },
    welcome: {type: Boolean, default: false},
    eligible: {type: Boolean, default: false},
    status: {type: String, default: 'on'},
}, {
    timestamps: true, 
    toJSON : { virtuals: true},
    toObject : { virtuals: true}
})


module.exports = mongoose.model('Popup', popSchema );