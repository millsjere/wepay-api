const mongoose = require('mongoose');


const transactionSchema = new mongoose.Schema({
    user_id: {
        type : String,
        required : [ true, 'A payment must belong to a user' ]
    },
    cardNumber: {
        type: String,
        required : [ true, 'Card number is required' ]
    },
    accountNumber: {
        type: String,
        required : [ true, 'Account number is required' ]
    },
    amount : {
        type: Number,
        required : [ true, 'Transaction amount is required' ]
    },
    date_time: {
        type: String,
        required : [ true, 'Date is required' ]
    },
    status : {
        type: String,
        required : [ true, 'Transaction status is required' ]
    }
}, {
    timestamps: true,
    toJSON: {virtuals: true},
    toObject: {virtuals: true}
})



const UserTransactions = mongoose.model('UserTransactions', transactionSchema);
module.exports = UserTransactions

