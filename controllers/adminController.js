const Admin = require("../models/adminModel");
const jwt = require('jsonwebtoken')
const sgMail = require('@sendgrid/mail');
const bcrypt = require('bcrypt')
const Activity = require("../models/activityModel");
const { newAccountCreationMessage, loginVerificationMessage, approvalRequestMessage, userApprovalMessage, newUserVerificationMessage, registerMessage } = require("../mailer/template");
const Audit = require("../models/auditModel");
const User = require("../models/userModel");
const Card = require("../models/cardModel");
const Notification = require("../models/notificationModel");
const Loan = require("../models/loanModel");
const firebaseStorage = require('../firebase/firebase');
const { ref, getDownloadURL, uploadBytesResumable } = require('firebase/storage');
const Pop = require("../models/popupModel");
const axios = require('axios')
const https = require('https');
const { sendSMS, checkSMSCredit } = require("../sms");
const moment = require('moment')

// generate user verification code
const genCode = () => {
    const code = Math.random().toString(36).slice(2,8)
    return code;
}

// At instance level
const AxiosInstance = axios.create({
    httpsAgent: new https.Agent({  
      rejectUnauthorized: false
    })
  });

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

const formatDate = (date) => {
    const dt = moment(date).format("DD/MM/YYYY").split('/').join('-')
    return dt
}


// AUTOMATIC USER ONBOARDING 
exports.fetchUserAccount = async(req, res, next) => {
    //find pending users in DB 
    const allUsers = await User.find({ 'accountNo' : { $exists : false }, bankStatus: {$gt : 0 }});

    if(allUsers.length > 0){
        for (let index = 0; index < allUsers.length; index++) {
            const data = {
                "first_name": allUsers[index].name.firstname,
                "other_name": allUsers[index].name.other,
                "surname": allUsers[index].name.lastname,
                "sex": allUsers[index].sex,
                "date_of_birth": formatDate(new Date(allUsers[index].dob)),
                "occupation":allUsers[index].occupation,
                "type_of_id": "NationalID",
                "id_number": allUsers[index].nationalID.idNumber,
                "address": allUsers[index].address,
                "telephone":allUsers[index].phone,
                "digital_address": allUsers[index].digital_address,
                "nationality": allUsers[index].nationality,
                "id_issue_date": formatDate( new Date(allUsers[index].nationalID.id_issue_date)) ,
                "id_expiry_date": formatDate( new Date(allUsers[index].nationalID.id_expiry_date)) ,
                "id_country": allUsers[index].nationalID.id_country,
                "officer":"WEPAY",
                "account_type":"CA"
            }

            AxiosInstance.post(process.env.REVPLUS_USER_ONBOARDING, data)
                .then( async(response) => {
                    // console.log(response)
                    const user = await User.findById({_id: allUsers[index].id})
                    user.accountNo = response.data.Data.slice(3, 18)
                    user.isSubmitted = true
                    await user.save()

                })
                .catch( async(err) => {
                    if(err.response.status == 503){
                        // console.log('Revplus server is down...')
                       return
                    }
                })
        }
    }

    next()

}


