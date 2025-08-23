const express = require('express')
const userRoutes = require('./src/routes/user')
const cors = require('cors');

const app = express()
const port = process.env.PORT || 4000;

app.use(cors());

app.use(express.json())
app.use('/', userRoutes)


app.listen(port, ()=>{
    console.log(`Servidor iniciado na porta ${port}`)
})