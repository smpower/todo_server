const express = require('express')
const router = express.Router()

/* GET users listing. */
router.get('/', function(req, res, next) {
  res.send('respond with a resource')
})

/* POST users listing. */
router.post('/', (req, res, next) => {
  res.json({
    status: 200,
    message: 'success',
    data: [
      {
        name: 'Olive',
        sex: 'female',
        age: 26,
        country: 'China'
      },
      {
        name: 'Jack',
        sex: 'male',
        age: 28,
        country: 'US'
      }
    ] 
  })
})

module.exports = router
