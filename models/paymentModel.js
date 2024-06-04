const mongoose = require('mongoose');


const paySchema = new mongoose.Schema({
    userID: {
        type : mongoose.Schema.ObjectId,
        ref : 'User',
        required : [ true, 'A payment must belong to a user' ]
    },
    amount : {
        type: String
    },
    status : {
        type: String,
        default: 'pending'
    }
}, {
    timestamps: true,
    toJSON: {virtuals: true},
    toObject: {virtuals: true}
})



const Payment = mongoose.model('Payment', paySchema);
module.exports = Payment

