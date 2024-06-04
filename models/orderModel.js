const mongoose = require('mongoose');


const orderSchema = new mongoose.Schema({
    transactionID: String,
    userID: {
        type : mongoose.Schema.ObjectId,
        ref : 'User',
        required : [ true, 'An order must belong to a user' ]
    },
    shipping : {
        name: String,
        address: String,
        city: String,
        phone: String
    },
    delivery: String,
    cart: [],
    total: Number
}, {
    timestamps: true,
    toJSON: {virtuals: true},
    toObject: {virtuals: true}
})


// virtual populate
orderSchema.virtual('user', {
    ref: 'User',
    foreignField: '_id',
    localField: 'userID'
});

const Order = new mongoose.model('Order', orderSchema);
module.exports = Order

