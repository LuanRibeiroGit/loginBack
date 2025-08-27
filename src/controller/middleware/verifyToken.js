
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
        //console.log(req.user)

        next()
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

        try {
            const pool = await sql.connect(dbConfig.dbMain)
            const request = await pool.request().query(`
                SELECT
                    B.*,
                    A.REFRESH_TOKEN
                FROM FUNCIONARIOS_REFRESH_TOKENS AS A
                    JOIN FUNCIONARIOS AS B ON A.FUNCIONARIO = B.FUNCIONARIO 
                WHERE REFRESH_TOKEN = '${refreshToken}'
            `)
            const user = request.recordset[0]

            console.log(user)
            
            if(!user){
                console.log('refresh token não esta no banco')
                return res.status(401).json({ message: "Token inválido ou expirado, refaça o login", status: 0 })
            }


            console.log(1)
            console.log(decoded)

            const accessToken = jwt.sign(
                {   
                    id: user.FUNCIONARIO,
                    name: user.NOME,
                    surname: user.SOBRENOME,
                    business: user.EMPRESA,
                    branch: user.FILIAL,
                    role: user.CARGO,
                    email: user.EMAIL,
                },
                JWT_SECRET_ACCESS,
                { expiresIn: "30m" }
            )
            
            console.log(`New access token: ${accessToken}`)
            res.json({ message: "Refresh Token válido!", accessToken, status: 1 })
        } catch (error){
            console.error(error)
            res.status(400).json({error, status: 0})
        } finally {
            sql.close()
        }
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
                secure: false,
                sameSite: "strict"
                })
        } catch (error){
            console.error(error)
            res.status(400).json({error, status: 0})
        }finally {
            sql.close()
        }


        return res.status(401).json({ message: "Token inválido ou expirado, refaça o login", status: 0 })
    }


}

module.exports = {
    verifyToken,
    generateAccessToken,
}