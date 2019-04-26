const jwt = require('jwt-simple');

module.exports.createToken = (options) => {
  const payload = {
    email: options.email,
    username: options.username
  };
  const secret = 'super';

  return jwt.encode(payload, secret);
};

module.exports.decodeToken = (token) => {
  const secret = 'super';
  return jwt.decode(token, secret);
};

module.exports.checkToken = () => {
  console.log('check token');
};