exports.fetchVerifiedUsersFromRevPlus = async(req, res, next) => {
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
            const limit = res?.data?.Message.split(',')?.slice(-1)[0]?.slice(0, -2)
            
            // console.log(approved)
            if(approved === 'APPROVED'){
                const creditLimit = parseInt(limit)
                const user = await User.findById({_id: allUsers[index].id})
                await Loan.create({uid: user.id, limit: creditLimit})
                user.status = 'Verified'
                user.isEligible = true
                user.save()

                //send SMS to user
                const message = `Congratulations ${user.name.firstname}, we are glad to inform you that your WePay account has been verified successfully. You have been offered a Credit Limit of GHc${limit}. Login to your dashboard to request for a Loan now. https://wepaygh.com/`;
                
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

    next()
}


// SEND SMS
exports.sendSMSMessage = async(req, res) => {
    try {
        await sendSMS(req.body.message, req.body.phone)

        // send res to client
        res.status(200).json({
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

// CHECK SMS CREDIT
exports.smsCreditCheck = async(req, res) => {
    try {
        const bal = await checkSMSCredit()

        // send res to client
        res.status(200).json({
            status: 'success',
            data: bal.data
        })

    } catch (error) {
        res.status(500).json({
            status:'failed',
            error: error,
            message: error.message
        })
    }
}

//Admin Auth Validation
exports.getRequest = async (req, res) => {
    try {

        if(req.cookies.admin_jwt) {
            //verify the token
            const decoded = jwt.verify(req.cookies.admin_jwt, process.env.JWT_SECRET) 

            //find user in DB using 
            const user = await Admin.findById({_id: decoded.id}).select('-__v -createdAt -updatedAt');
            
            // add user object to the req
            req.user = user;

            //send res to client
            res.status(200).json({
                status : "user found",
                data : user
            });
          
        }else {
            //send res to client
            res.status(200).json({
                status : "no user found"
            })
        }

        
        
    } catch (error) {
        res.status(401).json({
            status : 'failed',
            error : error,
            message : error.message
        })
    }
}

exports.adminOnly = async (req, res, next) => {
    try {
        
        if(req.cookies.admin_jwt) {
            //verify the token
            const decoded = jwt.verify(req.cookies.admin_jwt, process.env.JWT_SECRET) 

            //find user in DB using 
            const user = await Admin.findById({_id: decoded.id}).select('-__v -createdAt');

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
            error : error,
            message : error.message
        })
    }
}

exports.getAllAdmins = async(req, res) => {
    try {
        const admins = await Admin.find().sort('-createdAt')
        if(!admins){
            throw Error('Sorry, no admins found')
        }

        //send res to client
        res.status(200).json({
            status: 'success',
            data: admins
        })
    } catch (error) {
        res.status(500).json({
            status : 'failed',
            error : error,
            message : error.message
        })
    }
}

exports.getAudits = async(req,res) => {
    try {
        const audits = await Audit.find().sort('-createdAt')
        if(!audits) {
            throw Error('Sorry, no audits found')
        }
        //send res to client
        res.status(200).json({
            status: 'success',
            data: audits
        })
    } catch (error) {
        res.status(500).json({
            status : 'failed',
            error : error,
            message : error.message
        })
    }
}

// ADMIN AUTHENTICATIONS

exports.createAdmin = async(req,res) => {
    try {
        const {role, name,phone, email, password} = req.body
        const salt = await bcrypt.genSalt(10);
        const hashPassword = await bcrypt.hash(password, salt);
        const user = await Admin.create({role, name, email, phone, password: hashPassword})

        if(!user){
            throw Error('Sorry, no user found')
        }

        const superAdmin = await Admin.find({role: 'superadmin'})

        // send email to superAdmin
        sgMail.setApiKey(process.env.SENDGRID_API_KEY)
        const msg = {
            to: `${superAdmin.email}`, // Super Admin email
            from: 'noreply@wepaygh.com', // Change to your verified sender
            subject: 'New Admin Account',
            html: newAccountCreationMessage(req,
                'New Admin Account', `A new admin account (${role}) has been created successfully.<br> Account details are list below: <br> Email: ${email} <br> Full Name: ${name}`),
            }
    
            sgMail.send(msg).then(() => {
                console.log('Email sent to SuperAdmin')
            }).catch((error) => {
               // console.error(error)
               throw error
            })

        // send login deetails to new admin
        sgMail.setApiKey(process.env.SENDGRID_API_KEY)
        const message = {
            to: `${user.email}`, // Super Admin email
            from: 'noreply@wepaygh.com', // Change to your verified sender
            subject: 'New Admin Account',
            html: newAccountCreationMessage(req,
                'New Admin Account', `Your admin account (${role}) has been created successfully.<br> Account details are list below: <br> Email: ${email} <br> Password: ${password} <br> Full Name: ${name}`),
            }
    
            sgMail.send(message).then(() => {
                console.log('Email sent to new admin account')
            }).catch((error) => {
               // console.error(error)
               throw error
            })

        //create & send Notification
        await Activity.create({
            user: user._id,
            title: 'New Admin Account',
            body: 'Thank you for registering on WePayGh.'
        })

        //send Audit Trail
        await Audit.create({
            user: user._id,
            title: 'New User Registration',
            name: user.name,
            email: user.email,
            role: user.role
        })

        //res to client
        res.status(201).json({
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

exports.loginAdmin = async(req, res, next) => {
    
    try {
       
        const {email, password} = req.body
        const user = await Admin.findOne({email}).select('+password')
        if(!user) {
            throw Error('Invalid user credentials')
        }
        
        // verify password
        const verify = await bcrypt.compare(req.body.password, user.password)
        if(verify){
        // sign token
        let token = jwt.sign({id: user._id}, process.env.JWT_SECRET, {
            expiresIn : '5h',
        })
        const code = genCode();

        // save verification code in DB 
        user.verificationCode = code;
        user.save();
        
        // send cookie to browser //
        res.cookie('admin_jwt', token, { 
            expires: new Date(Date.now() + 5 * 60 * 60 * 1000), 
            // httpOnly: true,
            // sameSite: 'none', 
            // secure: true,
        })

            // send email
            sgMail.setApiKey(process.env.SENDGRID_API_KEY)
            const body = registerMessage(
                `Hi ${user.name.split(' ')[0]},<br>Almost there...`, 
                `Kindly use the code below to verify your login process. Please ignore this email and report to out support team if you did not login to WePay`,
                 code
                )
            const msg = {
            to: `${user.email}`, // Change to your recipient
            from: 'WePayGh <noreply@wepaygh.com>', // Change to your verified sender
            subject: 'Verification Code',
            html: body
            }

            sgMail.send(msg).then(() => {
                console.log('Email sent')
                }).catch(err => {
                    throw Error(err.message)
                })
            
            //send Audit Trail
            await Audit.create({
                user: user._id,
                title: 'Admin Login',
                name: user.name,
                email: user.email,
                role: user.role
            })


            //send res to client
            res.status(200).json({
                status: 'success',
                data: user
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


exports.verifyAdmin = async (req, res) => {
    try {
        // compare code to DB
        if(req.user.verificationCode == req.body.code){
            const user = await Admin.findById({_id: req.user.id})
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
        }else{
            throw Error('Invalid verification code. Try again')
        }
    } catch (error) {
        res.status(401).json({
            status:'failed',
            error: error,
            message: error.message
        })
    }
}

exports.approvalRequest = async(req, res) => {
    try {
        // console.log(req.body)
        // user status must changed to "Verified"
        const user = await User.findById({_id: req.body.id})
        const userLoan = await Loan.create({uid: user.id, limit: req.body.limit})
        const superAdmin = await Admin.find({role: 'superadmin'})
        if(!user) {
            throw Error('Sorry, no user found')
        }
        user.status = "Verified"
        user.isEligible = true
        await user.save()
        // console.log(userLoan)

        // send email to user
        sgMail.setApiKey(process.env.SENDGRID_API_KEY)
        const body = approvalRequestMessage(
            req,
            `Account Verification`, 
             `Congratulations ${user.name.firstname}, <br><br>
             We are glad to inform you that your WePay account has been verified successfully. 
             You are now eligible for a loan. Login to your dashboard to request for a Loan now`
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
            user: req.user.id,
            title: 'User Account Verification',
            name: req.user.name,
            email: req.user.email,
            role: req.user.role
        })

        // send res to client
        res.status(200).json({
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

// SECURITY PASSWORD CHECK
exports.passwordCheck = async (req, res) => {
    try {
        // console.log(req.body)
        const { password } = req.body
        const admin = await Admin.findById({_id: req.user._id}).select('+password')
        if(!admin){
            throw Error('Sorry, you are not authorized')
        }
        // verify password
        const verify = await bcrypt.compare(password, admin.password)
        if(!verify){
            throw Error('Sorry, invalid password')
        }
        //res to client
        res.status(200).json({
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

// VERIFY USER EMAIL
exports.verifyUserEmail = async (req,res) => {
    try {
        const { email } = req.body
        const user = await User.findOne({email});
        if(!user){
            throw Error('Sorry, no user found')
        }

        //update user email status
        if(user.completion === 75){
            user.verificationCode = undefined
            user.emailStatus = 25
            user.save()

            //update Pop state
            const pop = await Pop.findOne({userID: user._id });
            pop.eligible = true;
            pop.save()

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

            //res to client
            res.status(201).json({
                status: 'success',
            })

        }else {
            user.verificationCode = undefined
            user.emailStatus = 25
            user.save()
    
            //res to client
            res.status(201).json({
                status: 'success',
            })
        }

    } catch (error) {
        res.status(400).json({
            status:'failed',
            error: error,
            message: error.message
        })
    }
}

// UPDATE USER DETAILS
exports.updateUserDetails = async(req, res) => {
    try {
        const {id, field} = req.params
        if(field === 'Personal'){
            // console.log(req.body)
            const {fname, lname, other, dob, address, phone, occupation, company, companyAddress, monthlySalary, id_issue_date, id_expiry_date, notify} = req.body
            const user = await User.findById({_id: id})
            if(!user){
                throw Error('Sorry, no user found')
            }
            fname === '' ? null : user.name.firstname = fname.trim()
            lname === '' ? null : user.name.lastname = lname.trim()
            other === '' ? null : user.name.other = other.trim()
            dob === '' ? null : user.dob = new Date(dob).toDateString()
            address === '' ? null : user.address = address.trim()
            phone === '' ? null : user.phone = phone
            occupation === '' ? null : user.occupation = occupation.trim()
            company === '' ? null : user.company = company.trim()
            companyAddress === '' ? null : user.companyAddress = companyAddress.trim()
            id_expiry_date === '' ? null : user.nationalID.id_expiry_date = new Date(id_expiry_date).toDateString()
            id_issue_date === '' ? null : user.nationalID.id_issue_date = new Date(id_issue_date).toDateString()
            monthlySalary === '' ? null : user.monthlySalary = monthlySalary
            await user.save()

            if(notify){
                await sendSMS(`Dear ${user?.name?.firstname}, your WePayGH account details has been updated. Login https://wepaygh.com/`, user?.phone)
            }

            //send res to client
            res.status(200).json({
                status: 'success',
            })

        }
        if(field === 'Bank'){
            const {bank, accNumber, bankBranch, bankManager, security} = req.body
            const user = await User.findById({_id: id})

            if(!user){
                throw Error('Sorry, no user found')
            }

            bank === '' ? null : user.bank = bank.trim()
            accNumber === '' ? null : user.accNumber = accNumber
            bankBranch === '' ? null : user.bankBranch = bankBranch.trim()
            bankManager === '' ? null : user.bankManager = bankManager
            security === '' ? null : user.security = security.trim()

            const total = user.bankStatus + user.payStatus + user.photoStatus + user.ghcardStatus + user.emailStatus + user.bioStatus
            
            if(total == 50){
                user.bankStatus = 20
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
                user.isSubmitted = true
                await user.save()

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

// UPDATE USER ACCOUNT //
exports.updateUserDocuments = async(req, res, next) => {
    try {
        const {id, field} = req.params
         //fetch user from database
         const user = await User.findById({_id: id})

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
                    to: [...adminEmails, superAdmin[0].email], //bcc superadmin
                    from: 'WePayGh <noreply@wepaygh.com>', // Change to your verified sender
                    subject: 'New User Verification',
                    html: body
                    }
            
                    sgMail.sendMultiple(msg).then(() => {
                        console.log('Email sent to Admins')
                    }).catch((error) => {
                    // console.error(error)
                    throw error
                    })

                    
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

exports.updateUserPhoto = async(req, res, next) => {
    try {
         //fetch user from database
         const user = await User.findById({_id: req.params.id})
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

exports.updateUserPaySlip = async(req, res, next) => {
    // console.log(req.file)
    try {
         //fetch user from database
         const user = await User.findById({_id: req.params.id})
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

exports.updateUserGhCard = async(req, res, next) => {
    //console.log(req.file)
    try {
         //fetch user from database
         const user = await User.findById({_id: req.params.id})
         user.documents.ghcard = req.file.path;
         user.ghcardStatus = 10
         await user.save()

        // create notification
        await Notification.create({
            user: user._id,
            title: 'Document Submitted - Ghana Card',
            body: 'Thank you for providing us your Ghana Card.'
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

exports.updateUserSDO = async(req, res, next) => {
    try {
         //fetch user from database
         const user = await User.findById({_id: req.params.id})
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

exports.userApproval = async(req, res) => {
    try {
        const user = await User.findById({_id: req.body.id})
        const userLoan = await Loan.findOne({uid: req.body.id})
        const userCard = await Card.findOne({user: user._id})
        if(!user){
            throw Error('Sorry, no user found')
        }

        //update user loan details
        const loan = userLoan.loans.filter(el => el._id.toString() === req.body.loanId)[0]
        loan.status = 'Approved';
        loan.isActive = true;
        
        user.status = 'Approved'
        userCard.status = 'active'
        
        await userLoan.save()
        await userCard.save()
        await user.save()


        //send SMS to user
        const message = `Congratulations ${user.name.firstname}, we are glad to inform you that your WePay Loan request has been approved. You will be contacted by a Forbes official shortly.`;
        await AxiosInstance.post(
            `${process.env.SMS_HANDLER}?senderhandle=Forbes
            &recipients=${user.phone}&msg=${message}
            &accountemail=${process.env.SMS_ACC_EMAIL}
            &accountemailpwd=${process.env.SMS_ACC_PASSWORD}`
        )

        //send email to user
        sgMail.setApiKey(process.env.SENDGRID_API_KEY)
        const body = userApprovalMessage(
            req,
            `Congratulations ${user.fullname}!!`, 
             `We are happy to inform you that your Loan request has been verified and approved successfully. <br>
              Your user details are as follows:<br>
                User : ${user.fullname} <br>
                Email : ${user.email} <br>
                Phone : ${user.phone} <br>
                Approved Loan : GH¢${userCard.amount.toLocaleString()}
                <br><br>
            Login to your WePay account to access your card details. `)
        const msg = {
        to: `${user.email}`, // Change to your recipient
        from: 'WePayGh <noreply@wepaygh.com>', // Change to your verified sender
        subject: 'User Approval Request',
        html: body
        }

        await sgMail.send(msg)

        //send notification to admin
        await Activity.create({
            user: req.user.id,
            title: 'User Approval',
            body: `The WePay account user(<b>${user.fullname}</b>) has been successfully approved.`
        })

         // create notification
         await Notification.create({
            user: user._id,
            title: 'Account Approved',
            body: 'Congratulations!! Your Loan request has been verified and approved successfully'
        })

        // Audit trail
        await Audit.create({
            user: req.user.id,
            title: 'User Approval',
            name: req.user.name,
            email: req.user.email,
            role: req.user.role
        })

        // send res to client
        res.status(200).json({
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



exports.logoutAdmin = (req, res) => {
    res.clearCookie('admin_jwt');
    res.status(200).json({
        status : 'success'
    })
}
