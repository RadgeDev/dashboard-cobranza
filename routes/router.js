const express = require('express')
const conexion = require('../database/db')
const router = express.Router()

const authController = require('../controllers/authController')

// en rutador par alas vistas

router.get('/ingreso',(req,res)=>{
  //conexion()
  res.render('ingreso',{alert:false})
})


router.get('/',authController.isAuthenticated,authController.showUsers,authController.showRecaudacion,(req,res)=>{
  res.render('index_dash',{user:req.usuario,resultado:req.datos,abonos:req.recaudado})

  
})


router.get('/dashboard',(req,res)=>{
  res.render('index_dash')
})


router.get('/registro',authController.isAuthenticated,(req,res)=>{
  res.render('registro')
})


//enrutador para los metodos del controller
router.post('/register',authController.register)
router.post('/formLogin',authController.login)
router.get('/logout',authController.logout)





module.exports = router