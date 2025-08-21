const express = require('express')
const router = express.Router()
const user = require('../controller/user/user')

router.get('/teste', user.teste)

router.post('/register', user.register)

module.exports = router;