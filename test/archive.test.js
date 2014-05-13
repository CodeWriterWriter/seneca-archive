

var archive = require('../archive.js')
var assert = require('assert')

var seneca          = require('seneca')
var primarySeneca   = seneca()
var secondarySeneca = seneca()

primarySeneca.use('../archive.js', {

  archivalInstance: secondarySeneca,

  conditions: {
    'foo/bar': [
      { archiveAttr: { $gt: 0 } }
    ]
  }

})

describe('archive', function() {

  it('save', function(done) {

    var foobarEntity = primarySeneca.make('foo/bar')

    foobarEntity.save$({db: 'primary', archiveAttr: false}, function(err, result) {

      assert.ok(!err, err ? err.message + err.stack : undefined)

      foobarEntity.save$({db: 'secondary', archiveAttr: true}, function(err, result) {
        assert.ok(!err, err ? err.message + err.stack : undefined)
        done()
      })

    })

  })

  it('list', function(done) {

    var foobarEntity = primarySeneca.make('foo/bar')

    foobarEntity.list$(function(err, result) {

      assert.ok(!err, err ? err.message + err.stack : undefined)

      assert.ok(result)
      assert.equal(result.length, 2)

      assert.equal(result[0].db, 'primary')
      assert.equal(result[1].db, 'secondary')

      done()

    })

  })


})
