const sql = require('mssql')
const dbConfig = require('../../dbConfig/dbConfig')
const crypto = require('crypto')

const salt = ''
function criarHash(senha, salt){
    const hash = crypto.createHmac('sha256', salt).update(String(senha)).digest('hex')

    return hash
}

async function barbers(req,res) {
    console.log('Validação de cargo')
    console.log(req.user)
    try {
        const pool = await sql.connect(dbConfig.dbMain)
        const request = await pool.request().query(`
            SELECT * FROM FUNCIONARIOS WHERE EMPRESA = '${req.user.business}' AND FILIAL = '${req.user.branch}' AND STATUS = 1
        `)
        const barber = request.recordset
        res.status(201).json({message: `Retornando funcionarios.`, barber, status: 1})
    } catch(error) {
        console.error(error)
        res.status(400).json({error})
    } finally {
        sql.close()
    }
}


async function register(req,res){
    const {name, surname, gender, business, branch, fone, mail, pass, confirmPass, position} = req.body
    const userEmployee = {name, surname, gender, business, branch, fone, mail, pass, confirmPass, position}

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

        const request = await pool.request().query(`
            SELECT
                EMAIL,
                STATUS
                FROM FUNCIONARIOS
                WHERE EMAIL = '${mail}'  
        `)

        const employee = request.recordset[0]
        
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
    register,
    barbers,

}

