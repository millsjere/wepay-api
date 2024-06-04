const User = require('../models/userModel')
const Payment = require('../models/paymentModel')
const Notification = require('../models/notificationModel')
const jwt = require('jsonwebtoken')
const sgMail = require('@sendgrid/mail')
const bcrypt = require('bcrypt')
const crypto = require('crypto');
const firebaseStorage = require('../firebase/firebase');
const { ref, getDownloadURL, uploadBytesResumable } = require('firebase/storage');
const { registerMessage, loginVerificationMessage, newUserVerificationMessage, newAccountCreationMessage, resetPasswordMessage, approvalRequestMessage } = require('../mailer/template');
const Audit = require('../models/auditModel')
const Admin = require('../models/adminModel')
const Pop = require('../models/popupModel')
const Loan = require('../models/loanModel')
const { sendSMS } = require('../sms')
const axios = require('axios')
const https = require('https')
const moment = require('moment')

// At instance level
const AxiosInstance = axios.create({
    httpsAgent: new https.Agent({  
      rejectUnauthorized: false
    })
});

// generate user verification code
const genCode = () => {
    const code = Math.random().toString(36).slice(2,8)
    return code;
}

const genDigits = () => {
    const code = Math.floor(100000 + Math.random() * 900000)
    return code
}


const hashPassword = async(password) => {
    const salt = await bcrypt.genSalt(10);
    const hashPassword = await bcrypt.hash(password, salt);
    return hashPassword;
}

const formatDate = (date) => {
    const dt = moment(date).format("DD/MM/YYYY").split('/').join('-')
    return dt
}


const getCreditLimit = (amt) => {
    // check loan amount
    if(amt > 7000){
        return 20000
    }if(amt <= 7000 && amt >= 6000){
        return 18000
    }if(amt <= 6000 && amt >= 5000){
        return 15000
    }if(amt <= 5000 && amt >= 4000){
        return 12000
    }if(amt <= 4000 && amt >= 3000){
       return 10000
    }if(amt <= 3000 && amt >= 2000){
         return 8000
    }if(amt <= 2000 && amt >= 1000){
        return 5000
    }
}

// FETCH APPROVED USERS FROM REVPLUS
setInterval( async() => {
    //find pending users in DB 
    const allUsers = await User.find({status: 'Pending'}).select('-__v -createdAt -updatedAt');

    for (let index = 0; index < allUsers.length; index++) {
        if(allUsers[index].accountNo){
            const data = {
                Transid : allUsers[index].id,
                Transcode : "09",
                Devkey: process.env.REVPLUS_DEVKEY,
                acctno: allUsers[index].accountNo
            }

            const res = await AxiosInstance.post(process.env.REVPLUS_APPROVED_USERS, data)
            const approved = res?.data?.Message.split(',').slice(-2)[0]
            
            // console.log(approved)
            if(approved === 'APPROVED'){
                const creditLimit = getCreditLimit(parseInt(allUsers[index].monthlySalary))
                const user = await User.findById({_id: allUsers[index].id})
                await Loan.create({uid: user.id, limit: creditLimit})
                user.status = 'Verified'
                user.isEligible = true
                user.save()

                //send SMS to user
                const message = `Congratulations ${user.name.firstname}, we are glad to inform you that your WePay account has been verified successfully. You are now eligible for a loan. Login to your dashboard to request for a Loan now`;
                
                await sendSMS(message, user?.phone)

                // send email to user
                sgMail.setApiKey(process.env.SENDGRID_API_KEY)
                const body = approvalRequestMessage(
                    `Account Verification`, 
                    `Congratulations ${user.name.firstname}, <br><br>
                    We are glad to inform you that your WePay account has been verified successfully. 
                    You are now eligible for a loan. Login to your dashboard to request for a Loan.
                    <a></a>
                    `
                    )
                const msg = {
                    to: `${user.email}`, // Change to your recipient
                    from: 'WePayGh <noreply@wepaygh.com>', // Change to your verified sender
                    subject: 'Account Verification',
                    html: body
                }

                await sgMail.send(msg)

                // audit trail
                await Audit.create({
                    user: user.id,
                    title: 'User Account Verification',
                    name: user.name,
                    email: user.email,
                    role:  user.role
               })
            }
        }
        
    }
}, 15000000);



// Change User Eligibility
exports.setPopup = async(req, res) => {
    try {
        const user = await User.findById({_id: req.user._id})
        user.isEligible = false
        user.save()

        //res to client 
        res.status(200).json({
            status: 'success',
            data: user
        })

    } catch (error) {
        res.status(500).json({
            status : 'failed',
            error : error,
            message : error.message
        })
    }
}

