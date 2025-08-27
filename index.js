const express = require('express')
const cookieParser = require('cookie-parser');
const authRoutes = require('./src/routes/barber/auth')
const barberRoutes = require('./src/routes/barber/barber')
const cors = require('cors');

const app = express()
const port = process.env.PORT || 4000;

app.use(cors({
  origin: "http://192.168.15.13:5173", // seu frontend
  credentials: true, // permite envio de cookies/autenticação
}));

app.use(express.json())
app.use(cookieParser())
app.use('/', authRoutes, barberRoutes)


app.listen(port, ()=>{
    console.log(`Servidor iniciado na porta ${port}`)
})