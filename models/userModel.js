const mongoose = require('mongoose')
const crypto = require('crypto');


const userSchema = new mongoose.Schema({
    accountNo : {
        type: String
    },
    email : {
        type: String,
        required: [true, 'Please provide a valid email'],
        lowercase: true,
        unique: true
        },
    name : {
        firstname: {type: String},
        lastname: {type: String, default: ''},
        other: {type: String}
    },
    phone: {
        type: String, 
        required: [true, 'Please provide a phone number'],
        unique: true
    },
    sex: String,
    password: {
            type: String,
            select: false
    },
    dob: String,
    photo: String,
    address: String,
    digital_address: String,
    occupation: String,
    company: String,
    companyAddress: String,
    monthlySalary: String,
    bank: {type: String, uppercase: true},
    accNumber: {type: String, uppercase: true},
    bankBranch: {type: String, uppercase: true},
    bankManager: {type: String, uppercase: true},
    security: {
        type: String,
        uppercase: true
    },
    nationality: { type: String, default: 'Ghanaian' },
    nationalID: {
        idType: { type: String, default: 'Ghana Card' },
        idNumber: { type: String },
        id_issue_date: String,
        id_expiry_date: String,
        id_country: { type: String, default: 'Ghana' },
    },
    documents:{
        payslip: { type: String, default: '' },
        sdo: { type: String, default: '' },
        ghcard: { type: String, default: '' },
    },
    status: { 
        type: String,
        default: 'Pending'
    },
    emailStatus: {type: Number, default: 0},
    bioStatus: {type: Number, default: 0},
    bankStatus: {type: Number, default: 0},
    payStatus: {type: Number, default: 0},
    photoStatus: {type: Number, default: 0},
    ghcardStatus: {type: Number, default: 0},
    role: {type: String, default: 'user'},
    emailActivationToken : String,
    smsActivationToken : String,
    resetPasswordToken : String,
    resetPasswordExpiry: Date,
    verificationCode : String,
    isFirstTime: { type: Boolean, default: false},
    isEligible: { type: Boolean, default: false},
    isSubmitted: { type: Boolean, default: false},
    isDisabled: { type: Boolean, default: false},
}, {
    timestamps: true, 
    toJSON : { virtuals: true},
    toObject : { virtuals: true}
},)

// populate PAYMENT on User
userSchema.virtual('payment', {
    ref: 'Payment',
    foreignField: 'userID',
    localField: '_id'
});

// populate LOAN on User
userSchema.virtual('loan', {
    ref: 'Loan',
    foreignField: 'uid',
    localField: '_id'
});

// populate POP on User
// userSchema.virtual('popup', {
//     ref: 'Popup',
//     foreignField: 'userID',
//     localField: '_id'
// });

userSchema.virtual('card', {
    ref: 'Card',
    foreignField: 'user',
    localField: '_id'
});

userSchema.virtual('completion').get(function(){
    const total = this.bioStatus + this.emailStatus + this.payStatus + this.photoStatus + this.ghcardStatus + this.bankStatus
    return total
})

//QUERY MIDDLEWARE //
userSchema.pre(/^find/, function(next){
    this.populate({ path: 'payment' });
    this.populate('loan');
    this.populate('card');
  next();
});

userSchema.virtual('fullname').get(function(){
    let fullname
    if(this.name.other === ''){
        fullname = this.name.firstname + ' ' + this.name.lastname
    }else {
        fullname = this.name.firstname + ' ' + this.name.other + ' ' + this.name.lastname
    }
    return fullname
})

userSchema.methods.activateEmail = function(){
    const activationToken = Math.random().toString(36).slice(2,8)
    this.emailActivationToken = activationToken

    return activationToken
}

userSchema.methods.resetPassword = function(){
    const resetToken = crypto.randomBytes(32).toString('hex');
    this.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    return resetToken
}

const User = new mongoose.model('User', userSchema)
module.exports = User