exports.welcomePopup = async(req, res) => {
    try {
        const user = await User.findById({_id: req.user._id})
        user.isFirstTime = false
        user.save()

        //res to client
        res.status(200).json({
            status: 'success',
            data: user
        })

    } catch (error) {
        res.status(500).json({
            status : 'failed',
            error : error,
            message : error.message
        })
    }
}

exports.isSubmittedPopup = async(req, res) => {
    try {
        const user = await User.findById({_id: req.user._id})
        user.isSubmitted = false
        user.save()

        //res to client
        res.status(200).json({
            status: 'success',
            data: user
        })

    } catch (error) {
        res.status(500).json({
            status : 'failed',
            error : error,
            message : error.message
        })
    }
}

// User Auth Validation
exports.getAuth = async (req, res) => {
    try {

        if(req.cookies.user_jwt) {
            //verify the token
            const decoded = jwt.verify(req.cookies.user_jwt, process.env.JWT_SECRET) 

            //find user in DB using 
            const user = await User.findById({_id: decoded.id}).select('-__v -createdAt -updatedAt');
            
            // add user object to the req
            req.user = user;

            //send res to client
            res.status(200).json({
                status : "user found",
                data : user
            });
          
        }else {
            //send res to client
            //send res to client
            res.status(200).json({
                status : "No user found",
            });
        }

        
        
    } catch (error) {
        res.status(401).json({
            status : 'failed',
            error : error,
            message : error.message
        })
    }
}

exports.protect = async (req, res, next) => {
    try {
        
        if(req.headers?.authorization && req.headers?.authorization?.startsWith('JWT')) {
            //verify the token
            const token = req.headers?.authorization?.split(' ')[1]
            const decoded = jwt.verify(token, process.env.JWT_SECRET) 

            //find user in DB using 
            const user = await User.findById({_id: decoded.id}).select('-__v -createdAt');

            if(!user){
                throw Error('Sorry, the user no longer exits. Please signup')
            }
            // add user object to the req
            req.user = user;
            
            next();
          
        }else {
            //throw an errow
            throw Error('You are not logged in. Please login to gain access')
        }
        
    } catch (error) {
        res.status(401).json({
            status : 'failed',
            error : error,
            message : error.message
        })
    }
}

exports.getAllUsers = async(req, res) => {
    try {
        const users = await User.find();
        if(!users){
            throw Error('No user found')
        }

        res.status(200).json({
            status: 'success',
            data: users
        })
    } catch (error) {
        res.status(500).json({
            status: 'failed',
            error: error,
            message: error.message
        })
    }
}

exports.getUser = async(req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if(!user){
            throw Error('No user found')
        }

        res.status(200).json({
            status: 'success',
            data: user
        })
    } catch (error) {
        res.status(500).json({
            status: 'failed',
            error: error,
            message: error.message
        })
    }
}



