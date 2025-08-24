const express = require('express')
const router = express.Router()
const user = require('../controller/user/user')
const verifyToken = require('../controller/middleware/verifyToken')

router.get('/teste', user.teste)
router.get('/logout', user.logout)
router.get('/valid-token', verifyToken.verifyToken)
router.get('/generate-access-token', verifyToken.generateAccessToken)

router.post('/register', user.register)
router.post('/login', user.login)

module.exports = router;