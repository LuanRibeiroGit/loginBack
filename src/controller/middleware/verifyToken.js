
const jwt = require("jsonwebtoken");
const { jwt_token } = require('../../dbConfig/secrets')


async function verifyToken(req, res, next){
    const authHeader = req.headers["authorization"];
    console.log('Valid token')
    console.log("Auth Header:", authHeader);
    
    if(!authHeader || !authHeader.startsWith("Bearer ")){
        return res.status(401).json({ message: "Token não fornecido", status: 0 })
    }

    const token = authHeader.split(" ")[1]
    if(!token){
        return res.status(401).json({ message: "Token inválido", status: 0 })
    }

    try {
        const JWT_SECRET = jwt_token
        const decoded = jwt.verify(token, JWT_SECRET)
        req.user = decoded
        console.log(req.user)

        next();
    } catch (err) {
        return res.status(401).json({ message: "Token inválido ou expirado", status: 0 });
    }

}

module.exports = verifyToken;