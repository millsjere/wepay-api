const { newAccountCreationMessage } = require('../mailer/template')
const Admin = require('../models/adminModel')
const Audit = require('../models/auditModel')
const Loan = require('../models/loanModel')
const Notification = require('../models/notificationModel')
const Payment = require('../models/paymentModel')
const User = require('../models/userModel')
const sgMail = require('@sendgrid/mail');
const LoanItem = require('../models/loanModel')
const { sendSMS } = require('../sms')

// GET ALL LOANS
exports.getAllLoans = async (req, res) => {
    try {
        const loan = await Loan.find().populate({path: 'user'})

        //res to client
        res.status(201).json({
            status: 'success',
            data: loan
        })

    } catch (error) {
        res.status(500).json({
            status: 'failed',
            error,
            message: error.message
        })
    }
}

// GET ALL PENDING PAYMENTS
exports.getAllPayments = async (req, res) => {
    try {
        //console.log(req.user)
        const payments = await Payment.find({status: 'pending'})

        //res to client
        res.status(200).json({
            status: 'success',
            data: payments
        })

    } catch (error) {
        res.status(500).json({
            status: 'failed',
            error,
            message: error.message
        })
    }
}

exports.updateSDO = async(req, res, next) => {
    try {
        if(!req.file){
            throw Error('Sorry, could not upload Standing Order')
          }
         //fetch user from database
         const user = await User.findById({_id: req.user.id})
         user.documents.sdo = req.file.path;
         
         await user.save()

         // call next middleware
         next()
        
    } catch (error) {
        res.status(500).json({
            status:'failed',
            error: error,
            message: error.message
        })
    }
}

// REQUEST A LOAN
exports.requestLoan = async(req, res) => {
    try {
        // console.log(req.body)
        const{ amount, duration, interest, perMonth } = req.body
        const user = await User.findById({ _id: req.user.id })
        const userLoan = await Loan.findOne({ uid: req.user.id })

        if(!user) {
            throw Error('Invalid, no user account found')
        }
        
        //create and update the Loan doc
        const newLoan = { amount, duration, interest, perMonth, user: user._id}
        userLoan.balance = userLoan.limit - userLoan.total;
        userLoan.loans.unshift(newLoan)
        await userLoan.save()

        //fetch admins & superAdmin emails
        const admins = await Admin.find({role: 'admin'})
        const superAdmin = await Admin.find({role: 'superadmin'})

        // send email to all admins
        sgMail.setApiKey(process.env.SENDGRID_API_KEY)
        const adminEmails = admins.map(({email}) => email)
        const msgs = {
            to: [...adminEmails,superAdmin[0].email],
            from: 'WePayGh <noreply@wepaygh.com>', // Change to your verified sender
            subject: 'New Loan Request',
            html: newAccountCreationMessage(
                req,
                'New Loan Request', 
                `A new loan request has been submitted successfully.<br> User account details are listed below: 
                <br> Email: ${user.email} 
                <br> Full Name: ${user.fullname}
                <br> Loan Request: GHc ${amount}
                `
                ),
            }
        await sgMail.sendMultiple(msgs)

        //User Notification
        await Notification.create({
            user: req.user._id,
            title: 'Loan Request',
            body: 'Thank you. Your loan request has been received. Your request is currently been processed.'
        })

        //send Audit Trail
        await Audit.create({
            user: req.user._id,
            title: 'Loan Request',
            name: req.user.fullname,
            email: req.user.email,
            role: req.user.role
        })

        //res to client
        res.status(201).json({
            status: 'success',
            data: userLoan
        })

    } catch (error) {
        res.status(500).json({
            status: 'failed',
            error,
            message: error.message
        })
    }
}

// DENY LOAN
exports.denyLoan = async (req, res) => {
    try {
        const { user, amount, reason, loanId, deleteLoan } = req.body
        const userLoan = await Loan.findOne({uid: user})

        if(!userLoan) {
            throw Error('Sorry, this loan no longer exists. Please check with Administrator')
        }

        const loan = userLoan.loans.filter(el => el._id.toString() === loanId)[0]
        loan.isDenied = true;
        loan.amount = amount;
        loan.reason = reason;
        loan.delete = deleteLoan;
        loan.updatedAt = new Date(Date.now())
        await userLoan.save()

        //send Audit Trail
        await Audit.create({
            user: req.user?._id,
            title: 'Loan Request Denied',
            name: req.user?.fullname,
            email: req.user?.email,
            role: req.user?.role
        })

        //res to client
        res.status(200).json({
            status: 'success',
        })

    } catch (error) {
        res.status(500).json({
            status: 'failed',
            error,
            message: error.message
        })
    }
}

// REVERSE DENIED LOAN
exports.reverseLoan = async(req, res) => {
    try {
        const { user, loanId } = req.body
        const userLoan = await Loan.findOne({uid: user})

        if(!userLoan) {
            throw Error('Sorry, this loan no longer exists. Please check with Administrator')
        }

        const loan = userLoan.loans.filter(el => el._id.toString() === loanId)[0]
        loan.isDenied = false;
        loan.reason = undefined;
        loan.disable = false;
        loan.updatedAt = new Date(Date.now())
        await userLoan.save()

        //send Audit Trail
        await Audit.create({
            user: req.user?._id,
            title: 'Loan Denied Reversed',
            name: req.user?.fullname,
            email: req.user?.email,
            role: req.user?.role
        })

        //res to client
        res.status(200).json({
            status: 'success',
        })

    } catch (error) {
        res.status(500).json({
            status: 'failed',
            error,
            message: error.message
        })
    }
}

