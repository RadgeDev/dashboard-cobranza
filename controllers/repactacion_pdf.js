const conexion =  require('../database/db')
const {promisify} = require('util')
var fs = require('fs');
var pdf = require('html-pdf');
var html = fs.readFileSync('./test/businesscard.html', 'utf8');


var options = { format: 'Letter' };

pdf.create(html, options).toFile('.pdf/businesscard.pdf', function(err, res) {
  if (err) return console.log(err);
  console.log(res); // { filename: '/app/businesscard.pdf' }
});