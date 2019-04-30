var express = require('express');
var http = require('http');
var https = require('https');
var fs = require('fs');
var bodyParser = require('body-parser');
var mysql = require('mysql');
var { createToken, decodeToken, checkToken } = require('./token');
var api = require('./api');

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

var mysqlPool = mysql.createPool(mysqlConnection);

var mysqlQuery = function(params) {
  mysqlPool.getConnection(function(error, connection) {
    if (typeof params.sqlParams === 'undefined') {
      connection.query(params.sql, function(error, results, fields) {
	params.callback(error, results, fields);
	connection.release();
      });
    } else {
      connection.query(params.sql, params.sqlParams, function(error, results, fields) {
        params.callback(error, results, fields);
	connection.release();
      });
    }
  });
}

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
	      owner_list int(4) NULL COMMENT '所属 list',
	      PRIMARY KEY (list_id)
	    ) ENGINE=InnoDB DEFAULT CHARSET=utf8
	  `;
	  connection.query(createListsTableSql, function(error, results, fields) {
	    if (error) throw error;

	    // @TODO 新建 inbox 任务列表
	    const insertInboxSql = `
	      INSERT INTO ${listsTableName} (list_name)
	      VALUES ('inbox')
	    `;
	    connection.query(insertInboxSql, function(error, results, fields) {
	      if (error) throw error;

	      if (results.affectedRows === 1) {
		const updateOwnerListSql = `
		  UPDATE ${listsTableName}
		  SET owner_list = ${results.insertId}
		`;
		connection.query(updateOwnerListSql, function(error, results, fields) {
		  if (error) throw error;
		  if (results.affectedRows === 1) {
		    console.log('更新 owner_list 成功！');
		  }
		});
	      }
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
	      owner_list int(4) NULL COMMENT '所属 list',
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

  mysqlQuery({
    sql: selectSql,
    sqlParams: selectSqlParams,
    callback: function(error, results, fields) {
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
    }
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

  mysqlQuery({
    sql: selectSql,
    sqlParams: selectSqlParams,
    callback: function(error, results, fields) {
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
    }
  });
});

// 检查用户邮箱是否已存在
app.post('/todo/isEmailExisted', function(req, res, next) {
  const {email} = req.body;
  const selectSql = `SELECT * FROM user WHERE email = ?`;
  const selectSqlParams = [email];

  const connection = mysql.createConnection(mysqlConnection);

  mysqlQuery({
    sql: selectSql,
    sqlParams: selectSqlParams,
    callback: function(error, results, fields) {
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
  mysqlQuery({
    sql: verificationSql,
    sqlParams: verificationParams,
    callback: function(error, results, fields) {
      if (error) throw error;

      if (results[0].uid === uid) {
	// 通过 lists 字段和 tasks 字段的值到对应的表中检索
	const searchSql = `SELECT lists, tasks FROM user WHERE uid = ?`;
	const searchSqlParams = [uid];
	mysqlQuery({
	  sql: searchSql,
	  sqlParams: searchSqlParams,
	  callback: function(error, results, fields) {
	    if (error) throw error;
	    const { lists, tasks } = results[0];
	    const data = [];

	    const searchListSql = `SELECT list_id, list_name FROM ${lists}`;
	    mysqlQuery({
	      sql: searchListSql,
	      callback: function(error, results, fields) {
		if (error) throw error;
		if (results.length !== 0) {
		  const listLength = results.length;
		  results.forEach((listItem, listIndex) => {
		    const searchTaskSql = `
		      SELECT list_id, task_id, text, completed, deleted
		      FROM ${tasks} WHERE list_id = ?`
		    ;
		    const searchTaskSqlParams = [listItem.list_id];
		    mysqlQuery({
		      sql: searchTaskSql,
		      sqlParams: searchTaskSqlParams,
		      callback: function(error, results, fields) {
			if (error) throw error;

			results.reverse().forEach((taskItem, taskIndex) => {
			  taskItem.id = taskItem.task_id;

			  taskItem.completed === '0' ? 
			    taskItem.completed = false :
			    taskItem.completed = true;
			  taskItem.deleted === '0' ? 
			    taskItem.deleted = false :
			    taskItem.deleted = true;

			  delete taskItem.list_id;
			  delete taskItem.task_id;
			});

			data.push({
			  id: listItem.list_id,
			  box: listItem.list_name,
			  dataList: results
			});

			if (listLength === listIndex + 1) {
			  res.json({
			    status: 0,
			    message: 'success',
			    username,
			    data
			  });
			}
		      }
		    });
		  });
		}
	      }
	    });
	  }
	});
      }
    }
  });
});

// 切换 todo 完成状态
app.post('/todo/toggleTodoChecked', function(req, res, next) {
  const { uid, selectedTodos } = req.body;
  const { email, username } = decodeToken(req.get('Authorization'));

  // 验证当前登录用户
  const verificationSql = `
    SELECT uid, tasks FROM user WHERE username = ? AND email = ?
  `;
  const verificationParams = [username, email];
  mysqlQuery({
    sql: verificationSql,
    sqlParams: verificationParams,
    callback: function(error, results, fields) {
      if (error) throw error;

      if (results[0].uid === uid) {
	selectedTodos.forEach((selectedTodoItem, selectedTodoIndex) => {
	  const { listId, taskId } = selectedTodoItem;
	  let deleted = '';

	  // 删除一条 todo
	  if (selectedTodoItem.completed) deleted = '1';
	  else deleted = '0';

	  const toggleTodoSql = `UPDATE ${results[0].tasks}
	    SET completed = ${deleted} WHERE task_id = ?
	  `;
	  const toggleTodoSqlParams = [taskId];
	  mysqlQuery({
	    sql: toggleTodoSql,
	    sqlParams: toggleTodoSqlParams,
	    callback: function(error, results, fields) {
	      if (error) throw error;

	      if (results.affectedRows === 1) {
		res.json({
		  status: 0,
		  message: '删除成功',
		  affedtedListId: listId,
		  affedtedTaskId: taskId
		});
	      }
	    }
	  });
	});
      }
    }
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
  mysqlQuery({
    sql: verificationSql,
    sqlParams: verificationParams,
    callback: function(error, results, fields) {
      if (error) throw error;

      if (results[0].uid === uid) {
	// 添加一条 todo
	const addTodoSql = `INSERT INTO ${results[0].tasks} (
	  list_id, text, owner_list
	) VALUES (?, ?, ?)`;
	const addTodoSqlParams = [list_id, text, list_id];
	mysqlQuery({
	  sql: addTodoSql,
	  sqlParams: addTodoSqlParams,
	  callback: function(error, results, fields) {
	    if (error) throw error;

	    if (results.affectedRows === 1) {
	      res.json({
		status: 0,
		message: '添加成功',
		listId: list_id,
		taskId: results.insertId
	      });
	    } else {
	      res.json({
		status: 1,
		message: '添加失败'
	      });
	    }
	  }
	});
      }
    }
  });
});

// 删除 todo
app.post('/todo/deleteTodo', function(req, res, next) {
  // @TODO 这里的删除 todo 仅仅是将被选中的 todo 标记为已删除，后期开发[回收站]
  //       功能时还要用到这些被标记的 todo 数据
  const Authorization = req.get('Authorization');
  const { uid, selectedTodos } = req.body;
  const { email, username } = decodeToken(Authorization);

  // 验证当前登录用户
  const verificationSql = `
    SELECT uid, tasks FROM user WHERE username = ? AND email = ?
  `;
  const verificationParams = [username, email];
  mysqlQuery({
    sql: verificationSql,
    sqlParams: verificationParams,
    callback: function(error, results, fields) {
      if (error) throw error;

      if (results[0].uid === uid) {
	selectedTodos.forEach((selectedTodoItem, selectedTodoIndex) => {
	  const { listId, taskId } = selectedTodoItem;

	  // 删除一条 todo
	  const deleteTodoSql = `UPDATE ${results[0].tasks}
	    SET deleted = '1' WHERE task_id = ?
	  `;
	  const deleteTodoSqlParams = [taskId];
	  mysqlQuery({
	    sql: deleteTodoSql,
	    sqlParams: deleteTodoSqlParams,
	    callback: function(error, results, fields) {
	      if (error) throw error;

	      if (results.affectedRows === 1) {
		res.json({
		  status: 0,
		  message: '删除成功'
		});
	      }
	    }
	  });
	});
      }
    }
  });
});

// 创建任务列表
app.post('/todo/createList', function(req, res, next) {
  const { uid, createdList } = req.body;
  const { email, username } = decodeToken(req.get('Authorization'));

  // 验证当前登录用户
  const verificationSql = `
    SELECT uid, lists FROM user WHERE username = ? AND email = ?
  `;
  const verificationParams = [username, email];
  mysqlQuery({
    sql: verificationSql,
    sqlParams: verificationParams,
    callback: function(error, results, fields) {
      if (error) throw error;
      const { lists } = results[0];

      if (results[0].uid === uid) {
	// 删除一条 todo
	const createListSql = `INSERT INTO ${lists} (list_name) VALUES (?)`;
	const createListSqlParams = [createdList];
	mysqlQuery({
	  sql: createListSql,
	  sqlParams: createListSqlParams,
	  callback: function(error, results, fields) {
	    if (error) throw error;

	    if (results.affectedRows === 1) {
	      const { insertId } = results;
	      const updateListIdSql = `UPDATE ${lists} SET owner_list = ? WHERE list_id = ?`;
	      const updateListIdSqlParams = [insertId, insertId];
	      mysqlQuery({
		sql: updateListIdSql,
		sqlParams: updateListIdSqlParams,
		callback: function(error, results, fields) {
		  if (error) throw error;
		  if (results.affectedRows === 1) {
		    res.json({
		      status: 0,
		      message: '创建成功',
		      data: {
			id: insertId,
			box: createdList,
			dataList: []
		      }
		    });
		  }
		}
	      });
	    }
	  }
	});
      }
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
