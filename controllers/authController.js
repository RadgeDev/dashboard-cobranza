
const jwt =  require('jsonwebtoken')
const bycryptjs = require('bcryptjs')
const conexion =  require('../database/db')
const {promisify} = require('util')
var fs = require('fs');
var bodyParser = require('body-parser');
var pdf = require('html-pdf');



//metodo para registrarnos
exports.register = async (req,res)=>{

    try {

        const name =  req.body.name
        const user =  req.body.user
        const pass =  req.body.pass
        let passHash = await bycryptjs.hash(pass,8)
       // console.log(passHash);
       conexion.query('INSERT INTO usuarios SET ?',{nombre:name,usuario:user,clave:passHash}, (error, results)=>{
           if(error){console.log(error)}
           res.redirect('/ingreso')

       })

        
    } catch (error) {
        console.log(error);
        
    }
   

}


exports.login = async (req,res)=>{
    try {
        const user = req.body.user
        const pass = req.body.pass        

        if(!user || !pass ){
            res.render('ingreso',{
                alert:true,
                alertTitle: "Advertencia",
                alertMessage: "Ingrese un usuario y password",
                alertIcon:'info',
                showConfirmButton: true,
                timer: false,
                ruta: 'ingreso'
            })
        }else{
            conexion.query('SELECT * FROM usuarios WHERE usuario = ?', [user], async (error, results)=>{
                
                if( results.length == 0 || ! (await bycryptjs.compare(pass, results[0].clave)) ){
                    res.render('ingreso', {
                        alert: true,
                        alertTitle: "Error",
                        alertMessage: "Usuario y/o Password incorrectas",
                        alertIcon:'error',
                        showConfirmButton: true,
                        timer: false,
                        ruta: 'ingreso'    
                    })
                }else{
                    //inicio de sesión OK
                   const id = results[0].usuario
                    const token = jwt.sign({id:id}, process.env.JWT_SECRETO, {
                        expiresIn: process.env.JWT_TIEMPO_EXPIRA
                    })
                    //generamos el token SIN fecha de expiracion
                   //const token = jwt.sign({id: id}, process.env.JWT_SECRETO)
                   //console.log("TOKEN: "+token+" para el USUARIO : "+user)

                   const cookiesOptions = {
                        expires: new Date(Date.now()+process.env.JWT_COOKIE_EXPIRES * 24 * 60 * 60 * 1000),
                        httpOnly: true
                   }
                   res.cookie('jwt', token, cookiesOptions) 
                   res.render('ingreso', {
                        alert: true,
                        alertTitle: "Conexión exitosa",
                        alertMessage: "¡LOGIN CORRECTO!",
                        alertIcon:'success',
                        showConfirmButton: false,
                        timer: 800,
                        ruta: ''
                   })
                }
            })
        }
    } catch (error) {
        console.log(error)
    }
}



exports.isAuthenticated = async (req, res, next)=>{
    if (req.cookies.jwt) {
        try {
            const decodificada = await promisify(jwt.verify)(req.cookies.jwt, process.env.JWT_SECRETO)


            conexion.query('SELECT * FROM usuarios WHERE usuario = ?', [decodificada.id], (error, results)=>{
                if(!results){
                    
                  return next()
                
                }
                req.usuario = results[0]
                return next()
            })
        } catch (error) {

            if (error.name === 'TokenExpiredError') 
                {
                  res.redirect('/ingreso') 
                  res.clearCookie('jwt');
                  return next();
                }else{

                   console.log(error)
                   return next()
                }
            
      
        }
    }else{
        res.redirect('/ingreso')        
    }
}

exports.logout = (req, res)=>{
    res.clearCookie('jwt')   
    return res.redirect('/')
}


exports.showMeta = async (req, res,next)=>{
    try {
        var date = new Date();
        var firstDay =  (new Date(date.getFullYear(), date.getMonth(), 1)).toISOString().split('T')[0];
        conexion.query('CALL RECAUDACION_2022(?)',[firstDay],  (error, results)=>{
            if(!results){return next()}
            req.datos = JSON.stringify(results) ; 
            return next()
        })
     } catch (error) {
        console.log(error)

    }
}

exports.showcobrador = async (req, res,next)=>{
    try {
        var date = new Date();
         var firstDay =  (new Date(date.getFullYear(), date.getMonth(), 1)).toISOString().split('T')[0];
         var lastDay = (new Date(date.getFullYear(), date.getMonth() + 1, 0)).toISOString().split('T')[0];
    
        conexion.query('CALL MONITOR_EXCUSAS(?,?)',[firstDay,lastDay],  (error, results)=>{
            if(!results){return next()}
            req.datos = results[0] ; 
            return next()
        })
     } catch (error) {
        console.log(error)

    }
}


exports.metacobrador = async (req, res,next)=>{
    try {
        var date = new Date();
         var firstDay =  (new Date(date.getFullYear(), date.getMonth(), 1)).toISOString().split('T')[0];
         var lastDay = (new Date(date.getFullYear(), date.getMonth() + 1, 0)).toISOString().split('T')[0];
    
        conexion.query('select  fecha,FLOOR((DayOfMonth(fecha)-1)/7)+1  as  SEMANA,SUM(programa) as META_GESTION,SUM(entregado) as ENTREGADOS , SUM(entregado) -  SUM(programa) as RESULTADO from monitor_gestion where fecha between ?  and ? group by 2;'
        ,[firstDay,lastDay],  (error, results)=>{
            if(!results){; return next()}
            req.metas = results ; 
            return next()
        })
     } catch (error) {
        console.log(error)

    }
}



