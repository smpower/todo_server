/**
 * Module dependencies
 */

var express = require('express');
var http = require('http');
var https = require('https');
var fs = require('fs');
var bodyParser = require('body-parser');
var mysql = require('mysql');
var { createToken, decodeToken, checkToken } = require('./token');
var api = require('./api');
// var crypto = require('crypto');

var app = express();

const userinfo = {
  uid: 0
};

var mysqlConnection = {
  host: '172.17.0.1',
  port: '3306',
  user: 'root',
  password: 'rf.wangchn',
  database: 'todo',
};

var connection = mysql.createConnection(mysqlConnection);
connection.connect();
// var hash = crypto.createHash('sha512');

// 创建加密算法
// const aseEncode = function(data, password) {
//   // 如下方法使用指定的算法与密码来创建cipher对象
//   const cipher = crypto.createCipher('aes192', password);
// 
//   // 使用该对象的update方法来指定需要被加密的数据
//   let crypted = cipher.update(data, 'utf-8', 'hex');
// 
//   crypted += cipher.final('hex');
// 
//   return crypted;
// };

// 创建解密算法
// var aseDecode = function(data, password) {
// };

// all environments
app.set('port', 1115);

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));

// 允许 Express 跨域
app.all('*', function(req, res, next) {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Method', 'PUT,POST,GET,DELETE,PATCH,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
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
  // const crypwd = aseEncode(req.body.password, req.body.email);
  const addSql = `INSERT INTO user(username, email, password) VALUES(?, ?, ?)`;
  const addSqlParams = [req.body.username, req.body.email, req.body.password];
  const connection = mysql.createConnection(mysqlConnection);

  connection.query(addSql, addSqlParams, function(error, results, fields) {
    if (error) throw error;

    if (results.affectedRows === 1) {
      res.json({isRegisted: true});

      // 用户注册成功后，创建用户的任务表
      const searchUidSql = `SELECT uid FROM user WHERE username = ?`;
      const searchUidParams = [req.body.username];
      connection.query(searchUidSql, searchUidParams, function(error, results, fields) {
        if (error) throw error;

	const uid = results[0].uid
	const tasksTableName = `${uid}_tasks_${Date.now().toString(36).substr(3)}`;
	const listsTableName = `${uid}_lists_${Date.now().toString(36).substr(3)}`;

	const updateTaskseSql = `UPDATE user SET tasks = '${tasksTableName}' WHERE uid = ${uid}`;
	const updateListsSql = `UPDATE user SET lists = '${listsTableName}' WHERE uid = ${uid}`;

	// 更新 user 表中 lists 字段
	connection.query(updateListsSql, function(error, results, fields) {
	  if (error) throw error;

	  // 创建 lists 表
	  const createListsTableSql = `CREATE TABLE ${listsTableName} 
	    (
	      list_id int(4) NOT NULL AUTO_INCREMENT COMMENT '任务列表 id', 
	      list_name varchar(255) NOT NULL COMMENT '任务列表名',
	      owner_list int(4) NOT NULL AUTO_INCREMENT COMMENT '所属 list',
	      PRIMARY KEY (list_id)
	    ) ENGINE=InnoDB DEFAULT CHARSET=utf8
	  `;
	  connection.query(createListsTableSql, function(error, results, fields) {
	    if (error) throw error;

	    // @TODO 新建 inbox 任务列表
	    const insertInboxSql = `
	      INSERT INTO ${listsTableName} (list_name)
	      VALUES ('Inbox')
	    `;
	    connection.query(insertInboxSql, function(error, results, fields) {
	      if (error) throw error;
	    });
	  });
	});

	// 更新 user 表中 tasks 字段
	connection.query(updateTaskseSql, function(error, results, fields) {
	  if (error) throw error;

	  // 创建 tasks 表
	  const createTasksTableSql = `CREATE TABLE ${tasksTableName} 
	    (
	      task_id int(4) NOT NULL AUTO_INCREMENT COMMENT '任务 id',
	      list_id int(4) NOT NULL COMMENT '任务列表 id',
	      text varchar(255) NOT NULL COMMENT '任务内容',
	      completed tinyint(1) unsigned zerofill NOT NULL DEFAULT '0' COMMENT '是否已完成：0 - 未完成 | 1 - 已完成',
	      deleted tinyint(1) unsigned zerofill NOT NULL DEFAULT '0' COMMENT '是否已删除：0 - 未删除 | 1 - 已删除',
	      owner_list int(4) NOT NULL COMMENT '所属 list',
	      PRIMARY KEY (task_id)
	    ) ENGINE=InnoDB DEFAULT CHARSET=utf8
	  `;
	  connection.query(createTasksTableSql, function(error, results, fields) {
	    if (error) throw error;
	  });
	});
      });
    }
    else res.json({isRegisted: false});
  });
});

// 用户登录
app.post('/todo/login', function(req, res, next) {
  const {email, password} = req.body;
  const selectSql = `SELECT * FROM user WHERE email = ? AND password = ?`;
  const selectSqlParams = [email, password];

  connection.query(selectSql, selectSqlParams, function(error, results, fields) {
    if (error) throw error;

    if (results.length === 1) {
      const { uid, username } = results[0];

      res.json({
        status: 0,
	message: '登录成功',
	uid: uid,
	token: createToken({email, password, username})
      });
    } else res.json({
      status: 1,
      message: '用户名或密码错误',
    });
  });
});

