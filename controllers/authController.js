
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
        const privi =  req.body.privilegios
        let passHash = await bycryptjs.hash(pass,8)
       // console.log(passHash);
       conexion.query('INSERT INTO usuarios SET ?',{nombre:name,usuario:user,clave:passHash,privilegios:privi}, (error, results)=>{
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
                        alertMessage: "Bienvenido a CYD SPA",
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
                req.privi= results[0].privilegios
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
          
            date = new Date();
            fecini =  (new Date(date.getFullYear(), date.getMonth(), 1)).toISOString().split('T')[0];
            lastDay = (new Date(date.getFullYear(), date.getMonth() + 1, 0)).toISOString().split('T')[0];
 
    
        conexion.query('CALL MONITOR_EXCUSAS(?,?,?)',[fecini,lastDay,2],  (error, results)=>{
            if(!results){return next()}
            req.datos = results[0] ; 
            return next()
        })
       
     } catch (error) {
        console.log(error)

    }
}




exports.cobradoresultado = async (req,res)=>{
    try {
        const fecini = req.body.fecha
        const fecfin = req.body.fecha2
        const tipo = req.body.tipo
        if(isEmpty(fecini) || isEmpty(fecfin)  ){
            res.send("VACIO");
        }else{
            
         
            conexion.query('CALL MONITOR_EXCUSAS(?,?,?)',[fecini,fecfin,tipo],  (error, results)=>{
               if(results){
                res.send(results[0]);
        
               }
           }) 

          
        }
    } catch (error) {
        console.log(error)
    }
}



function isEmpty(str) {
    return (!str || str.length === 0 );
}


exports.metacobrador = async (req, res,next)=>{
    try {
        var date = new Date();
         var firstDay =  (new Date(date.getFullYear(), date.getMonth(), 1)).toISOString().split('T')[0];
         var lastDay = (new Date(date.getFullYear(), date.getMonth() + 1, 0)).toISOString().split('T')[0];
         let sql = 'select  a.SEMANA as SEMANA,a.META_GESTION as META_GESTION,a.ENTREGADOS as ENTREGADO, a.RESULTADO AS RESULTADO from '+
         ' (select  fecha,FLOOR((DayOfMonth(fecha)-1)/7)+1  as  SEMANA,SUM(programa) as META_GESTION,SUM(entregado) as ENTREGADOS , SUM(entregado) -  SUM(programa) as RESULTADO from monitor_gestion where fecha between ?  and ? group by 2)a '+
         ' UNION ALL ' +
         ' select  "TOTAL" as Total,SUM(a.META_GESTION) as META_GESTION,SUM(a.ENTREGADOS) as ENTREGADO, SUM(a.RESULTADO) AS RESULTADO from '+
         ' (select  fecha,FLOOR((DayOfMonth(fecha)-1)/7)+1  as  SEMANA,SUM(programa) as META_GESTION,SUM(entregado) as ENTREGADOS , SUM(entregado) -  SUM(programa) as RESULTADO from monitor_gestion where fecha between ?  and ? group by 2)a;'
  
    
        conexion.query(sql,[firstDay,lastDay,firstDay,lastDay],  (error, results)=>{
            if(!results){; return next()}
            req.metas = results ; 
            return next()
        })
     } catch (error) {
        console.log(error)

    }
}

