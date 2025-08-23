const express = require('express')
const router = express.Router()
const user = require('../controller/user/user')
const verifyToken = require('../controller/middleware/verifyToken')

router.get('/teste', user.teste)
router.get('/valid-token', verifyToken, (req, res) => {
    res.json({ message: "Token válido!", user: req.user, status: 1 });
})

router.post('/register', user.register)
router.post('/login', user.login)

module.exports = router;