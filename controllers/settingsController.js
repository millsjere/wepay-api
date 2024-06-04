const Interest  = require('../models/interestModel')


exports.getInterest = async (req, res) => {
    try {
        const interest = await Interest.find();

        //res to client
        res.status(200).json({
            status: 'success',
            data: interest[0]
        })
    } catch (error) {
        res.status(500).json({
            status: 'failed',
            error,
            message: error.message
        })
    }
}

exports.updateInterest = async (req, res) => {
    try {
        const { rate } = req.body
        const interest = await Interest.find()

        interest[0].rate = rate;
        interest[0].save()

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

exports.editInterest = async (req, res) => {
    try {
        const { duration, rate } = req.body
        const interest = await Interest.findOne({duration});
        if(!interest) {
            throw Error('Sorry, this interest duration does not exist. Please add')
        }
        interest.rate = rate;
        interest.save()

        //res to client
        res.status(200).json({
            status: 'success',
            data: interest
        })
    } catch (error) {
        res.status(500).json({
            status: 'failed',
            error,
            message: error.message
        })
    }
}