exports.register = async (req, res) => {

    try {

        let token;
        // upload docs in DB
        const {fname, lname, other, email, phone, dob, password, address, occupation, company, companyAddress, monthlySalary, nationalID, sex, digital_address, id_expiry_date, id_issue_date} = req.body
        
        //check for used phone number
        const duplicate = await User.findOne({phone: phone})
        if(duplicate) throw Error('Sorry, phone number already exists')
        
        const newPassword = await hashPassword(password);
        const user = await User.create({ 
            email, phone, dob: new Date(dob).toDateString(), 
            password: newPassword, address, occupation, company, companyAddress, 
            monthlySalary, sex, digital_address })
        
        if(!user){
            throw Error('Something went wrong. Please try again')
        }
        // update User name & NationalID 
        user.name.firstname = fname
        user.name.lastname = lname
        user.name.other = other
        user.nationalID.idNumber = nationalID
        user.nationalID.id_expiry_date = new Date(id_expiry_date).toDateString()
        user.nationalID.id_issue_date = new Date(id_issue_date).toDateString()
        user.isFirstTime = true
        
        // 25% complete for bioData
        user.bioStatus = 25
        await user.save()

        // sign token & save user doc
        token = jwt.sign({id: user._id}, process.env.JWT_SECRET, {expiresIn : '5h'})
        const activationToken = user.activateEmail()
        await user.save()

        //fetch admins & superAdmin emails
        const admins = await Admin.find({role: 'admin'})
        const superAdmin = await Admin.find({role: 'superadmin'})

        // send email to user
        sgMail.setApiKey(process.env.SENDGRID_API_KEY)
        const msg = {
            to: `${user.email}`, // Change to your recipient
            from: 'WePayGh <noreply@wepaygh.com>', // Change to your verified sender
            subject: 'Welcome to WePayGh',
            html: registerMessage(
                "Thank you for Registering. <br>Let's confirm your email address.",
                "To verify your account is safe, please use the following code to activate your email address with us. Please ignore this email if you did not register with WePayGh", 
                activationToken 
                ),
            }
    
            await sgMail.send(msg)

        // send email to all admins
        sgMail.setApiKey(process.env.SENDGRID_API_KEY)
        const adminEmails = admins.map(({email}) => email)
    
        const msgs = {
            to: [...adminEmails,'designschara@gmail.com'],
            from: 'WePayGh <noreply@wepaygh.com>', // Change to your verified sender
            subject: 'New User Registration',
            html: newAccountCreationMessage(
                req,
                'New User Registration', 
                `A new user account has been created successfully.<br> Account details are listed below: <br> Email: ${user.email} <br> Full Name: ${user.fullname}`
                ),
            }
    
           await sgMail.sendMultiple(msgs)

        //create & send Notification
        await Notification.create({
            user: user._id,
            title: 'Welcome to WePayGh',
            body: 'Thank you for registering on WePayGh. Please confirm your email to activate your account'
        })

        //send Audit Trail
        await Audit.create({
            user: user._id,
            title: 'New User Registration',
            name: user.fullname,
            email: user.email,
            role: user.role
        })

        // send token to browser //
        res.cookie('user_jwt', token, { 
            expires: new Date(Date.now() + 5 * 60 * 60 * 1000), 
            httpOnly: true,
            secure: true,
            // domain: 'wepaygh.com',
         })
        
        // send res to client
        res.status(201).send({
            status: 'success',
            data: user
        })

    
    } catch (error) {
        res.status(500).json({
            status : 'failed',
            error : error,
            message : error.message
        })
    }
}

exports.login = async(req, res, next) => {
     console.log(req.body)
    try {
        const {phone} = req.body
        const user = await User.findOne({phone})
        if(!user) {
            throw Error('Sorry, no account found')
        }
        
        if(user){
            // sign token
            let token = jwt.sign({id: user._id}, process.env.JWT_SECRET, {expiresIn : '5h'})
            const code = genDigits();
            await sendSMS(`Your WePay verfication code is ${code}`, user?.phone)
            

        // save verification code in DB 
        user.verificationCode = code;
        user.save();
        
        // send token to browser //
        // res.cookie('user_jwt', token, { 
        //     expires: new Date(Date.now() + 5 * 60 * 60 * 1000), 
        //     httpOnly: true,
        //     secure: true,
        //     domain: 'wepaygh.com',
        // })

        //send Audit Trail
        await Audit.create({
            user: user._id,
            title: 'User Login',
            name: user.fullname,
            email: user.email,
            role: user.role
        })

        //send res to client
        res.status(200).json({
            status: 'success',
            data: {
                ac: token,
                user,
                expiry: new Date(Date.now() + 5 * 60 * 60 * 1000).getTime()
            }
        })

        }
        else{
            throw Error('Invalid user credentials')
        }

    } catch (error) {
        res.status(401).json({
            status: 'failed',
            error: error,
            message: error.message
        })
    }
}

exports.resendVerficationCode = async(req, res, next) => {
    //console.log(req.body)
    try {
        const user = await User.findById(req.user.id).select('+password')
        if(!user) {
            throw Error('Sorry, no account found')
        }
        // sign token
        let token = jwt.sign({id: user._id}, process.env.JWT_SECRET, {expiresIn : '5h'})
        const code = genDigits();

        // save verification code in DB 
        user.verificationCode = code;
        user.save();
        
        // send token to browser //
        res.cookie('user_jwt', token, { 
            expires: new Date(Date.now() + 5 * 60 * 60 * 1000), 
            //httpOnly: true,
            //secure: true,
            // domain: 'wepaygh.com',
        })

        // send SMS
        await sendSMS(`Your WePay verification code is ${code}`,`${user?.phone}`)

        //send Audit Trail
        await Audit.create({
            user: user._id,
            title: 'Verfication Code - User Login',
            name: user.fullname,
            email: user.email,
            role: user.role
        })

        //send res to client
        res.status(200).json({
            status: 'success',
            data: user
        })

    } catch (error) {
        res.status(401).json({
            status: 'failed',
            error: error,
            message: error.message
        })
    }
}

