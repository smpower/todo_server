const jwt = require('jwt-simple');

module.exports.createToken = (options) => {
  const payload = {
    email: options.email,
    password: options.username
  };
  const secret = `super${options.password}`;

  return jwt.encode(payload, secret);
};

module.exports.decodeToken = () => {
  console.log('decode token');
};

module.exports.checkToken = () => {
  console.log('check token');
};

