/**
 * Module dependencies
 */

var express = require('express');
var http = require('http');
var https = require('https');
var fs = require('fs');
var bodyParser = require('body-parser');
var mysql = require('mysql');


var app = express();
var connection = mysql.createConnection({
  host: 'localhost',
  user: 'ruofei',
  password: 'rf.wangchn',
  database: 'todo'
});

// all environments
app.set('port', 1115);

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));

// 允许 Express 跨域
app.all('*', function(req, res, next) {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Method', 'PUT,POST,GET,DELETE,PATCH,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  res.header('Content-Type', 'application/json;charset=UTF-8');
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
    console.log(results);
    if (results.length === 1) res.json({isLogined: true});
    else res.json({isLogined: false});
  });
});

http.createServer(app).listen(app.get('port'), function() {
  console.log('Express HTTP server listening on port: ' + app.get('port'));
});

https.createServer({
  key: fs.readFileSync('./certificate/privatekey.pem'),
  cert: fs.readFileSync('./certificate/certificate.pem')
}, app).listen(1116, function() {
  console.log('Express HTTPS server listening on port: 1116');
});

app.get('/', function (req, res) {
  res.header('Content-type', 'text/html');
  return res.end('<h1>Hello, Secure World!</h1>');
});