exports.activateEmail = async(req, res) => {
        if(req.user.emailStatus > 0){
            // send response to user
            res.status(200).json({
                status : "email verified",
            });

        }else{
            try {
                const token = req.params.token;
                const user = await User.findOne({emailActivationToken: token})
                if(!user){
                    throw Error('Sorry, invalid activation code. Please try again')
                }

                const total = user.bankStatus + user.payStatus + user.photoStatus + user.ghcardStatus + user.emailStatus + user.bioStatus
        
                if(total === 45) {
                    const data = {
                        "first_name": user.name.firstname,
                        "other_name": user.name.other,
                        "surname": user.name.lastname,
                        "sex": user.sex,
                        "date_of_birth": user.dob,
                        "occupation":user.occupation,
                        "type_of_id": "NationalID",
                        "id_number": user.nationalID.idNumber,
                        "address": user.address,
                        "telephone":user.phone,
                        "digital_address": user.digital_address,
                        "nationality": user.nationality,
                        "id_issue_date": user.nationalID.id_issue_date,
                        "id_expiry_date": user.nationalID.id_expiry_date,
                        "id_country": user.nationalID.id_country,
                        "officer":"WEPAY",
                        "account_type":"CA"
                    }
                    const response = await AxiosInstance.post(process.env.REVPLUS_USER_ONBOARDING, data)
                    user.accountNo = response.data.Data.slice(3, 18)
                    user.emailStatus = 25
                    user.emailActivationToken = undefined;
                    user.isSubmitted = true
                    await user.save();
        
                    //fetch admins & superAdmin emails
                    const admins = await Admin.find({role: 'admin'})
                    const superAdmin = await Admin.find({role: 'superadmin'})
        
                    //send email
                    sgMail.setApiKey(process.env.SENDGRID_API_KEY)
                    const adminEmails = admins.map(({email}) => email)
                    const body = newUserVerificationMessage(
                        req, 
                        'New User Verification',
                        `Hello Admin,<br>The user(${user.fullname}) has reached the verification stage by submitting all required details and documents.
                        <br>Find user in the users section of your admin dashboard`
                        );
                    const msg = {
                    to: [...adminEmails,superAdmin[0].email], //bcc the superadmin
                    from: 'WePayGh <noreply@wepaygh.com>', // Change to your verified sender
                    subject: 'New User Verification',
                    html: body
                        }
            
                    await sgMail.sendMultiple(msg)
        
                    await Notification.create({
                        user: user._id,
                        title: 'Email Activation',
                        body: 'Thank you. Your email is successfully activated. Please provide your bank details to enable us process your WePay Card'
                    })
        
                    //send Audit Trail
                    await Audit.create({
                        user: user._id,
                        title: 'User Email Activation',
                        name: user.fullname,
                        email: user.email,
                        role: user.role
                    })
        
                    // send response to user
                    res.status(200).json({
                        status : "success",
                    });
        
                }else {
                    user.emailStatus = 25
                    user.emailActivationToken = undefined;
                    await user.save({validateBeforeSave : false});
            
                    await Notification.create({
                        user: user._id,
                        title: 'Account Activation',
                        body: 'Thank you. Your WePay account is successfully activated. Please provide your bank details to enable us process your WePay Card'
                    })
            
                    //send Audit Trail
                    await Audit.create({
                        user: user._id,
                        title: 'User Email Activation',
                        name: user.fullname,
                        email: user.email,
                        role: user.role
                    })
            
                    // send response to user
                    res.status(200).json({
                        status : "success",
                    });
        
                }
        
        
        
            } catch (error) {
                res.status(500).json({
                    status: 'failed',
                    error: error,
                    message: error.message
                })
            }
        }

}

exports.sendSMSActivationCode = async(req, res) => {
    try {
        const user = await User.findById(req.user._id)
        if(!user) throw Error('Sorry, no account found')

        const code = genDigits()
        user.smsActivationToken = code
        await user.save()

        // send SMS
        await sendSMS(`Your WePay account activation code is ${code}`,`${user?.phone}`)
        
        // send response to user
        res.status(200).json({
            status : "success",
        });
        
    } catch (error) {
        res.status(500).json({
            status: 'failed',
            error: error,
            message: error.message
        })
    }

}

