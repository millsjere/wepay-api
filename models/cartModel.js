const mongoose = require('mongoose')


const cartSchema = new mongoose.Schema({
    user : {
        type : mongoose.Schema.ObjectId,
        ref : 'User',
        required : [ true, 'A cart must belong to a user' ]
    },
    product : {
        type : Object,
    },
    payment: String,
    quantity: Number,
},{
    timestamps: true, 
    toJSON: {virtuals: true}, 
    toObject: {virtuals: true}
});



// set up Virtuals to populate
cartSchema.virtual('total').get(function(){
    const amount = this.product.price[this.payment] * this.quantity
    return amount
})

const Cart = new mongoose.model('Cart', cartSchema)
module.exports = Cart