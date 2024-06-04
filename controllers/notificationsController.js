const jwt = require('jsonwebtoken');
const Notification = require('../models/notificationModel');



exports.getUserNotifications = async(req, res) => {
    try {

        if(req.cookies.user_jwt) {
            //verify the token
            const decoded = jwt.verify(req.cookies.user_jwt, process.env.JWT_SECRET) 

            //find user in DB using 
            const user = await Notification.find({user: decoded.id}).select('-__v').sort('-createdAt');
            if(user){
                //send res to client
                res.status(200).json({
                    status : "success",
                    data : user
                });

            }else{
                //send res to client
                res.status(200).json({
                    status : "no user notifications",
                });
            }
          
        }else {
            //send res to client
            throw Error('No user found')
        }

    } catch (error) {
        res.status(401).json({
            status: 'failed',
            error: error,
            message: error.message
        })
    }
}

exports.markAsRead = async(req, res, next) => {
    try {
        const notify = await Notification.findById({_id: req.params.id}).sort('-createdAt')
        if(!notify){
            throw Error('Sorry, no notification found.')
        }
        notify.status = 'read'
        await notify.save()

        next()
    } catch (error) {
        res.status(500).json({
            status: 'failed',
            error: error,
            message: error.message
        })
    }
}