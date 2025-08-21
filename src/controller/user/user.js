const sql = require('mssql')
const dbConfig = require('../../dbConfig/dbConfig')
const crypto = require('crypto')

const salt = ''
function criarHash(senha, salt){
    const hash = crypto.createHmac('sha256', salt)
                       .update(senha)
                       .digest('hex')

    return hash
}

async function teste(req,res) {
    res.status(201).json({message: 'Hello world'})
    console.log('asdfasd')
}

async function register(req,res){
    const {name, surname, gender, business, branch, fone, mail, pass, confirmPass, position} = req.body
    const userEmployee = {name, surname, gender, business, branch, fone, mail, pass, confirmPass, position}

    const authHeader = req.headers["authorization"]
    const base64Credentials = authHeader.split(" ")[1];
    const credentials = Buffer.from(base64Credentials, "base64").toString("utf8");
    const [userAuth, passAuth] = credentials.split(":");

    try {
        const pool = await sql.connect(dbConfig.dbMain)
        const request = await pool.request().query(`
            SELECT * FROM CONTROL_USER
        `)
        const userAuthDb = request.recordset[0]
        
        if(userAuthDb.USER_CONTROL === userAuth && userAuthDb.PASS_CONTROL === passAuth){
            console.log('authenticate')
            

            for(const [key, value] of Object.entries(userEmployee)){
                if(!value){
                    return res.status(400).json({message: `O campo '' ${key} '' é obrigatório.`,status: 0})
                }
                if(['business','branch','position'].includes(key)){
                    if(!/^\d+$/.test(value) || value <= 0){
                        return res.status(400).json({message: `Somente valores maiores que 0 são permitidos no campo '' ${key} ''`,status: 0})
                    }
                }
                if(value.length > 1000){
                    return res.status(400).json({message: `O campo ${key} não pode ter mais de 100 digitos.`,status: 0})
                }
            }

            if(!["M","F","O"].includes(gender)){
                return res.status(400).json({message: `É obrigatório que o genero sejá M, F ou O`,status: 0})
            }

            if(!/^\d+$/.test(fone) || fone.length != 13){
                return res.status(400).json({message: `É obrigatorio o telefone ter 13 digitos.`,status: 0})
            }

            if(pass.length <= 8){
                return res.status(400).json({message: `É obrigatorio a senha ter mais de 8 digitos.`,status: 0})
            }
            
            const hashedPass = criarHash(pass, salt);
            const hashedConfirmPass = criarHash(confirmPass, salt);
            
            if(hashedPass !== hashedConfirmPass){
                return res.status(400).json({message: `As senhas não conferem.`,status: 0})
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
                    '${pass}',
                    '2022-01-10',
                    ${position},
                    1
                )
            `)
            console.log('created sucsses')
            res.status(201).json({message: `Usuário ${name} ${surname} criado com sucesso.`, status: 1})

        }else{
            return res.status(401).send('User refused.')
        }
    }catch(error){
        console.error(error)
        res.status(400).json({error})
    }


}

module.exports = {
    teste,
    register,
}

