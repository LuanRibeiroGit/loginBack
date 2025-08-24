
const jwt = require("jsonwebtoken")
const sql = require('mssql')
const dbConfig = require('../../dbConfig/dbConfig')
const { JWT_SECRET_ACCESS, JWT_SECRET_REFRESH } = require('../../dbConfig/secrets')


async function verifyToken(req, res, next){
    const authHeader = req.headers["authorization"]
    console.log('Valid token')
    console.log("Auth Header:", authHeader)
    
    if(!authHeader || !authHeader.startsWith("Bearer ")){
        return res.status(401).json({ message: "Token não fornecido", status: 0 })
    }

    const token = authHeader.split(" ")[1]
    if(!token){
        return res.status(401).json({ message: "Token inválido", status: 0 })
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET_ACCESS)
        req.user = decoded
        console.log(req.user)

        next()
        res.json({ message: "Token válido!", user: req.user, status: 1 })
    } catch (err) {
        return res.status(401).json({ message: "Token inválido ou expirado", status: 0 })
    }

}

async function generateAccessToken(req,res) {
    console.log("generate token")
    const refreshToken = req.cookies.refreshToken
    console.log(refreshToken)
    
    if(!refreshToken){
        return res.status(401).json({ message: "Token inválido ou expirado, refaça o login", status: 0 })
    }
    
    try {
        const decoded = jwt.verify(refreshToken, JWT_SECRET_REFRESH)
        console.log(1)
        console.log(decoded)

        const accessToken = jwt.sign(
                    { id: decoded.ID, email: decoded.EMAIL },
                    JWT_SECRET_ACCESS,
                    { expiresIn: "1m" }
                )
        
        console.log(`New access token: ${accessToken}`)
        res.json({ message: "Refresh Token válido!", accessToken, status: 1 })

    } catch {
        console.log('Token inválido ou expirado')

        try {
            const pool = await sql.connect(dbConfig.dbMain)
            await pool.request().query(`
                IF EXISTS (SELECT 1 
                        FROM FUNCIONARIOS_REFRESH_TOKENS 
                        WHERE REFRESH_TOKEN = '${refreshToken}'
                        )
                BEGIN
                    DELETE FROM FUNCIONARIOS_REFRESH_TOKENS
                    WHERE REFRESH_TOKEN = '${refreshToken}'
                END
            `)
            
            res.clearCookie("refreshToken", {
                httpOnly: true,
                secure: false,   // se usar https
                sameSite: "strict"
                })
        } catch (error){
            console.error(error)
            res.status(400).json({error})
        }


        return res.status(401).json({ message: "Token inválido ou expirado, refaça o login", status: 0 })
    }


}

module.exports = {
    verifyToken,
    generateAccessToken
}