exports.showRecaudacion = async (req, res,next)=>{
    try {

         var date = new Date();
         var firstDay =  (new Date(date.getFullYear(), date.getMonth(), 1)).toISOString().split('T')[0];
         var lastDay = (new Date(date.getFullYear(), date.getMonth() + 1, 0)).toISOString().split('T')[0];

         let sql ='select c0(IFNULL(SUM(MONT_TRAN),0)) RTOTAL, '  +
         'c0(IFNULL(SUM(IF(FOL_EECC > 0 , MONT_TRAN ,0)),0)) AS RNORMAL,' +
         'c0(IFNULL(SUM(IF(FOL_EECC = 0 , MONT_TRAN ,0)),0)) AS RCASTIGO,' +
         'c0(IFNULL(SUM(IF(FEC_TRAN = CURDATE() , MONT_TRAN ,0)),0)) AS RHOY,'+
         'c0(IFNULL(SUM(IF(FOL_EECC > 0 AND FEC_TRAN = CURDATE() , MONT_TRAN ,0)),0)) AS RNORMALHOY,'+
         'c0(IFNULL(SUM(IF(FOL_EECC = 0 AND FEC_TRAN = CURDATE() , MONT_TRAN ,0)),0)) AS RCASTIGOHOY '+
         ' from abonos where FEC_TRAN  BETWEEN ? AND LAST_DAY(?)  and N_TRAN NOT IN(select N_TRAN  from transac WHERE N_MAQUI = 68)';
         conexion.query(sql,[firstDay,lastDay],  (error, results)=>{
            if(!results){return next()}
            req.recaudado = JSON.stringify(results) ; 
            return next()
        })
     } catch (error) {
        console.log(error)

    }
}


exports.reca = async (req,res)=>{
    try {
        const fecini = req.body.fecha
       
        if(!fecini ){
            res.send("VACIO");
        }else{
            
            format = toDate(fecini);
       
            var date = new Date(format);
            var firstDay =  (new Date(date.getFullYear(), date.getMonth(), 1)).toISOString().split('T')[0];
            conexion.query('CALL RECAUDACION_2022(?)',[firstDay],  (error, results)=>{
               if(results){
                res.send(results[0]);
        
               }
           }) 

          
        }
    } catch (error) {
        console.log(error)
    }
}

exports.resumen = async (req,res)=>{
    try {
        const fecini = req.body.fecha

        if(!fecini ){
            res.send("VACIO");
        }else{
            
            format = toDate(fecini);

        
            var date = new Date(format);
            var firstDay =  (new Date(date.getFullYear(), date.getMonth(), 1)).toISOString().split('T')[0];
            var lastDay = (new Date(date.getFullYear(), date.getMonth() + 1, 0)).toISOString().split('T')[0];
            let sql ='select c0(IFNULL(SUM(MONT_TRAN),0)) RTOTAL, '  +
            'c0(IFNULL(SUM(IF(FOL_EECC > 0 , MONT_TRAN ,0)),0)) AS RNORMAL,' +
            'c0(IFNULL(SUM(IF(FOL_EECC = 0 , MONT_TRAN ,0)),0)) AS RCASTIGO' +
            ' from abonos where FEC_TRAN  BETWEEN ? AND LAST_DAY(?)  and N_TRAN NOT IN(select N_TRAN  from transac WHERE N_MAQUI = 68)';
   
            conexion.query(sql,[firstDay,lastDay],  (error, results)=>{
               if(results){
                res.send(results[0]);
        
               }
           }) 

          
        }
    } catch (error) {
        console.log(error)
    }
}


exports.gettramo = async (req,res)=>{
    try {
        const rut = req.body.rut
 
        if(!rut ){
            res.send("VACIO");
        }else{
                     
            conexion.query(' select rut,nombre,dias,tramo,comuna from asignaciones_guardadas where rut = ? ',[rut],  (error, results)=>{
               if(results.length > 0){
                   res.send(results[0]);
               }else{
                  res.send("NoDatos");
               }
           }) 

          
        }
    } catch (error) {
        console.log(error)
    }
}


exports.updatetramo = async (req,res)=>{
    try {
        const rut = req.body.rut
        const dias = req.body.dias
        const tramo = req.body.tramo
     if(!rut ||!dias ||!tramo  ){
            res.send("VACIO");
        }else{
                     
            conexion.query(' update asignaciones_guardadas set dias = ? ,tramo = ?  where rut = ? ',[dias,tramo,rut],  (error, results)=>{
                if (error) throw err;
                res.send("ACTUALIZADO");
               

              });
        }
    } catch (error) {
        console.log(error)
    }
}



exports.crearpdf = async (req,res)=>{
    try {
        
        var html = fs.readFileSync('./pdf/plantilla/plantilla.html', 'utf8');
        console.log(html);
        if (!html){
            res.status(400).send("Missing 'htmlPath'");
            return;
        }
        // you may want to change this path dynamically if you also wish to keep the generated PDFs
        var pdfFilePath = './pdf/archivo/repacta.pdf';
        var options = { format: 'Letter' };


       pdf.create(html, options).toFile(pdfFilePath, function(err, res) {
       if (err) return console.log(err);
         //console.log(res); // { filename: '/app/businesscard.pdf' }
         return 'OK';
       });
       
    } catch (error) {
        console.log(error)
    }
}




function toDate(dateStr) {
    var parts = dateStr.split("-")
    return new Date(parts[2], parts[1] - 1, parts[0])
  }


