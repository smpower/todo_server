const jwt = require('jwt-simple')

const encodeToken = payload => {
  const secret = 'super'
  return jwt.encode(payload, secret)
}

const decodeToken = token => {
  const secret = 'super'
  return jwt.decode(token, secret)
}

module.exports.encodeToken = encodeToken
module.exports.decodeToken = decodeToken
