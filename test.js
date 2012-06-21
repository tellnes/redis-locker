var Locker = require('./').Locker
  , redis = require('redis')

var c1 = redis.createClient()
var c2 = redis.createClient()

var l1 = new Locker(c1, 'test', 2000)
var l2 = new Locker(c2, 'test', 2000)

orig = l1.emit

l1.emit = function(name) {
  console.log('l1', name)
  orig.apply(this, arguments)
}
l2.emit = function(name) {
  console.log('l2', name)
  orig.apply(this, arguments)
}


l1.on('timeout', l1.keep)
l2.on('timeout', l2.keep)
