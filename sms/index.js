
const axios = require('axios')
const https = require('https')

// At instance level
const AxiosInstance = axios.create({
    httpsAgent: new https.Agent({  
      rejectUnauthorized: false
    })
});


const sendSMS = async(message, phone) => {
    //send SMS to user
    // const message = `Congratulations ${user.name.firstname}, we are glad to inform you that your WePay account has been verified successfully. You are now eligible for a loan. Login to your dashboard to request for a Loan now`;
    await AxiosInstance.post(
        `${process.env.SMS_HANDLER}?senderhandle=Forbes
        &recipients=${phone}&msg=${message}
        &accountemail=${process.env.SMS_ACC_EMAIL}
        &accountemailpwd=${process.env.SMS_ACC_PASSWORD}`
    )
}


const checkSMSCredit = async(message, phone) => {
    //send SMS to user
    // const message = `Congratulations ${user.name.firstname}, we are glad to inform you that your WePay account has been verified successfully. You are now eligible for a loan. Login to your dashboard to request for a Loan now`;
    const res = await AxiosInstance.get(
        `${process.env.SMS_CREDIT}?tsk=getBalance&eml=${process.env.SMS_ACC_EMAIL}&emlpwd=${process.env.SMS_ACC_PASSWORD}`
    )

    return res
}


module.exports = { sendSMS, checkSMSCredit }

