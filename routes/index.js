module.exports = [
  {
    route: '/users',
    router: require('./users'),
  },
  {
    route: '/login',
    router: require('./login'),
  },
  {
    route: '/register',
    router: require('./register')
  }
]