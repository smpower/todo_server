/**
 * Module dependencies
 */

var express = require('express');
var http = require('http');
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
app.set('port', 8080);

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

app.post('/todo/register', function(req, res, next) {
  const addSql = 'INSERT INTO user(username, email, password) VALUES(?, ?, ?)';
  const addSqlParams = [req.body.username, req.body.email, req.body.password];
  console.log(req.body);

  var connection = mysql.createConnection({
    host     : 'localhost',
    user     : 'ruofei',
    password : 'rf.wangchn',
    database : 'todo'
  });

  connection.connect();

  // connection.query('INSERT INTO user(username, email, password) VALUES(?, ? ,?)', [req.body.username, req.body.email, req.body.password],
  connection.query(addSql, addSqlParams,
    function(error, results, fields) {
      if (error) throw error;
      console.log(results);
      console.log(fields);
      res.json(fields);
    });

  // connection.query('SELECT * FROM user', function (error, results, fields) {
  //   if (error) throw error;
  //   console.log(results);
  //   res.json(results);
  // });

  connection.end();
});

http.createServer(app).listen(app.get('port'), function() {
  console.log('Express server listening on port: ' + app.get('port'));
});
