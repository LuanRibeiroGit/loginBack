const sql = require('mssql')
const dbConfig = require('../../dbConfig/dbConfig')

async function teste(req,res) {
    res.status(201).json({message: 'Hello world'})
    console.log('asdfasd')
}

module.exports = {
    teste,
}