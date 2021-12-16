const express = require('express')
const conexion = require('../database/db')
const router = express.Router()

const authController = require('../controllers/authController')

// en rutador par alas vistas

router.get('/ingreso',(req,res)=>{
  //conexion()
  res.render('ingreso',{alert:false})
})


router.get('/',authController.isAuthenticated,authController.showMeta,authController.showRecaudacion,(req,res)=>{
  res.render('index_dash',{user:req.usuario,resultado:req.datos,abonos:req.recaudado})

  
})


router.get('/dashboard',authController.isAuthenticated,(req,res)=>{
  res.render('index_dash')
})

router.get('/historico',authController.isAuthenticated,authController.showMeta,authController.showRecaudacion,(req,res)=>{
  res.render('recaudacion_hist',{user:req.usuario,resultado:req.datos,abonos:req.recaudado,alert:false})

})


router.get('/mcobrador',authController.isAuthenticated,authController.showcobrador,authController.metacobrador,(req,res)=>{
  res.render('monitor_cobradores',{user:req.usuario,resultado:req.datos,metacob:req.metas ,alert:false})

})



router.get('/registro',authController.isAuthenticated,(req,res)=>{
  res.render('registro')
})


router.get('/tramo',authController.isAuthenticated,(req,res)=>{
  res.render('cambio_tramo',{user:req.usuario,alert:false})
})


router.get('/pdf',authController.isAuthenticated,(req,res)=>{
  res.render('crear_pdf',{user:req.usuario,alert:false})
})


//enrutador para los metodos del controller
router.post('/register',authController.register)
router.post('/formLogin',authController.login)
router.get('/logout',authController.logout)

router.post('/formReca',authController.reca)
router.post('/resumen',authController.resumen)
router.post('/gettramo',authController.gettramo)
router.post('/updatetramo',authController.updatetramo)
router.post('/crearpdf',authController.crearpdf)






module.exports = router