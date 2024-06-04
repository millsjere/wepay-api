const UserTransactions  = require('../models/transactionsModel')

exports.addTransactions = async(req, res) => {
    try {
        for (let index = 0; index < req.body.length; index++) {
           await UserTransactions.create(req.body[index])
           console.log('transaction created') 
        }
        //fetch all transactions
        const allTransactions = await UserTransactions.find()
        if(allTransactions){
            res.status(201).json({
                count: req.body.length,
                message: 'All transactions data uploaded successfully',
                transactions: allTransactions
            })
        }

    } catch (error) {
        res.status(500).json({
            message: 'Upload Failed',
            error: error,
        })
    }
}