exports.activateSMS = async(req, res) => {
    // console.log('sms activation')
    try {
        const token = req.params.token;
        const user = await User.findOne({smsActivationToken: token})
        if(!user){
            throw Error('Sorry, invalid activation code. Please try again')
        }
        user.emailStatus = 25
        user.emailActivationToken = undefined;
        user.smsActivationToken = undefined;
        await user.save({validateBeforeSave : false});

        await Notification.create({
            user: user._id,
            title: 'Account Activation',
            body: 'Thank you. Your WePay account is successfully activated. Please provide your bank details to enable us process your WePay Card'
        })

        //send Audit Trail
        await Audit.create({
            user: user._id,
            title: 'User Account Activation',
            name: user.fullname,
            email: user.email,
            role: user.role
        })

        // send response to user
        res.status(200).json({
            status : "success",
        });

    } catch (error) {
        res.status(500).json({
            status: 'failed',
            error: error,
            message: error.message
        })
    }
}

exports.resendEmailVerification = async(req, res) => {
    try {
        const user = await User.findById({_id: req.user.id})
        if(!user){
            throw Error('Sorry, no user found. Please login')
        }
        
        // send email to user
        const activationToken = user.activateEmail()
        user.save();
        sgMail.setApiKey(process.env.SENDGRID_API_KEY)
        const msg = {
            to: `${user.email}`, // Change to your recipient
            from: 'WePayGh <noreply@wepaygh.com>', // Change to your verified sender
            subject: 'Welcome to WePayGh',
            html: registerMessage(
                "Thank you for Registering. <br>Let's confirm your email address.",
                "To verify your account is safe, please use the following code to activate your email address with us. Please ignore this email if you did not register with WePayGh", 
                activationToken 
                ),
            }
    
            await sgMail.send(msg)
        
        // send res to client
        res.status(200).json({
            status: 'success'
        })

    } catch (error) {
        res.status(401).json({
            status: 'failed',
            error: error,
            message: error.message
        })
    }
}

exports.verifyUser = async (req, res, next) => {
    try {
        // compare code to DB
        if(req.user.verificationCode == req.body.code){
            const user = await User.findById({_id: req.user.id})
            if(!user) {
                throw Error('No user found')
            }
            user.verificationCode = undefined
            user.save()

            //send res to client
            res.status(200).json({
                status: 'success',
                data: user
            })
        }else {
            throw Error('Invalid verification code. Try again')
        }
    } catch (error) {
        res.status(500).json({
            status:'failed',
            error: error,
            message: error.message
        })
    }
}

exports.forgotPassword = async (req, res) => {
    try {
        const { email } = req.body
        const user = await User.findOne({email: email})
        if(!user) {
            throw Error('Sorry user does not exist. Please register')
        }

        const resetToken = user.resetPassword()
        user.resetPasswordExpiry = new Date(Date.now() + 15 * 60 * 1000)
        await user.save();
        
        //send email to reset password
        sgMail.setApiKey(process.env.SENDGRID_API_KEY)
        const msg = {
            to: `${user.email}`, // Change to your recipient
            from: 'WePayGh <noreply@wepaygh.com>', // Change to your verified sender
            subject: 'Password Reset',
            html: resetPasswordMessage(
                req, 
                "Reset your Password.",
                "Follow the link below to reset your password. This link expires in 15 minutes. Please contact WePayGh support if you did not initiate this", 
                resetToken 
                ),
            }
    
        await sgMail.send(msg)

        //res to client
        res.status(200).json({
            status: 'success',
        })

    } catch (error) {
        res.status(500).json({
            status:'failed',
            error: error,
            message: error.message
        })
    }
}

exports.resetPassword = async (req, res) => {
    try {
        const token = crypto.createHash('sha256').update(req.params.token).digest('hex');
        const user = await User.findOne({
            resetPasswordToken: token,
            resetPasswordExpiry: {$gt : Date.now()}
        })

        if(!user){
            throw Error('Sorry, invalid reset token')
        }

        //update user password
        const { password, confirmPassword } = req.body
        if(password === confirmPassword){
            const newPassword = await hashPassword(password)
            user.password = newPassword;
            user.resetPasswordToken = undefined;
            user.resetPasswordExpiry = undefined;
            await user.save();

            //res to client
            res.status(201).json({
                status: 'success',
                data: user
            })
        }else {
            throw Error('Sorry, passwords do not match')
        }

    } catch (error) {
        res.status(500).json({
            status:'failed',
            error: error,
            message: error.message
        })
    }
}

// UPDATE USER DETAILS

