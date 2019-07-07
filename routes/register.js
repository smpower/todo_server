const express = require('express')
const router = express.Router()

/* GET register page. */
router.get('/', (req, res, next) => {
  res.render('index', { title: 'Register' })
})

/* POST register data. */
router.post('/', (req, res, next) => {
  res.json({
    status: 200,
    message: 'success',
    data: {},
  })
})

module.exports = router