// 检查用户名是否已存在
app.post('/todo/isUsernameExisted', function(req, res, next) {
  const {username} = req.body;
  const selectSql = `SELECT * FROM user WHERE username = ?`;
  const selectSqlParams = [username];

  if (req.body.username.trim() === 'test') {
    res.json({isUsernameExisted: true});
    return;
  }

  const connection = mysql.createConnection(mysqlConnection);

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
  const {email} = req.body;
  const selectSql = `SELECT * FROM user WHERE email = ?`;
  const selectSqlParams = [email];

  const connection = mysql.createConnection(mysqlConnection);

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

// 获取 todo 数据
app.post('/todo/getData', function(req, res, next) {
  const Authorization = req.get('Authorization');
  const { uid } = req.body;
  const { email, username } = decodeToken(Authorization);
  let listsData = [];
  let listData = {};
  let listIdArr = [];

  // 验证当前登录用户
  const verificationSql = `
    SELECT uid FROM user WHERE username = ? AND email = ?
  `;
  const verificationParams = [username, email];
  connection.query(verificationSql, verificationParams, function(error, results, fields) {
    if (error) throw error;

    if (results[0].uid === uid) {
      // 通过 lists 字段和 tasks 字段的值到对应的表中检索
      const searchSql = `SELECT lists, tasks FROM user WHERE uid = ?`;
      const searchParams = [uid];
      connection.query(searchSql, searchParams, function(error, results, fields) {
	if (error) throw error;
	const { lists, tasks } = results[0];

	// 联结查询：检索任务列表和任务项
	const searchListsSql = `
	  SELECT ${lists}.list_id, ${lists}.list_name, task_id, text, completed, deleted 
	  FROM ${lists}, ${tasks}
	  WHERE ${lists}.owner_list = ${tasks}.owner_list
	`;
	connection.query(searchListsSql, function(error, results, fields) {
	  if (error) throw error;

	  if (results.length !== 0) {
	    results.forEach((taskItem, taskIndex) => {
	      listIdArr.push(taskItem.list_id);
	    });

	    const uniqueListIds = Array.from(new Set(listIdArr));
	    const data = uniqueListIds.map((uniqueListIdItem, uniqueListIdIndex) => {
	      const tmp = {};

	      let dataList = results.filter((taskItem, taskIndex) => {
		if (uniqueListIdItem === taskItem.list_id) {
		  tmp.id = taskItem.list_id;
		  tmp.box = taskItem.list_name;
		}
		return uniqueListIdItem === taskItem.list_id;
	      }).reverse();

	      // 处理返回到前台的数据
	      dataList.forEach((dataListItem, dataListIndex) => {
		delete dataListItem.list_id;
		delete dataListItem.list_name;

		dataListItem.id = dataListItem.task_id;
		delete dataListItem.task_id;

		dataListItem.completed === '0' ?
		  dataListItem.completed = false :
		  dataListItem.completed = true;

		dataListItem.deleted === '0' ?
		  dataListItem.deleted = false :
		  dataListItem.deleted = true;
	      });

	      return {
		...tmp,
		dataList
	      };
	    });

	    res.json({
	      status: 0,
	      message: 'success',
	      username,
	      data
	    });
	  } else {
	    connection.query(
	      `SELECT ${lists}.list_id, ${lists}.list_name FROM ${lists}`,
	      function (error, results, fields) {
		if (error) throw error;

		results.map((item, index) => {
		  item.dataList = [];
		  item.id = item.list_id;
		  item.box = item.list_name;

		  delete item.list_id;
		  delete item.list_name;

		  return item;
		});

		res.json({
		  status: 0,
		  message: 'success',
		  username,
		  data: results
		});
	      }
	    );
	  }
	});
      });
    }
  });
});

// 切换 todo 完成状态
app.post('/todo/toggleTodoChecked', function(req, res, next) {
  res.json({
    status: 0,
    message: '成功',
    username: 'user.name'
  });
});

// 添加 todo
app.post('/todo/addTodo', function(req, res, next) {
  const Authorization = req.get('Authorization');
  const { uid, list_id, text } = req.body;
  const { email, username } = decodeToken(Authorization);

  // 验证当前登录用户
  const verificationSql = `
    SELECT uid, tasks FROM user WHERE username = ? AND email = ?
  `;
  const verificationParams = [username, email];
  connection.query(verificationSql, verificationParams, function(error, results, fields) {
    if (error) throw error;

    if (results[0].uid === uid) {
      // 添加一条 todo
      const addTodoSql = `INSERT INTO ${results[0].tasks} (
        list_id, text, owner_list
      ) VALUES (?, ?, ?)`;
      const addTodoSqlParams = [list_id, text, list_id];
      connection.query(addTodoSql, addTodoSqlParams, function(error, results, fields) {
	if (error) throw error;

	if (results.affectedRows === 1) {
	  res.json({
	    status: 0,
	    message: '添加成功',
	    taskId: results.insertId
	  });
	} else {
	  res.json({
	    status: 1,
	    message: '添加失败'
	  });
	}
      });
    }
  });
});

// 删除 todo
app.post('/todo/deleteTodo', function(req, res, next) {
  // @TODO 这里的删除 todo 仅仅是将被选中的 todo 标记为已删除，后期开发[回收站]
  //       功能时还要用到这些被标记的 todo 数据
  res.json({
    status: 0,
    message: '删除成功'
  });
});

// 创建任务列表
app.post('/todo/createList', function(req, res, next) {
  // @TODO uid, createdList, token
  res.json({
    status: 0,
    message: '创建成功',
    data: {
      id: 33,
      box: 'created list',
      dataList: []
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
