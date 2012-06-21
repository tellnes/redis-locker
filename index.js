var EventEmitter = require('events').EventEmitter
  , inherits = require('util').inherits

function Locker(client, key, timeout) {
  EventEmitter.call(this)

  key = 'lock.' + key
  timeout = timeout || 5000

  var self = this
    , lastVal

  function getValue(t) {
     return lastVal = Date.now() + (t || timeout) + 100
  }

  function got() {
    setTimeout(function() {
      self.emit('timeout')
    }, timeout)

    self.emit('got')
  }

  function onerror(err) {
    self.emit('error', err)
    self.destroy()
  }

  function acquire() {
    client.setnx(key, getValue(), function(err, result) {
      if (err) return onerror(err)

      if(result === 1) { // got lock
        got()

      } else {

        client.get(key, function(err, curVal) {
          if (err) return onerror(err)

          var time = parseInt(curVal)
            , now = Date.now()

          if(time > now) {
            // Retry later
            self.emit('locked')
            setTimeout(acquire, time - now)

          } else {

            client.getset(key, getValue(), function(err, result) {
              if (err) return onerror(err)

              if(result === curVal) { // someone else timed out
                got()

              } else { // Retry
                acquire()
              }
            })
          }
        }) // client.get
      }
    }) // client.setnx

  }

  this.keep = function() {
    var myVal = lastVal

    client.getset(key, getValue(timeout), function(err, result) {
      if (err) return onerror(err)

      if (myVal == result) got()
    })
  }

  this.done = function() {
    client.del(key)
    self.emit('done')
  }

  this.destroy = function() {
    client.del(key)
    self.removeAllListeners()
  }

  acquire()

}
inherits(Locker, EventEmitter)

exports.Locker = Locker
