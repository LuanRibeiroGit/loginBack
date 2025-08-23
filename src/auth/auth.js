const sql = require('mssql')
const dbConfig = require('../dbConfig/dbConfig')
const crypto = require('crypto')

const salt = ''
function criarHash(senha, salt){
    const hash = crypto.createHmac('sha256', salt)
                       .update(String(senha))
                       .digest('hex')

    return hash
}

async function authenticate(req, res) {
    const authHeader = req.headers["authorization"]

    if (!authHeader || !authHeader.startsWith("Basic ")) {
        console.log("Authorization header missing");
        return false
    }


    const base64Credentials = authHeader.split(" ")[1];
    const credentials = Buffer.from(base64Credentials, "base64").toString("utf8");
    const [userAuth, passAuth] = credentials.split(":");

    const hashedPassAuth = criarHash(passAuth, salt);
    const hashedUserAuth = criarHash(userAuth, salt);

    try {
        const pool = await sql.connect(dbConfig.dbMain)
        const request = await pool.request().query(`
            SELECT * FROM CONTROL_USER
        `)
        const userAuthDb = request.recordset[0]
        if(userAuthDb.USER_CONTROL === hashedUserAuth && userAuthDb.PASS_CONTROL === hashedPassAuth){
            console.log('authenticate')
            return true
        }else{
            console.log('User refused')
            return false
        }
    } catch (error) {
        console.error(error)
        return res.status(400).json({error})
    } finally {
        sql.close()
    }
}


module.exports = {
    authenticate,
}