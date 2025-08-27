const sql = require('mssql')
const dbConfig = require('../../dbConfig/dbConfig')
const {authenticate} = require('../../authApiLogin/authApiLogin')
const crypto = require('crypto')
const jwt = require("jsonwebtoken");
const { JWT_SECRET_ACCESS, JWT_SECRET_REFRESH } = require('../../dbConfig/secrets')


const salt = ''
function criarHash(senha, salt){
    const hash = crypto.createHmac('sha256', salt).update(String(senha)).digest('hex')

    return hash
}

async function teste(req,res) {
    res.status(201).json({message: 'Hello world'})
}





async function logout(req,res) {
    const refreshToken = req.cookies.refreshToken
    console.log(refreshToken)

    if(!refreshToken){
        console.log('Não possui refresh em cookie')
        return res.status(201).json({message: `Não possui refresh em token`, status: 1})
    }

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
        res.status(400).json({error})
    } finally {
        sql.close()
    }
    res.status(201).json({message: `Você saiu`, status: 1})
}




async function login(req,res) {
    const auth = await authenticate(req, res)
    if(!auth){
        return res.status(401).send('User refused.')
    }

    const {mail, pass, deviceInfo} = req.body
    const hashedPass = criarHash(pass, salt);
    const userEmployee = {mail, pass}
    for(const [key, value] of Object.entries(userEmployee)){
        if(!value || value == 0){
            return res.status(400).json({message: `O campo '' ${key} '' é obrigatório.`, status: 0})
        }
    }

    try {
        const pool = await sql.connect(dbConfig.dbMain)
        const result = await pool.request().query(`
            SELECT
                *
                FROM FUNCIONARIOS
                WHERE EMAIL = '${mail}'
        `)
        const user = result.recordset[0]
        if(!user || !user.STATUS || user.EMAIL !== mail){
            console.log('mail not registered')
            return res.status(400).json({message: `E-mail não cadastrado.`, status: 0})
        }
        
        if(hashedPass !== user.SENHA){
            console.log('invalid pass')
            return res.status(400).json({message: `Senha inválida.`, status: 0})
        }
        
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

        const refreshToken = jwt.sign(
            { id: user.FUNCIONARIO, email: user.EMAIL },
            JWT_SECRET_REFRESH,
            { expiresIn: "2h" }
        )

        await pool.request().query(`
            DELETE FROM FUNCIONARIOS_REFRESH_TOKENS
            WHERE EXPIRES_AT < GETDATE() AND EMAIL = '${user.EMAIL}'
        `)

        await pool.request().query(`
            INSERT INTO FUNCIONARIOS_REFRESH_TOKENS (
                FUNCIONARIO,
                NOME,
                EMAIL,
                REFRESH_TOKEN,
                EXPIRES_AT,
                DEVICE_INFO
                )
            VALUES (
                ${user.FUNCIONARIO},
                '${user.NOME}',
                '${user.EMAIL}',
                '${refreshToken}',
                DATEADD(HOUR, 2, GETDATE()),
                '${deviceInfo}'
            )
        `)

        res.cookie("refreshToken", refreshToken, {
            httpOnly: true,          
            secure: false,           // false no localhost, true em produção https
            sameSite: "Lax",         // pode usar "Strict" em produção
            maxAge: 7 * 24 * 60 * 60 * 1000, 
            path: "/"                
        });

        

        console.log(accessToken)
        res.status(200).json({message: `Bem vindo ${user.NOME}.`, accessToken: accessToken, status: 1})


    } catch (error){
        console.error(error)
        res.status(400).json({error})
    } finally {
        sql.close()
    }
}





module.exports = {
    teste,
    login,
    logout,
}

