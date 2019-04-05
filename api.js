module.exports = {
  test: {
    get: {
      api: '/todo/test/get',
      response: function(req, res, next) {
	console.group('前台通过 GET 方式传递过来的值: ');
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
      }
    },
    post: {
      api: '/todo/test/post',
      response: function(req, res, next) {
	console.group('前台通过 POST 方式传递过来的值: ');
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
      }
    }
  }
};

