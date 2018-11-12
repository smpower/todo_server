/**
 * Module dependencies
 */

var express = require('express');
var http = require('http');
var https = require('https');
var fs = require('fs');
var path = require('path');
var bodyParser = require('body-parser');
var mysql = require('mysql');

// 根据项目路径导入生成的证书文件
var privateKey = fs.readFileSync(path.join(__dirname, './certificate/private.pem'), 'UTF-8');
var certificate = fs.readFileSync(path.join(__dirname, './certificate/file.crt'), 'UTF-8');
var credentials = {key: privateKey, cert: certificate};

// var httpServer = http.createServer(app);
// var httpsServer = https.createServer(credentials, app);

var app = express();
var connection = mysql.createConnection({
  host: 'localhost',
  user: 'ruofei',
  password: 'rf.wangchn',
  database: 'todo'
});

// all environments
// 分别设置 http 和 https 的访问端口
// app.set('port', 8080);
app.set('PORT', 1115);
app.set('SSLPORT', 1116);

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));

// 允许 Express 跨域
app.all('*', function(req, res, next) {
  res.header('Access-Control-Allow-Origin', '');
  res.header('Access-Control-Allow-Method', 'PUT,POST,GET,DELETE,PATCH,OPTIONS');
  next();
});

// 测试 GET 请求
app.get('/todo/test/get', function(req, res, next) {
  console.group('前台通过 GET 方式传递过来的值:');
  console.log(req.query);
  console.groupEnd();

  // 返回给前台的 JSON 数据
  res.json({
    meta: {
      code: 200
    },
    data: {
      message: 'Hello world.'
    }
  });
});

// 测试 POST 请求
app.post('/todo/test/post', function(req, res, next) {
  console.group('前台通过 POST 方式传递过来的值:');
  console.log(req.body);
  console.groupEnd();

  // 返回给前台的 JSON 数据
  res.json({
    meta: {
      code: 200
    },
    data: {
      message: 'Hello world, again!'
    }
  });
});

app.post('/todo/regist', function(req, res, next) {
  console.log(req.body);
  const addSql = `INSERT INTO user(username, email, password) VALUES(?, ?, ?)`;
  const addSqlParams = [req.body.username, req.body.email, req.body.password];

  var connection = mysql.createConnection({
    host     : 'localhost',
    user     : 'ruofei',
    password : 'rf.wangchn',
    database : 'todo'
  });

  connection.connect();

  // connection.query('INSERT INTO user(username, email, password) VALUES(?, ? ,?)', [req.body.username, req.body.email, req.body.password],
  connection.query(addSql, addSqlParams, function(error, results, fields) {
    if (error) throw error;
    if (results.affectedRows === 1) res.json({isRegisted: true});
    else res.json({isRegisted: false});
  });

  // connection.query('SELECT * FROM user', function (error, results, fields) {
  //   if (error) throw error;
  //   console.log(results);
  //   res.json(results);
  // });

  connection.end();
});

app.post('/todo/login', function(req, res, next) {
  const selectSql = `SELECT * FROM user WHERE email = ? AND password = ?`;
  const selectSqlParams = [req.body.email, req.body.password];

  const connection = mysql.createConnection({
    host: 'localhost',
    user: 'ruofei',
    password: 'rf.wangchn',
    database: 'todo'
  });

  connection.connect();

  connection.query(selectSql, selectSqlParams, function(error, results, fields) {
    if (error) throw error;
    if (results.length === 1) res.json({isLogined: true});
    else res.json({isLogined: false});
  });
});

http.createServer(app).listen(app.get('PORT'), function() {
  console.log('Express server listening on port: ' + app.get('PORT'));
});

https.createServer(credentials, app).listen(app.get('SSLPORT'), function() {
  console.log('Express server listening on port: ' + app.get('SSLPORT'));
});

// http.createServer(app).listen(app.get('port'), function() {
//   console.log('Express server listening on port: ' + app.get('port'));
// });

// // 创建 http 服务器
// httpServer.listen(PORT, function() {
//   console.log('HTTP Server is running on port: %s', PORT);
// });
// 
// 
// // 创建 https 服务器
// httpsServer.listen(SSLPORT, function() {
//   console.log('HTTPS Server is running on port: %s', SSLPORT);
// });
// 
// // 根据请求判断是 http 还是 https
// app.get('/wundertodo/test', function(req, res) {
//   if (req.protocol === 'https') {
//     res.status(200).send('This is https visit!');
//   }
//   else {
//     res.status(200).send('This is http visit!');
//   }
// });
