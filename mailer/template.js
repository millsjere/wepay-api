
const activateEMail = (req, link) => {
    window.open(`https://${req.headers.host}/auth/activate?etk=${link}`, '_blank', 'width=800, height=800')
}
exports.registerMessage = (title, copy, code) => {
    return `<div style="min-width: 300px; max-width: 500px; margin: 0 auto; border: 1px solid orange; border-radius: 10px; font-family: 'Google Sans'; padding: 30px; background: white">
    <img src='https://res.cloudinary.com/dafaoedml/image/upload/v1678722350/wepay/logo_pl4va6.png' alt='wepay-logo' width='30%' style="display: block; margin: 0 auto;" />
    <h2 style="font-weight: 100; font-size: 24px; text-align: center">${title}</h2> 
    \n
    \n <p style="font-size: 15px">${copy}</p>
    \n
    \n
        <div style="padding: 10px 20px; text-align: center; background-color: #f7f7f7; border-radius: 8px">
            <p style="font-size: 36px; font-weight: 600; margin: 0">${code}</p>
        </div>
    \n
    \n
    <p>That wasn't me! If the above sign-up attempt wasn't you, please ignore this email.</p>
        
    </div>
    `
}

exports.loginVerificationMessage = (title, copy) => {
    return `<div style="min-width: 300px;max-width: 500px; margin: 0 auto; border: 1px solid orange; font-family: 'Google Sans'; padding: 20px; background: white">
    <h3 style="font-weight: 100; font-size: 24px">${title}</h3> 
    \n
    \n <p style="font-size: 15px">${copy}</p>
        </div>
    `
}

exports.resetPasswordMessage = (req, title, copy, link) => {
    return `<div style="min-width: 300px;max-width: 500px; margin: 0 auto; border: 1px solid orange; font-family: 'Google Sans'; padding: 20px; background: white">
    <h3 style="font-weight: 100; font-size: 24px">${title}</h3> 
    \n
    \n <p style="font-size: 15px">${copy}</p>
    \n
        <a style="display: inline-block; cursor: pointer; border: none; border-radius: 5px padding: 10px 17px; text-decoration: none; background: orange; color: white;" 
        href="https://${req.headers.host}/auth/resetpassword?tk=${link}", target="_blank">Reset Password
        </a>
        </div>
    `
}

exports.newUserVerificationMessage = (req, title, copy) => {
    return `<div style="font-family: 'Google Sans'; padding: 20px; background: #dfdfdf;min-width: 300px; max-width: 500px; margin: 0 auto;">
                <div style="background: white">
                    <div style=" padding: 20px; background: #3f5176">
                        <h3 style="font-weight: 100; font-size: 24px; color: white">${title}</h3> 
                    </div>
                    \n
                    <div style=" padding: 20px;">
                        \n <p style="font-size: 15px">${copy}</p>
                        \n
                            <a style="display: inline-block; cursor: pointer; border: none; padding: 17px;text-decoration: none; background: orange; color: white;" 
                            href="https://${req.headers.host}/dashboard" target="_blank">View Client Details</a>
                    </div>

                </div>
            <div>
    `
}

exports.newAccountCreationMessage = (req, title, copy) => {
    return `<div style="font-family: 'Google Sans'; padding: 20px; background: #dfdfdf;min-width: 300px; max-width: 500px; margin: 0 auto;">
                <div style="background: white">
                    <div style=" padding: 20px; background: #3f5176">
                        <h3 style="font-weight: 100; font-size: 24px; color: white">${title}</h3> 
                    </div>
                    \n
                    <div style=" padding: 20px;">
                        \n <p style="font-size: 15px">${copy}</p>
                        \n
                        
                    </div>

                </div>
            <div>
    `
}

exports.approvalRequestMessage = ( title, copy) => {
    return `<div style="font-family: 'Google Sans'; padding: 20px; background: #dfdfdf;min-width: 300px; max-width: 500px; margin: 0 auto;">
                <div style="background: white">
                    <div style=" padding: 20px; background: #3f5176">
                        <h3 style="font-weight: 100; font-size: 24px; color: white">${title}</h3> 
                    </div>
                    \n
                    <div style=" padding: 20px;">
                        \n <p style="font-size: 15px">${copy}</p>
                        \n

                    </div>

                </div>
            <div>
    `
}

exports.userApprovalMessage = (req, title, copy) => {
    return `<div style="font-family: 'Google Sans'; padding: 20px; background: #dfdfdf;min-width: 300px; max-width: 500px; margin: 0 auto;">
                <div style="background: white">
                    <div style=" padding: 20px; background: #3f5176">
                        <h3 style="font-weight: 100; font-size: 24px; color: white">${title}</h3> 
                    </div>
                    \n
                    <div style=" padding: 20px;">
                        \n <p style="font-size: 15px">${copy}</p>
                        \n

                        <a style="display: inline-block; cursor: pointer; border: none; padding: 17px;text-decoration: none; background: orange; color: white;" 
                        href="https://${req.headers.host}/auth/login" target="_blank">Get Card Details
                        </a>   
                    </div>

                </div>
            <div>
    `
}
