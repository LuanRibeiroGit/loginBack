const sql = require('mssql')
const dbConfig = require('../../dbConfig/dbConfig')
const {authenticate} = require('../../auth/auth')
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
                FUNCIONARIO,
                NOME,
                EMAIL,
                SENHA,
                STATUS
                FROM FUNCIONARIOS
                WHERE EMAIL = '${mail}'
        `)
        const user = result.recordset[0]
        if(!user || !user.STATUS){
            console.log('mail not registered')
            return res.status(400).json({message: `E-mail não cadastrado.`, status: 0})
        }
        
        if(hashedPass !== user.SENHA){
            console.log('invalid pass')
            return res.status(400).json({message: `Senha inválida.`, status: 0})
        }
        
        const accessToken = jwt.sign(
            { id: user.FUNCIONARIO, email: user.EMAIL },
            JWT_SECRET_ACCESS,
            { expiresIn: "1m" }
        )

        const refreshToken = jwt.sign(
            { id: user.FUNCIONARIO, email: user.EMAIL },
            JWT_SECRET_REFRESH,
            { expiresIn: "2m" }
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
                DATEADD(MINUTE, 2, GETDATE()),
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




async function register(req,res){
    const {name, surname, gender, business, branch, fone, mail, pass, confirmPass, position} = req.body
    const userEmployee = {name, surname, gender, business, branch, fone, mail, pass, confirmPass, position}

    
    const auth = await authenticate(req, res)
    if(!auth){
        return res.status(401).send('User refused.')
    }

    for(const [key, value] of Object.entries(userEmployee)){
        if(!value){
            return res.status(400).json({message: `O campo '' ${key} '' é obrigatório.`, status: 0})
        }
        if(['business','branch','position'].includes(key)){
            if(!/^\d+$/.test(value) || value <= 0){
                return res.status(400).json({message: `Somente valores maiores que 0 são permitidos no campo '' ${key} ''`, status: 0})
            }
        }
        if(value.length > 1000){
            return res.status(400).json({message: `O campo ${key} não pode ter mais de 100 digitos.`, status: 0})
        }
    }

    if(!["M","F","O"].includes(gender)){
        return res.status(400).json({message: `É obrigatório que o genero sejá M, F ou O`, status: 0})
    }

    if(!/^\d+$/.test(fone) || fone.length != 13){
        return res.status(400).json({message: `É obrigatorio o telefone ter 13 digitos.`, status: 0})
    }

    if(pass.length <= 8){
        return res.status(400).json({message: `É obrigatorio a senha ter mais de 8 digitos.`, status: 0})
    }
    
    const hashedPass = criarHash(pass, salt);
    const hashedConfirmPass = criarHash(confirmPass, salt);
    
    if(hashedPass !== hashedConfirmPass){
        return res.status(400).json({message: `As senhas não conferem.`, status: 0})
    }
    try {
        const pool = await sql.connect(dbConfig.dbMain)

        const result = await pool.request().query(`
            SELECT
                EMAIL,
                STATUS
                FROM FUNCIONARIOS
                WHERE EMAIL = '${mail}'  
        `)

        const employee = result.recordset[0]
        
        if(employee){
            console.log(employee.STATUS)
            if(!employee.STATUS){
                await pool.request().query(`
                    DELETE FROM FUNCIONARIOS WHERE EMAIL = '${mail}'
                `)
            }else{
                console.log('mail already registered')
                return res.status(400).json({message: `E-mail já cadastrado.`, status: 0})
            }
        }

        await pool.request().query(`
            INSERT INTO FUNCIONARIOS (
                NOME,
                SOBRENOME,
                SEXO,
                EMPRESA,
                FILIAL,
                TELEFONE,
                EMAIL,
                SENHA,
                DATA_CONTRATACAO,
                CARGO,
                STATUS
            ) VALUES (
                '${name}',
                '${surname}',
                '${gender}',
                ${business},
                ${branch},
                '${fone}',
                '${mail}',
                '${hashedPass}',
                '2022-01-10',
                ${position},
                1
            )
        `)
        console.log('created sucsses')
        res.status(201).json({message: `Usuário ${name} ${surname} criado com sucesso.`, status: 1})


    } catch(error) {
        console.error(error)
        res.status(400).json({error})
    } finally {
        sql.close()
    }
}

module.exports = {
    teste,
    register,
    login,
    logout,
}

