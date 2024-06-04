const mongoose = require('mongoose')

const interestSchema = new mongoose.Schema({ 
    rate: {type: Number, default: 12},
}, {
    timestamps: true, 
    toJSON : { virtuals: true},
    toObject : { virtuals: true}
})


module.exports = mongoose.model('Interest', interestSchema );