const express = require('express')
const router = express.Router()
const { encodeToken } = require('../utils/token')

/* Get login page. */
router.get('/', (req, res, next) => {
  console.log(req.cookies)
  res.render('index', { title: 'Login' })
})

/* POST login data. */
router.post('/', (req, res, next) => {
  const token = encodeToken(req.body)
  res.json({
    status: 200,
    message: 'success',
    data: { token }
  })
})

module.exports = router
