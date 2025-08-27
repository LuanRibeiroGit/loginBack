const sql = require('mssql')
const dbConfig = require('../../dbConfig/dbConfig')

function checkRole({allowedRoles = []}){
    return async (req, res, next) => {
    console.log('check role')
    console.log(1)

    console.log(req.user)
    console.log(allowedRoles)
    if (!req.user) {
        return res.status(401).json({ message: "Não autenticado", status: 0 })
    }

    try {
        const pool = await sql.connect(dbConfig.dbMain)
        const request = await pool.request().query(`
            SELECT
                A.FUNCIONARIO,
                A.NOME,
                A.SOBRENOME,
                A.EMAIL,
                A.EMPRESA,
                A.FILIAL,
                A.CARGO,
                b.NOME_CARGO
                FROM FUNCIONARIOS AS A
                JOIN CARGOS AS B ON A.CARGO = B.CARGO AND
                                    A.EMPRESA = B.EMPRESA AND
                                    A.FILIAL = B.FILIAL
                WHERE A.EMAIL = '${req.user.email}'
        `)
        const verifyRole = request.recordset[0]
        console.log(verifyRole)
        console.log(2)
        if(!verifyRole){
            return res.status(401).json({ message: "Acesso negado: sem permissão", status: 0 })
        }

        if (!allowedRoles.includes(req.user.role)) {
            return res.status(401).json({ message: "Acesso negado: sem permissão", status: 0 })
        }

        sql.close()
        next()
    } catch (error){
        console.error(error)
        res.status(400).json({error, status: 0})
    }

}}

module.exports = {
    checkRole,
}