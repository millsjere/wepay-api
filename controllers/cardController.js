const Admin = require("../models/adminModel")
const Audit = require("../models/auditModel")
const Card = require("../models/cardModel")
const User = require("../models/userModel")
const sgMail = require('@sendgrid/mail')
const { approvalRequestMessage } = require("../mailer/template")
const Loan = require("../models/loanModel")
const mongoose = require('mongoose')


exports.newCard = async(req, res)=> {
    try {
        const {user, number, amount, month, year, loanId} = req.body
        const card = await Card.create({user, number, amount})
        const currentUser = await User.findById({_id: user})
        const userLoan = await Loan.findOne({uid: user})
        const superAdmin = await Admin.find({role: 'superadmin'})

        if(!card) throw Error('Sorry, could not create card')
        if(!userLoan) throw Error('Sorry, no Loan found on this account')

        //update card details
        card.expiry.month = month
        card.expiry.year = year
        await card.save()

        //update user loan details
        const loan = userLoan.loans.filter(el => el._id.toString() === loanId)[0]
        loan.status = 'Processing';
        await userLoan.save()

        // Request approval from Super Admin
        sgMail.setApiKey(process.env.SENDGRID_API_KEY)
        const body = approvalRequestMessage(
            req,
            `Loan Approval Request`, 
                `Hello ${superAdmin[0].name.split(' ')[0]}, <br><br>
                This is an admin(${req.user.name}) request for the approval and issuance of the WePay Card. <br>
                The details of the request are:<br>
                User : ${currentUser.fullname} <br>
                Email : ${currentUser.email} <br>
                Phone : ${currentUser.phone} <br>
                Approved Loan : Ghc${card.amount.toLocaleString()}
                <br><br>
            Your approval is required for the request to proceed with its execution. `)
        const msg = {
        to: `${superAdmin[0].email}`, // Change to your recipient
        from: 'WePayGh <noreply@wepaygh.com>', // Change to your verified sender
        subject: 'Loan Approval Request',
        html: body
        }

        await sgMail.send(msg)

        //send Audit Trail
        await Audit.create({
            user: req.user._id,
            title: 'Loan Approval Request',
            name: req.user.fullname,
            email: req.user.email,
            role: req.user.role
        })

        // res to client
        res.status(201).json({
            status: 'success',
        })
    } catch (error) {
        res.status(500).json({
            status: 'failed',
            error: error,
            message: error.message
        })
    }
}

exports.updateCard = async(req, res)=> {
    try {
        //console.log(req.body)
        const {user, amount, loanId} = req.body
        const card = await Card.findOne({user})
        const userLoan = await Loan.findOne({uid: user})
        const currentUser = await User.findById({_id: user})
        const superAdmin = await Admin.find({role: 'superadmin'})

        if(!card) throw Error('Sorry, no card found on this account')
        if(!userLoan) throw Error('Sorry, no Loan found on this account')

        //update user loan details
        const loan = userLoan.loans.filter(el => el._id.toString() === loanId)[0]
        loan.status = 'Processing';
        await userLoan.save()

        //updated card details
        card.amount = card.amount + amount
        await card.save()

        // Request approval from Super Admin
        sgMail.setApiKey(process.env.SENDGRID_API_KEY)
        const body = approvalRequestMessage(
            req,
            `Loan Approval Request`, 
                `Hello ${superAdmin[0].name.split(' ')[0]}, <br><br>
                This is an admin(${req.user.name}) request for the approval and issuance of the WePay Card. <br>
                The details of the request are:<br>
                User : ${currentUser.fullname} <br>
                Email : ${currentUser.email} <br>
                Phone : ${currentUser.phone} <br>
                Approved Loan : Ghc${card.amount.toLocaleString()}
                <br><br>
            Your approval is required for the request to proceed with its execution. `)
        const msg = {
        to: `${superAdmin[0].email}`, // Change to your recipient
        from: 'WePayGh <noreply@wepaygh.com>', // Change to your verified sender
        subject: 'Loan Approval Request',
        html: body
        }

        await sgMail.send(msg)

        //send Audit Trail
        await Audit.create({
            user: req.user._id,
            title: 'Loan Approval Request',
            name: req.user.fullname,
            email: req.user.email,
            role: req.user.role
        })

        // res to client
        res.status(201).json({
            status: 'success',
        })
    } catch (error) {
        res.status(500).json({
            status: 'failed',
            error: error,
            message: error.message
        })
    }
}

exports.getAllCards = async(req, res) => {
    try {
        const cards = await Card.find().sort('-createdAt')

        // res to client
        res.status(200).json({
            status: 'success',
            data: cards
        })
    } catch (error) {
        res.status(500).json({
            status: 'failed',
            error: error,
            message: error.message
        })
    }
}

exports.getOneCard = async(req, res) => {
    try {
        const card = await Card.find({user: req.user.id})
        if(card.status === 'inactive'){
            //res to client
            res.status(200).json({
                status: 'inactive',
            })
        }else {
            //res to client
            res.status(200).json({
                status: 'success',
                data: card[0]
            })

        }
    } catch (error) {
        res.status(500).json({
            status: 'failed',
            error: error,
            message: error.message
        })
    }
}