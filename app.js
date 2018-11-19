/**
 * Module dependencies
 */

var express = require('express');
var http = require('http');
var https = require('https');
var fs = require('fs');
var bodyParser = require('body-parser');
var mysql = require('mysql');
var crypto = require('crypto');


var app = express();
var connection = mysql.createConnection({
  host: 'localhost',
  user: 'ruofei',
  password: 'rf.wangchn',
  database: 'todo'
});
var hash = crypto.createHash('sha512');

// 创建加密算法
const aseEncode = function(data, password) {
  // 如下方法使用指定的算法与密码来创建cipher对象
  const cipher = crypto.createCipher('aes192', password);

  // 使用该对象的update方法来指定需要被加密的数据
  let crypted = cipher.update(data, 'utf-8', 'hex');

  crypted += cipher.final('hex');

  return crypted;
};

// 创建解密算法
var aseDecode = function(data, password) {
};

// all environments
app.set('port', 1115);

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));

// 允许 Express 跨域
app.all('*', function(req, res, next) {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Method', 'PUT,POST,GET,DELETE,PATCH,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  res.header('Access-Control-Allow-Credentials', true);
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

// 用户注册
app.post('/todo/regist', function(req, res, next) {
  const crypwd = aseEncode(req.body.password, req.body.email);
  const addSql = `INSERT INTO user(username, email, password) VALUES(?, ?, ?)`;
  const addSqlParams = [req.body.username, req.body.email, crypwd];

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

// 用户登录
app.post('/todo/login', function(req, res, next) {
  const {email, password} = req.body;
  const crypwd = aseEncode(password, email);
  const cryemail = aseEncode(email, crypwd);

  const selectSql = `SELECT * FROM user WHERE email = ? AND password = ?`;
  const selectSqlParams = [email, crypwd];

  const connection = mysql.createConnection({
    host: 'localhost',
    user: 'ruofei',
    password: 'rf.wangchn',
    database: 'todo'
  });

  connection.connect();

  connection.query(selectSql, selectSqlParams, function(error, results, fields) {
    if (error) throw error;

    if (results.length === 1) {
      const username = results[0].username;
      res.json({isLogined: true, username, cryemail, crypwd});
    } else res.json({isLogined: false});
  });
});

// 检查用户名是否已存在
app.post('/todo/isUsernameExisted', function(req, res, next) {
  console.log(req.body);
  const {username} = req.body;
  const selectSql = `SELECT * FROM user WHERE username = ?`;
  const selectSqlParams = [username];

  const connection = mysql.createConnection({
    host: 'localhost',
    user: 'ruofei',
    password: 'rf.wangchn',
    database: 'todo'
  });

  connection.connect();

  connection.query(selectSql, selectSqlParams, function(error, results, fields) {
    if (error) throw error;

    if (results.length === 0) {  // 该用户名不存在
      console.log('该用户应不存在');
      res.json({isUsernameExisted: false});
      return;
    } else {  // 该用户名已存在
      console.log('该用户名已存在');
      res.json({isUsernameExisted: true});
      return;
    }
  });
});

// 检查用户邮箱是否已存在
app.post('/todo/isEmailExisted', function(req, res, next) {
  console.log(req.body);
  const {email} = req.body;
  const selectSql = `SELECT * FROM user WHERE email = ?`;
  const selectSqlParams = [email];

  const connection = mysql.createConnection({
    host: 'localhost',
    user: 'ruofei',
    password: 'rf.wangchn',
    database: 'todo'
  });

  connection.connect();

  connection.query(selectSql, selectSqlParams, function(error, results, fields) {
    if (error) throw error;

    if (results.length === 0) {  // 该邮箱不存在
      console.log('该邮箱不存在');
      res.json({isEmailExisted: false});
      return;
    } else {  // 该邮箱已被注册
      console.log('该邮箱已被注册');
      res.json({isEmailExisted: true});
      return;
    }
  });
});

// 创建 HTTP 服务器
http.createServer(app).listen(app.get('port'), function() {
  console.log('Express HTTP server listening on port: ' + app.get('port'));
});

// 创建 HTTPS 服务器
https.createServer({
  key: fs.readFileSync('./certificate/cert-1542088285878_wundertodo.xyz.key'),
  cert: fs.readFileSync('./certificate/cert-1542088285878_wundertodo.xyz.crt')
}, app).listen(1116, function() {
  console.log('Express HTTPS server listening on port: 1116');
});

app.get('/', function (req, res) {
  if (req.protocol === 'https') {
    res.send('Welcome to safety land!');
  } else res.send('Welcome to land.');
});