exports.metacobradorgeneral = async (req,res)=>{
    try {
        const fecini = req.body.fecha
        const fecfin = req.body.fecha2
        
        let sql = 'select  a.SEMANA as SEMANA,a.META_GESTION as META_GESTION,a.ENTREGADOS as ENTREGADO, a.RESULTADO AS RESULTADO from '+
        ' (select  fecha,FLOOR((DayOfMonth(fecha)-1)/7)+1  as  SEMANA,SUM(programa) as META_GESTION,SUM(entregado) as ENTREGADOS , SUM(entregado) -  SUM(programa) as RESULTADO from monitor_gestion where fecha between ?  and ? group by 2)a '+
        ' UNION ALL ' +
        ' select  "TOTAL" as Total,SUM(a.META_GESTION) as META_GESTION,SUM(a.ENTREGADOS) as ENTREGADO, SUM(a.RESULTADO) AS RESULTADO from '+
        ' (select  fecha,FLOOR((DayOfMonth(fecha)-1)/7)+1  as  SEMANA,SUM(programa) as META_GESTION,SUM(entregado) as ENTREGADOS , SUM(entregado) -  SUM(programa) as RESULTADO from monitor_gestion where fecha between ?  and ? group by 2)a;'
 
        if(isEmpty(fecini) || isEmpty(fecfin)  ){
            res.send("VACIO");
        }else{
            
         
            conexion.query(sql,[fecini,fecfin,fecini,fecfin],  (error, results)=>{
               if(results){
                res.send(results);
        
               }
           }) 

          
        }
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




exports.resumen_cobrador = async (req,res)=>{
    try {
        const fecini = req.body.fecha
        const fecfin = req.body.fecha2



        if(isEmpty(fecini) || isEmpty(fecfin)   ){
            res.send("VACIO");
        }else{
            
           /* format = toDate(fecini);
            format2 = toDate(fecfin);

        
            var date = new Date(format);
            var date2 = new Date(format2);
            var firstDay =  (new Date(date.getFullYear(), date.getMonth(), 1)).toISOString().split('T')[0];
            var lastDay = (new Date(date2.getFullYear(), date.getMonth() + 1, 0)).toISOString().split('T')[0];
            */
            var firstDay = fecini;
            var lastDay = fecfin;
            var cobradors = cobrador;

            let sql =
            'select fecha,cobrador,programa,entregado,deficit' +
            ' from  MONITOR_GESTION where fecha BETWEEN  ? and ? and cobrador = ?'+
            ' UNION ALL ' +
            ' select "Total" as Total,cobrador,SUM(programa) as programa ,SUM(entregado),SUM(deficit) ' +
            ' from  MONITOR_GESTION where fecha BETWEEN  ? and ? and cobrador = ? ;';
            conexion.query(sql,[firstDay,lastDay,cobradors,firstDay,lastDay,cobradors],  (error, results)=>{
               if(results){
             
                res.send(results);
               }
           }) 

          
        }
    } catch (error) {
        console.log(error)
    }
}

exports.resumen_cob_recaudacion = async (req,res)=>{
    try {
        const fecini = req.body.fecha
        const fecfin = req.body.fecha2
        const tipo = req.body.tipo



        if(isEmpty(fecini) || isEmpty(fecfin)   ){
            res.send("VACIO");
        }else{
            
           /* format = toDate(fecini);
            format2 = toDate(fecfin);

        
            var date = new Date(format);
            var date2 = new Date(format2);
            var firstDay =  (new Date(date.getFullYear(), date.getMonth(), 1)).toISOString().split('T')[0];
            var lastDay = (new Date(date2.getFullYear(), date.getMonth() + 1, 0)).toISOString().split('T')[0];
            */
            console.log(tipo);
            conexion.query('CALL RESUMEN_COBRADORES(?,?,?)',[fecini,fecfin,tipo],  (error, results)=>{
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

exports.demandados = async (req,res)=>{
    
    try {
        var filtrox = req.body.filtro;
        const fecex = req.body.fechaexcusa;
        const fecex2 = req.body.fechaexcusa2;
        const fecabo = req.body.fechaabono;
        const fecabo2 = req.body.fechaabono2;
        const docu = req.body.documentox;
        const loca = req.body.localidad;
        const sector = req.body.sector;
        const capmax = req.body.capmax;
        const capmin = req.body.capmin;
       // console.log(filtrox+docu + loca + sector + capmax + capmin);
        let sql = "";
  
 
     
       // console.log(filtrox+fecex+fecex2+fecabo+fecabo2+docu);

        switch (filtrox) {
          
            case 'Demandados':
                   
            sql = 'select RUT, C0(CAPITAL), DATE_FORMAT(FEC_EXCUSA,"%Y-%m-%d") AS "FEC_EXCUSA", UBICABILIDAD, DOCUMENTO, LOCALIDAD, SECTOR, DEMANDA_ACTIVA, DATE_FORMAT(FECHA_DEMANDA,"%Y-%m-%d") as "FECHA_DEMANDA" , ' +
            '  DOCUMENTO_SUGERIDO, FECHA_ULT_ABONO ,TRAMO , DATE_FORMAT(FECHA_CAIDA,"%Y-%m-%d") AS "FECHA_CAIDA" from monitor_priorizador where  FEC_EXCUSA BETWEEN ? and ?  and DOCUMENTO IN ( ? )  '  +
            ' and UBICABILIDAD NOT  IN("Inubicable","Fallecido") ' +
            ' and FECHA_ULT_ABONO BETWEEN  ? and ? order by rut asc  ;'
    
            conexion.query(sql,[fecex,fecex2,docu,fecabo,fecabo2],  (error, results)=>{
               if(results){
             //   console.log(results);
                res.send(results);
        
               }
                   }) 

             
            break;
           
            case 'Seguimiento':

                sql = 'select RUT, C0(CAPITAL), DATE_FORMAT(FEC_EXCUSA,"%Y-%m-%d") AS "FEC_EXCUSA", UBICABILIDAD, DOCUMENTO, LOCALIDAD, SECTOR, DEMANDA_ACTIVA, DATE_FORMAT(FECHA_DEMANDA,"%Y-%m-%d") as "FECHA_DEMANDA" , ' +
                '  DOCUMENTO_SUGERIDO, FECHA_ULT_ABONO ,TRAMO , DATE_FORMAT(FECHA_CAIDA,"%Y-%m-%d") AS "FECHA_CAIDA" from monitor_priorizador where  FEC_EXCUSA BETWEEN ? and ?  and DOCUMENTO IN ( ? )  '  +
                ' and UBICABILIDAD NOT  IN("Inubicable","Fallecido","Bajo Puerta") ' +
                ' and FECHA_ULT_ABONO BETWEEN  ? and ? order by rut asc  ;'
             
                conexion.query(sql,[fecex,fecex2,docu,fecabo,fecabo2],  (error, results)=>{
                   if(results){
                
                    res.send(results);
            
                   }
                   }) 
            
           
               break;
           
               case 'Redemandar Mayor 180 dias':

                sql = 'SELECT RUT, C0(CAPITAL), DATE_FORMAT(FEC_EXCUSA,"%Y-%m-%d") AS "FEC_EXCUSA", UBICABILIDAD, DOCUMENTO, LOCALIDAD, SECTOR, DEMANDA_ACTIVA, DATE_FORMAT(FECHA_DEMANDA,"%Y-%m-%d") as "FECHA_DEMANDA" , ' +
                '  DOCUMENTO_SUGERIDO, FECHA_ULT_ABONO ,TRAMO , DATE_FORMAT(FECHA_CAIDA,"%Y-%m-%d") AS "FECHA_CAIDA" from monitor_priorizador  where  FECHA_DEMANDA > DATE_SUB(NOW(),interval 180 day)  and UBICABILIDAD NOT  IN("Inubicable","Fallecido") '  +
                ' and FECHA_ULT_ABONO BETWEEN ? AND ?  and FEC_EXCUSA BETWEEN ? AND ? ;'
               
                conexion.query(sql,[fecex,fecex2,fecabo,fecabo2],  (error, results)=>{
                   if(results){
                
                    res.send(results);
            
                   }
                   }) 
           
               break;
           
             case 'Demandas T11 u Otras':
             
                sql = 'SELECT RUT, C0(CAPITAL), DATE_FORMAT(FEC_EXCUSA,"%Y-%m-%d") AS "FEC_EXCUSA", UBICABILIDAD, DOCUMENTO, LOCALIDAD, SECTOR, DEMANDA_ACTIVA, DATE_FORMAT(FECHA_DEMANDA,"%Y-%m-%d") as "FECHA_DEMANDA" , ' +
                '  DOCUMENTO_SUGERIDO, FECHA_ULT_ABONO ,TRAMO , DATE_FORMAT(FECHA_CAIDA,"%Y-%m-%d") AS "FECHA_CAIDA" from monitor_priorizador where DOCUMENTO_SUGERIDO = "DEMANDAR" and CAPITAL BETWEEN  ? AND ? and  sector = ? ' +
                '  and localidad in(?) and UBICABILIDAD NOT  IN("Inubicable","Fallecido");' 
           
                conexion.query(sql,[capmin,capmax,sector,loca],  (error, results)=>{
                   if(results){
                   // console.log(results);
                    res.send(results);
            
                   }
                   }) 
         
               break;
           
               case 'Carta Terreno':
           
                sql = 'SELECT RUT, C0(CAPITAL), DATE_FORMAT(FEC_EXCUSA,"%Y-%m-%d") AS "FEC_EXCUSA", UBICABILIDAD, DOCUMENTO, LOCALIDAD, SECTOR, DEMANDA_ACTIVA, DATE_FORMAT(FECHA_DEMANDA,"%Y-%m-%d") as "FECHA_DEMANDA" , ' +
                '  DOCUMENTO_SUGERIDO, FECHA_ULT_ABONO ,TRAMO , DATE_FORMAT(FECHA_CAIDA,"%Y-%m-%d") AS "FECHA_CAIDA" from  monitor_priorizador where  DOCUMENTO_SUGERIDO = "DEMANDAR" AND  CAPITAL BETWEEN ?  and ? and FECHA_ULT_ABONO ' +
                '  BETWEEN ?  and ? and SECTOR = ?  and LOCALIDAD IN (?)  ;' 
           
                conexion.query(sql,[capmin,capmax,fecabo,fecabo2,sector,loca],  (error, results)=>{
                   if(results){
                 
                    res.send(results);
            
                   }
                   }) 
  
               break;


               case 'Carta Correo':
   
                sql = 'SELECT RUT, C0(CAPITAL), DATE_FORMAT(FEC_EXCUSA,"%Y-%m-%d") AS "FEC_EXCUSA", UBICABILIDAD, DOCUMENTO, LOCALIDAD, SECTOR, DEMANDA_ACTIVA, DATE_FORMAT(FECHA_DEMANDA,"%Y-%m-%d") as "FECHA_DEMANDA" , ' +
                '  DOCUMENTO_SUGERIDO, FECHA_ULT_ABONO ,TRAMO , DATE_FORMAT(FECHA_CAIDA,"%Y-%m-%d") AS "FECHA_CAIDA" from  monitor_priorizador where  DOCUMENTO_SUGERIDO = "CARTA" AND  CAPITAL BETWEEN ?  and ? and FECHA_ULT_ABONO ' +
                '  BETWEEN ?  and ? and SECTOR = ?  and LOCALIDAD IN (?)  ;' 
           
                conexion.query(sql,[capmin,capmax,fecabo,fecabo2,sector,loca],  (error, results)=>{
                   if(results){
                 
                    res.send(results);
            
                   }
                   }) 
  
               break;
           
          /*
     
           
               case 'Correo':
        
               break;
           */
           
              default:
               //Declaraciones ejecutadas cuando ninguno de los valores coincide con el valor de la expresión
             
               res.send("VACIOOP");
               break;
           
           }

          
        
    } catch (error) {
        console.log(error)
    }
}


exports.getFechaCargaRuta = async (req,res)=>{
    try {
       
 
                     
            conexion.query(' SELECT DATE_FORMAT(fecha,"%Y-%m-%d") as fecha  FROM rutas_cobranza_monitor  group by fecha order by fecha desc limit 10;',  (error, results)=>{
               if(results.length > 0){
                   res.send(results);
               }else{
                  res.send("NoDatos");
               }
           }) 

          
        
    } catch (error) {
        console.log(error)
    }
}

exports.getNumeroCarga = async (req,res)=>{
    try {
       
            const feccarga = req.body.fecha
                     
            conexion.query(' SELECT n_carga FROM rutas_cobranza_monitor where   fecha = ?  group by n_carga order by n_carga asc;',[feccarga],   (error, results)=>{
               if(results.length > 0){
                   res.send(results);
               }else{
                   res.send("NoDatos");
               }
           }) 

          
        
    } catch (error) {
        console.log(error)
    }
}


exports.getComboCobrador = async (req,res)=>{
    try {
       
            const feccarga = req.body.fecha
            const ncarga = req.body.ncarga
                     
            conexion.query(' SELECT cobrador FROM rutas_cobranza_monitor where   fecha = ? and n_carga = ?  group by cobrador;',[feccarga,ncarga],   (error, results)=>{
               if(results.length > 0){
                   res.send(results);
               }else{
                   res.send("NoDatos");
               }
           }) 

          
        
    } catch (error) {
        console.log(error)
    }
}

exports.getGoogle = async (req,res)=>{
    try {
       
            onexion.query(' SELECT rut FROM base_inubicables WHERE rut LIKE "%' + rreq.query.key+ '%"',(error, results)=>{
                if(results.length > 0){
                    res.send(results);
                    var data = [];
                  for (i = 0; i < results.length; i++) {
                    data.push(results[i].rut);
                    }      
                    console.log('paso');
                    res.send(JSON.stringify(data));

                }else{
                    res.send("NoDatos");
                }
            }) 

          
        
    } catch (error) {
        console.log(error)
    }
}



/*
exports.getResumenGeneral = async (req,res)=>{
    try {
       
            const fecha = req.body.fecha
            const ncarga = req.body.ncarga
            const cobrador = req.body.cobrador
            const radio = req.body.radiox
            
            if(cobrador != null && radio === 'todos' ){

                sql = 'SELECT fecha,rut,nombre,FECHA_ULT_ESCUSA(rut)"ult escusa",saldo,deuda_total,tramo,cobrador,comuna,direccion,GET_EXPLICA_COB(rut,cobrador, ?) "gestion" FROM rutas_cobranza_monitor where fecha = ? and n_carga = ? ;'

            }
            else if (cobrador != null && radio === 'gestionados' ){

                sql = 'SELECT fecha,rut,nombre,FECHA_ULT_ESCUSA(rut)"ult escusa",saldo,deuda_total,tramo,cobrador,comuna,direccion,GET_EXPLICA_COB(rut,cobrador, ?) "gestion" FROM rutas_cobranza_monitor where fecha = ? and n_carga = ? HAVING gestion = 1 ;'
            }
            
            else if (cobrador != null && radio === 'nogestionados')
            {
                sql = 'SELECT fecha,rut,nombre,FECHA_ULT_ESCUSA(rut)"ult escusa",saldo,deuda_total,tramo,cobrador,comuna,direccion,GET_EXPLICA_COB(rut,cobrador, ?) "gestion" FROM rutas_cobranza_monitor where fecha = ? and n_carga = ? HAVING gestion = 0 ;'
            }

            else if (radio === 'todos')
            {
                sql = 'SELECT fecha,rut,nombre,FECHA_ULT_ESCUSA(rut)"ult escusa",saldo,deuda_total,tramo,cobrador,comuna,direccion,GET_EXPLICA_COB(rut,cobrador, ?) "gestion" FROM rutas_cobranza_monitor where cobrador = ? and fecha = ? and n_carga = ?  ;';

            }
            else if (radio === 'gestionados')
            {
                sql = 'SELECT fecha,rut,nombre,FECHA_ULT_ESCUSA(rut)"ult escusa",saldo,deuda_total,tramo,cobrador,comuna,direccion,GET_EXPLICA_COB(rut,cobrador, ?) "gestion" FROM rutas_cobranza_monitor where cobrador = ?  and fecha = ? and n_carga = ? HAVING gestion = 1  ;';
            }
            else if (radio === 'nogestionados')
            {
                sql = 'SELECT fecha,rut,nombre,FECHA_ULT_ESCUSA(rut)"ult escusa",saldo,deuda_total,tramo,cobrador,comuna,direccion,GET_EXPLICA_COB(rut,cobrador, ?) "gestion" FROM rutas_cobranza_monitor where cobrador = ? and fecha = ? and n_carga = ?  HAVING gestion = 0  ;';
            }


                     
            conexion.query(sql,[feccarga,ncarga],   (error, results)=>{
               if(results.length > 0){
                   res.send(results);
               }else{
                   res.send("NoDatos");
               }
           }) 

          
        
    } catch (error) {
        console.log(error)
    }
}
*/



function toDate(dateStr) {
    var parts = dateStr.split("-")
    return new Date(parts[2], parts[1] - 1, parts[0])
  }


