const express = require('express')
const router = express.Router()
const barber = require('../../controller/barber/barber')
const verifyToken = require('../../controller/middleware/verifyToken')
const checkRole = require('../../controller/middleware/checkRole')


router.post('/register', verifyToken.verifyToken, barber.register)
router.get('/barbers', verifyToken.verifyToken, checkRole.checkRole({ allowedRoles: [1] }), barber.barbers)


module.exports = router;