// REJECT A LOAN REQUEST
exports.deniedLoan = async(req, res) => {
    try {
        const { user, amount, reason, loanId } = req.body
        const userLoan = await Loan.findOne({uid: user})
        const currentUser = await User.findById({_id: user})
        if(!userLoan) {
            throw Error('Sorry, this loan no longer exists. Please check with Administrator')
        }

        //update user loan details
        const loan = userLoan.loans.filter(el => el._id.toString() === loanId)[0]
        loan.status = 'Denied';
        loan.amount = amount;
        loan.reason = reason;
        loan.updatedAt = new Date(Date.now())
        await userLoan.save()

        await Notification.create({
            user: currentUser,
            title: 'Loan Request Denied',
            body: 'We are sorry to inform you that your loan request was DENIED'
        })

        //send Audit Trail
        await Audit.create({
            user: req.user?._id,
            title: 'Loan Request Denied',
            name: req.user?.fullname,
            email: req.user?.email,
            role: req.user?.role
        })

        //res to client
        res.status(200).json({
            status: 'success',
        })
    } catch (error) {
        res.status(500).json({
            status: 'failed',
            error,
            message: error.message
        })
    }
}

exports.approveDeniedLoan = async (req, res) => {
    try {
        const { user, loanId, deleteLoan } = req.body
        if(deleteLoan){
            const userLoan = await Loan.findOne({uid: user})
            
            if(!userLoan) {
                throw Error('Sorry, this loan no longer exists. Please check with Administrator')
            }

            const newLoans = userLoan.loans.filter(el => el._id.toString() !== loanId)
            userLoan.loans = newLoans;
            await userLoan.save()

            // send Audit Trail
            await Audit.create({
                user: req.user?._id,
                title: 'Loan Request Deleted',
                name: req.user?.fullname,
                email: req.user?.email,
                role: req.user?.role
            })

            //res to client
            res.status(200).json({
                status: 'success',
            })
        }
        else{
            const userLoan = await Loan.findOne({uid: user})
            const currentUser = await User.findById({ _id: user })
            if(!userLoan) {
                throw Error('Sorry, this loan no longer exists. Please check with Administrator')
            }

            const loan = userLoan.loans.filter(el => el._id.toString() === loanId)[0]
            loan.status = 'Denied';
            loan.updatedAt = new Date(Date.now())
            await userLoan.save()

            await sendSMS(
                `Dear ${currentUser.name?.firstname}, we are sorry to inform you that your loan request of GHc ${loan?.amount} has been denied. Please login to find out more. https://wepaygh.com/`, 
                currentUser?.phone
            )

            //User Notification
            await Notification.create({
                user: currentUser._id,
                title: 'Loan Denied',
                body: 'We are sorry to inform you that your loan request has been denied. View the loan for more info.'
            })

            //send Audit Trail
            await Audit.create({
                user: req.user?._id,
                title: 'Loan Request Deleted',
                name: req.user?.fullname,
                email: req.user?.email,
                role: req.user?.role
            })

            //res to client
            res.status(200).json({
                status: 'success',
            })
        }

    } catch (error) {
        res.status(500).json({
            status: 'failed',
            error,
            message: error.message
        })
    }
}

// MAKE PAYMENT
exports.makeLoanPayment = async(req, res) => {
    try {
        // console.log(req.body)
        const{ amount, user } = req.body
        const pay = await Payment.create({ userID: user, amount })
        if(!pay) {
            throw Error('Sorry, something went wrong')
        }

        await Notification.create({
            user: user,
            title: 'Loan Payment',
            body: 'Thank you. Your loan payment has been confirmed successfully. Please visit your dashboard to confirm.'
        })

        //send Audit Trail
        await Audit.create({
            user: req.user._id,
            title: 'Loan Payment Confirmation',
            name: req.user.name,
            email: req.user.email,
            role: req.user.role
        })

        //res to client
        res.status(201).json({
            status: 'success',
        })

    } catch (error) {
        res.status(400).json({
            status: 'failed',
            error,
            message: error.message
        })
    }
}

//GET USER PAYMENTS
exports.getUserPayments = async (req, res) => {
    try {
        //console.log(req.user)
        const payments = await Payment.find({userID: req.user.id})

        //res to client
        res.status(200).json({
            status: 'success',
            data: payments
        })

    } catch (error) {
        res.status(500).json({
            status: 'failed',
            error,
            message: error.message
        })
    }
}

//CONFIRM USER PAYMENTS
exports.confirmUserPayment = async (req, res) => {
    try {
        // console.log(req.body)
        const payment = await Payment.findOne({_id: req.body.id})
        // console.log(payment)
        payment.status = 'confirmed'
        payment.save()

        //res to client
        res.status(200).json({
            status: 'success',
        })

    } catch (error) {
        res.status(500).json({
            status: 'failed',
            error,
            message: error.message
        })
    }
}

//DELETE USER PAYMENTS
exports.deleteUserPayment = async (req, res) => {
    try {
        // console.log(req.params)
        const payment = await Payment.findByIdAndDelete({_id: req.params.id})
        
        //res to client
        res.status(200).json({
            status: 'success',
        })

    } catch (error) {
        res.status(500).json({
            status: 'failed',
            error,
            message: error.message
        })
    }
}