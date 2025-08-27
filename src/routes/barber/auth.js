const express = require('express')
const router = express.Router()
const auth = require('../../controller/barber/auth')
const verifyToken = require('../../controller/middleware/verifyToken')
const checkRole = require('../../controller/middleware/checkRole')

router.get('/valid-token', verifyToken.verifyToken, (req,res) => {
        res.json({ message: "Token válido!", status: 1 })
})
router.get('/check-role', verifyToken.verifyToken, checkRole.checkRole({ allowedRoles: [1] }), (req,res) => {
    res.json({ message: "User Valido", status: 1 })
})


router.get('/teste', auth.teste)
router.get('/logout', auth.logout)
router.get('/generate-access-token', verifyToken.generateAccessToken)

router.post('/login', auth.login)

module.exports = router