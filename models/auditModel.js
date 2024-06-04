const mongoose = require('mongoose')


const auditSchema = new mongoose.Schema({

    user: mongoose.SchemaTypes.ObjectId,
    title: String,
    name: String,
    email: String,
    role: String
},{
    timestamps: true, 
    toJSON: {virtuals: true}, 
    toObject: {virtuals: true}
});



// set up Virtuals to populate


const Audit = new mongoose.model('Audit', auditSchema)
module.exports = Audit