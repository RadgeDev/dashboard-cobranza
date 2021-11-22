const express = require('express')
const dotenv = require('dotenv')
const cookieParser = require('cookie-parser')

const app = express()

//stear motor de plantillas
app.set('view engine','ejs')
//setear carpeta public
app.use(express.static('public'))


//variables de entorno
app.use(express.urlencoded({extended:true}))
app.use(express.json())

//setear variables de entorno
dotenv.config({path:'./env/.env'})

//para poder trabajar con las cookies
app.use(cookieParser())


//app.get('/',(req,res)=>{
 //res.render('index')

//})
//llamar router
app.use('/',require('./routes/router'))




app.listen(3000,()=>{
    console.log('NODE INICIADO');

})


app.use(function(req, res, next) {
    if (!req.usuario)
        res.header('Cache-Control', 'private, no-cache, no-store, must-revalidate');
    next();
});