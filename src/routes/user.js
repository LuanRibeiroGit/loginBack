const express = require('express')
const router = express.Router()
const user = require('../controller/user/user')

router.get('/teste', user.teste)

router.post('/register', user.register)
router.post('/login', user.login)

module.exports = router;