const express = require('express')
const cookieParser = require('cookie-parser');
const userRoutes = require('./src/routes/user')
const cors = require('cors');

const app = express()
const port = process.env.PORT || 4000;

app.use(cors({
  origin: "http://192.168.15.13:5173", // seu frontend
  credentials: true, // permite envio de cookies/autenticação
}));

app.use(express.json())
app.use(cookieParser())
app.use('/', userRoutes)


app.listen(port, ()=>{
    console.log(`Servidor iniciado na porta ${port}`)
})