exports.updateDetails = async(req, res) => {
    try {
       
        const field = req.params.name
        if(field === 'Personal'){
            const {fname, lname, address, phone, occupation, company, companyAddress, monthlySalary} = req.body
            const user = await User.findById({_id: req.user.id})
            if(!user){
                throw Error('Sorry, no user found')
            }
            fname === '' ? null : user.name.firstname = fname.trim()
            lname === '' ? null : user.name.lastname = lname.trim()
            address === '' ? null : user.address = address.trim()
            phone === '' ? null : user.phone = phone
            occupation === '' ? null : user.occupation = occupation.trim()
            company === '' ? null : user.company = company.trim()
            companyAddress === '' ? null : user.companyAddress = companyAddress.trim()
            monthlySalary === '' ? null : user.monthlySalary = monthlySalary
            await user.save()

            //send res to client
            res.status(200).json({
                status: 'success',
                data: user
            })

        }
        if(field === 'Bank'){
            // console.log(req.body)
            const {bank, accNumber, bankBranch, bankManager, security} = req.body
            const user = await User.findById({_id: req.user.id})

            if(!user){
                throw Error('Sorry, no user found')
            }

            bank === '' ? null : user.bank = bank
            accNumber === '' ? null : user.accNumber = accNumber
            bankBranch === '' ? null : user.bankBranch = bankBranch
            bankManager === '' ? null : user.bankManager = bankManager
            security === '' ? null : user.security = security

            const total = user.bankStatus + user.payStatus + user.photoStatus + user.ghcardStatus + user.emailStatus + user.bioStatus
            
            if(total == 50){
                const data = {
                    "first_name": user.name.firstname,
                    "other_name": user.name.other,
                    "surname": user.name.lastname,
                    "sex": user.sex,
                    "date_of_birth": formatDate(new Date(user.dob)),
                    "occupation":user.occupation,
                    "type_of_id": "NationalID",
                    "id_number": user.nationalID.idNumber,
                    "address": user.address,
                    "telephone":user.phone,
                    "digital_address": user.digital_address,
                    "nationality": user.nationality,
                    "id_issue_date": formatDate(new Date(user.nationalID.id_issue_date)),
                    "id_expiry_date": formatDate( new Date(user.nationalID.id_expiry_date)),
                    "id_country": user.nationalID.id_country,
                    "officer":"WEPAY",
                    "account_type":"CA"
                }
                AxiosInstance.post(process.env.REVPLUS_USER_ONBOARDING, data)
                .then( async(response) => {
                    // console.log(response)
                    user.bankStatus = 20
                    user.accountNo = response.data.Data.slice(3, 18)
                    user.isSubmitted = true
                    await user.save()

                })
                .catch( async(err) => {
                    if(err.response.status == 503){
                        user.bankStatus = 20
                        user.isSubmitted = true
                        await user.save()

                    }
                })

                //fetch admins & superAdmin emails
                const admins = await Admin.find({role: 'admin'})
                const superAdmin = await Admin.find({role: 'superadmin'})

                //send email
                sgMail.setApiKey(process.env.SENDGRID_API_KEY)
                const adminEmails = admins.map(({email}) => email)
                const body = newUserVerificationMessage(
                    req, 
                    'New User Verification',
                    `Hello Admin,<br>The user(${user.fullname}) has reached the verification stage by submitting all required details and documents.
                    <br>Find user in the users section of your admin dashboard`
                    );
                const msg = {
                to: ['designschara@gmail.com', superAdmin[0].email], //bcc the superadmin
                from: 'WePayGh <noreply@wepaygh.com>', // Change to your verified sender
                subject: 'New User Verification',
                html: body
                    }
        
                await sgMail.sendMultiple(msg)

                // create notification
                await Notification.create({
                    user: user._id,
                    title: 'Bank Details Submitted',
                    body: 'Thank you for providing us your bank details. We are currently verifying your details and will prompt you when complete'
                })

                //send Audit Trail
                await Audit.create({
                    user: user._id,
                    title: 'Bank Details Submitted',
                    name: user.fullname,
                    email: user.email,
                    role: user.role
                })

                //send res to client
                res.status(200).json({
                    status: 'success',
                    data: user
                })

            }else{
                user.bankStatus = 20
                await user.save()

                // create notification
                await Notification.create({
                    user: user._id,
                    title: 'Bank Details Submission',
                    body: 'Thank you for providing us your bank details. We are currently verifying your details and will prompt you when complete'
                })

                //send Audit Trail
                await Audit.create({
                    user: user._id,
                    title: 'User Bank Details Submission',
                    name: user.fullname,
                    email: user.email,
                    role: user.role
                })

                //send res to client
                res.status(200).json({
                    status: 'success',
                    data: user
                })

            }
            

        }
    } catch (error) {
        res.status(500).json({
            status:'failed',
            error: error,
            message: error.message
        })
    }
}

