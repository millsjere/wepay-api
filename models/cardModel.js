const mongoose = require('mongoose')


const cardSchema = new mongoose.Schema({
    user: mongoose.Schema.ObjectId,
    number: {type: String},
    amount: {type: Number, default: 0},
    expiry: {
        month: String,
        year: String
    },
    status: {type: String, default: 'inactive'}
},{
    timestamps: true,
    toJSON: {virtuals: true},
    toObject: {virtuals: true}
})



const Card = new mongoose.model('Card', cardSchema)
module.exports = Card