const mongoose = require('mongoose')


const productSchema = new mongoose.Schema({
    name : {
        type: String,
        unique: true,
        required: [true, 'Provide product name']
    },
    description : String,
    sku : {
        type: String,
        unique: true,
        required: true
    },
    instock : Boolean,
    category: String,
    tags : Array,
    price: {
        oneMonth: {type: Number},
        threeMonths: {type: Number},
        sixMonths: {type: Number}
    },
    salePrice : {
        type: Number,
        default: 0
    },
    images : [],
    slug: String
    
},{ timestamps: true,
    toJSON : { virtuals: true},   // this tells Mongoose to output the virtuals as part of data sent on GET method
    toObject : { virtuals: true}  // this tells Mongoose to output the virtuals as part of data sent on GET method
})

productSchema.virtual('id').get(function(){
    return this._id
});

module.exports = new mongoose.model('Product', productSchema)