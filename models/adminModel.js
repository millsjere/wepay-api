const mongoose = require('mongoose')


const adminSchema = new mongoose.Schema({
    
    email : {
        type: String,
        required: [true, 'Please provide a valid email'],
        lowercase: true,
        unique: true
        },
    name : String,
    phone: String,
    password: {
            type: String,
            select: false
    },
    photo: String,
    role: {type: String, default: 'admin'},
    verificationCode : String
}, {
    timestamps: true, 
    toJSON : { virtuals: true},
    toObject : { virtuals: true}
},)


const Admin = new mongoose.model('Admin', adminSchema)
module.exports = Admin