exports.updateDocuments = async(req, res, next) => {
    try {
        const field = req.params.field
         //fetch user from database
         const user = await User.findById({_id: req.user.id})

        if(field === "Documents"){
            // upload image files to Firebase
            const allImages = req.files.map((file, i) => {
                const storageRef = ref(firebaseStorage, `users/${user.id}/document/attachement-${i}`)
                const task = uploadBytesResumable(storageRef, req.files[i].buffer, {contentType: req.files[i].mimetype});
                task.on("state_changed", {
                    'snapshot': null,
                    'error': (err) => {
                        console.log(err)
                        throw err
                    },
                    'complete': async () => {
                        try {
                            let url = await getDownloadURL(task.snapshot.ref)
                            if(i === 0 ) { 
                                //console.log('0:- ' + url)
                                user.documents.payslip = url;
                                await user.save(); 
                                return
                            }
                            if(i === 1) { 
                                //console.log('1:- ' + url)
                                user.documents.sdo = url;
                                await user.save(); 
                                return
                            }
                            if(i === 2) { 
                                //console.log('2:- ' + url)
                                user.documents.ghcard = url;
                                await user.save(); 
                                return
                            }
                            
                        } catch (error) {
                            console.log(error)
                        }
                        }
                    })

            })
        
            await Promise.all(allImages);
            
                const total = user.bankStatus + user.fileStatus + user.emailStatus + user.bioStatus
                if(total == 75){
                    // 25% complete for fileStatus
                    user.fileStatus = 25
                    await user.save()

                    //update Pop state
                    const pop = await Pop.findOne({userID: user._id });
                    pop.eligible = true;
                    pop.save()

                    //fetch admins & superAdmin emails
                    const admins = await Admin.find({role: 'admin'})
                    const superAdmin = await Admin.find({role: 'superadmin'})

                    //send email to admins
                    sgMail.setApiKey(process.env.SENDGRID_API_KEY)
                    const adminEmails = admins.map(({email}) => email)
                    const body = newUserVerificationMessage(
                        req, 
                        'New User Verification',
                        `Hello Admin,<br>
                        The user(${user.fullname}) has reached the verification stage by submitting all required details and documents.<br>
                        Find user details & submitted documents in your dashboard
                        `
                        );
                    const msg = {
                    to: [...adminEmails, superAdmin[0]?.email], //bcc superadmin
                    from: 'WePayGh <noreply@wepaygh.com>', // Change to your verified sender
                    subject: 'New User Verification',
                    html: body
                    }
            
                    await sgMail.sendMultiple(msg)

                    
                    // create notification
                    await Notification.create({
                        user: user._id,
                        title: 'Document Submission',
                        body: 'Thank you for providing us your documents. We are currently verifying them and will prompt you when complete'
                    })

                    //send Audit Trail
                    await Audit.create({
                        user: user._id,
                        title: 'User Document Submission',
                        name: user.fullname,
                        email: user.email,
                        role: user.role
                    })

                    // send res to client
                    res.status(200).json({
                        status: 'success',
                        data: user
                    })

                }else{

                    // 25% complete for fileStatus
                    user.fileStatus = 25
                    await user.save()

                    // create notification
                    await Notification.create({
                        user: user._id,
                        title: 'Document Submitted',
                        body: 'Thank you for providing us your documents. We are currently verifying them and will prompt you when complete'
                    })

                    //send Audit Trail
                    await Audit.create({
                        user: user._id,
                        title: 'User Document Submission',
                        name: user.fullname,
                        email: user.email,
                        role: user.role
                    })

                    // send res to client
                    res.status(200).json({
                        status: 'success',
                        data: user
                    })

                }

        }
        if(field === "Photo"){
        // upload image files to Firebase
           for(let i = 0; i < req.files.length; i++){
            const storageRef = ref(firebaseStorage, `users/${user.id}/profile/photo`)
            const task = uploadBytesResumable(storageRef, req.files[i].buffer, {contentType: req.files[i].mimetype});
            task.on("state_changed", {
                'snapshot': null,
                'error': (err) => {
                    console.log(err)
                    throw err
                },
                'complete': async () => {
                    let url = await getDownloadURL(task.snapshot.ref)
                    // console.log(url)
                        user.photo = url;
                         // save user
                        await user.save()
                        }
                    })
                }
           

            // send res to client
            res.status(200).json({
                status: 'success',
                data: user
            })
        }
        
    } catch (error) {
        res.status(500).json({
            status:'failed',
            error: error,
            message: error.message
        })
    }
}

