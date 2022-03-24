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
  
  if (!req.privi || req.privi != 'Administrador') {
    res.render('no_autorizacion',{user:req.usuario,alert:false})
  }else{
    res.render('recaudacion_hist',{user:req.usuario,resultado:req.datos,abonos:req.recaudado,alert:false})

  }

})


router.get('/mcobrador',authController.isAuthenticated,authController.showcobrador,authController.metacobrador,(req,res)=>{
  res.render('monitor_cobradores',{user:req.usuario,resultado:req.datos,metacob:req.metas ,alert:false})

})


router.get('/resumen_cobradores',authController.isAuthenticated,(req,res)=>{
  res.render('resumen_cobradores',{user:req.usuario,alert:false})

})


router.get('/desglose_gestion',authController.isAuthenticated,(req,res)=>{
  res.render('desglose_gestion',{user:req.usuario,alert:false})

})




router.get('/priorizador',authController.isAuthenticated,(req,res)=>{

  if (!req.privi || req.privi != 'Administrador') {
    res.render('no_autorizacion',{user:req.usuario,alert:false})
  }else{
    res.render('priorizador_demandas',{user:req.usuario,alert:false})

  }
  

})



router.get('/registro',authController.isAuthenticated,(req,res)=>{
  res.render('registro')
})


router.get('/tramo',authController.isAuthenticated,(req,res)=>{
  
  if (!req.privi || req.privi != 'Administrador') {
    res.render('no_autorizacion',{user:req.usuario,alert:false})
  }else{
    res.render('cambio_tramo',{user:req.usuario,alert:false})

  }
 
})


router.get('/pdf',authController.isAuthenticated,(req,res)=>{
  res.render('crear_pdf',{user:req.usuario,alert:false})
})


router.get('/recaudacion_detalle',authController.isAuthenticated,authController.showMeta,authController.showRecaudacion,(req,res)=>{
  res.render('recaudacion_detalle',{user:req.usuario,resultado:req.datos,abonos:req.recaudado,alert:false})

})


router.get('/inubicables',authController.isAuthenticated,authController.showMeta,authController.showRecaudacion,(req,res)=>{
  res.render('buscador_inubicable',{user:req.usuario,resultado:req.datos,abonos:req.recaudado,alert:false})

})


router.get('/monitor_rutas',authController.isAuthenticated,authController.showMeta,authController.showRecaudacion,(req,res)=>{
  res.render('monitor_rutas',{user:req.usuario,resultado:req.datos,abonos:req.recaudado,alert:false})

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
router.post('/resumen_cobrador',authController.resumen_cobrador)
router.post('/resumen_cob_recaudacion',authController.resumen_cob_recaudacion)
router.post('/resumen_gestion_diarias',authController.resumen_gestion_diarias)


router.post('/cobradoresultado',authController.cobradoresultado)
router.post('/metacobradorgeneral',authController.metacobradorgeneral)
router.post('/demandados',authController.demandados)
router.post('/cargaComboFecha',authController.getFechaCargaRuta)
router.post('/cargaNumeroCarga',authController.getNumeroCarga)
router.post('/cargaCobrador',authController.getComboCobrador)
router.post('/buscador',authController.getGoogle)
router.get('/Descargapdf', (req, res) => {
  res.download('/root/cobranza_cyd/pdf/archivo/repacta.pdf');
});

module.exports = router