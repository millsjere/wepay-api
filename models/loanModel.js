const mongoose = require('mongoose')

const loan = {
    amount: Number,
    duration: Number,
    interest: Number,
    perMonth: Number,
    status: { type: String, default: 'Pending'},
    reason: { type: String },
    date: { type: Date, default: new Date( Date.now()) },
    updatedAt: { type: Date },
    user: { type: mongoose.Schema.ObjectId },
    isActive: { type: Boolean },
    isDenied: { type: Boolean, default: false },
    delete: { type: Boolean, default: false }
}

const getTotal = (loans) => {
    const amtArray = loans.map(el => el.amount)
    const initialValue = 0;
    const totalAmt = amtArray.reduce((prev, curr) => (parseInt(prev) + parseInt(curr)), initialValue)
    return totalAmt
}

const loanSchema = new mongoose.Schema({ 
    uid: { type : mongoose.Schema.ObjectId},
    limit: Number,
    balance: {type: Number, default: 0},
    loans: [loan],
}, {
    timestamps: true, 
    toJSON : { virtuals: true},
    toObject : { virtuals: true}
})

loanSchema.virtual('total').get(function(){
    const totalAmt = getTotal(this.loans)
    return totalAmt
})

// populate LOAN on User
loanSchema.virtual('user', {
    ref: 'User',
    foreignField: '_id',
    localField: 'uid'
});



const Loan = mongoose.model('Loan', loanSchema );
module.exports = Loan