exports.updatePhoto = async(req, res, next) => {
    //console.log(req.file)
    try {
        if(!req.file){
            throw Error('Sorry, could not update profile picture')
          }
         //fetch user from database
         const user = await User.findById({_id: req.user.id})
         user.photo = req.file.path;
         user.photoStatus = 10
         await user.save()

        // send res to client
        res.status(200).json({
            status: 'success',
            data: user
        })
        
        
    } catch (error) {
        console.log(error)
        res.status(500).json({
            status:'failed',
            error: error,
            message: error.message
        })
    }
}

exports.updatePaySlip = async(req, res, next) => {
    // console.log(req.file)
    try {
        if(!req.file){
            throw Error('Sorry, could not upload payslip')
          }
         //fetch user from database
         const user = await User.findById({_id: req.user.id})
         user.documents.payslip = req.file.path;
         user.payStatus = 10
         await user.save()

        // create notification
        await Notification.create({
            user: user._id,
            title: 'Document Submitted - Payslip',
            body: 'Thank you for providing us your Payslip. '
        })

        //send Audit Trail
        await Audit.create({
            user: user._id,
            title: 'User Document Submission - PaySlip',
            name: user.fullname,
            email: user.email,
            role: user.role
        })

        // send res to client
        res.status(200).json({
            status: 'success',
            data: user
        })
        
    } catch (error) {
        res.status(500).json({
            status:'failed',
            error: error,
            message: error.message
        })
    }
}

exports.updateGhCard = async(req, res, next) => {
    //console.log(req.file)
    try {
        if(!req.file){
            throw Error('Sorry, could not update ghanacard')
          }
         //fetch user from database
         const user = await User.findById({_id: req.user.id})
         user.documents.ghcard = req.file.path;
         user.ghcardStatus = 10
         await user.save()

        // create notification
        await Notification.create({
            user: user._id,
            title: 'Document Submitted - Ghana Card',
            body: 'Thank you for providing us your Ghana Card. We are currently verifying your documents and will prompt you when complete'
        })

        //send Audit Trail
        await Audit.create({
            user: user._id,
            title: 'User Document Submission - Ghana Card',
            name: user.fullname,
            email: user.email,
            role: user.role
        })

        // send res to client
        res.status(200).json({
            status: 'success',
            data: user
        })
    }
    catch (error) {
        res.status(500).json({
            status:'failed',
            error: error,
            message: error.message
        })
    }
}

exports.updateSDO = async(req, res, next) => {
    //console.log(req.file)
    try {
        if(!req.file){
            throw Error('Sorry, could not update standing order')
          }
         //fetch user from database
         const user = await User.findById({_id: req.user.id})
         user.documents.sdo = req.file.path;
         
         await user.save()

         // create notification
         await Notification.create({
             user: user._id,
             title: 'Document Submitted - Standing Order',
             body: 'Thank you for providing us your Standing Order.'
         })

         //send Audit Trail
         await Audit.create({
             user: user._id,
             title: 'User Document Submission - Standing Order',
             name: user.fullname,
             email: user.email,
             role: user.role
         })

         // send res to client
         res.status(200).json({
             status: 'success',
             data: user
         })
         
        
    } catch (error) {
        res.status(500).json({
            status:'failed',
            error: error,
            message: error.message
        })
    }
}


// UPDATE USER PASSWORD
exports.updatePassword = async (req, res) => {
    try {
        const{ oldPass, newPass } = req.body
        const user = await User.findById({_id: req.user._id}).select('+password')
        // verify old password
        const verified = await bcrypt.compare(oldPass, user.password)
        if(!verified){
            throw Error('Sorry, current password is incorrect')
        }

        // set new password
        const newPassword = await hashPassword(newPass);
        user.password = newPassword;
        await user.save()

        // create notification
        await Notification.create({
            user: user._id,
            title: 'Password Update',
            body: 'Your password has been updated successfully. You can login using your new password.'
        })

        //send Audit Trail
        await Audit.create({
            user: user._id,
            title: 'User Password Changed',
            name: user.fullname,
            email: user.email,
            role: user.role
        })

        // res to client
        res.status(201).json({
            status: 'success'
        })

    } catch (error) {
        res.status(500).json({
            status:'failed',
            error: error,
            message: error.message
        })
    }
}


exports.logout = (req, res) => {
    res.clearCookie('user_jwt');
    res.status(200).json({
        status : 'success'
    })
}