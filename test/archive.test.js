

var archive = require('../archive.js')
var assert = require('assert')

var seneca          = require('seneca')
var primarySeneca   = seneca()
var secondarySeneca = seneca()

primarySeneca.use('../archive.js', {

  archivalInstance: secondarySeneca,

  conditions: {
    'foo/bar': [
      { archiveAttr: { $gt: 0 } },
      { db: 'secondary' }
    ]
  }

})

describe('archive', function() {

  it('save', function(done) {

    var foobarEntity = primarySeneca.make('foo/bar')

    foobarEntity.save$({db: 'primary', archiveAttr: false}, function(err, result) {

      assert.ok(!err, err ? err.message + err.stack : undefined)

      foobarEntity.save$({db: 'secondary', archiveAttr: true}, function(err, secondaryResult) {
        assert.ok(!err, err ? err.message + err.stack : undefined)

        var foobarEntitySecondary = secondarySeneca.make('foo/bar')
        foobarEntitySecondary.load$({id: secondaryResult.id}, function(err, archivedEntity) {

          assert.ok(!err, err ? err.message + err.stack : undefined)
          assert.ok(archivedEntity, 'the archived entity is not in the archive')
          assert.equal(archivedEntity.id, secondaryResult.id, 'id mismatch')

          done()

        })

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

  it('update', function(done) {


    var foobarEntity = primarySeneca.make('foo/bar')

    foobarEntity.list$(function(err, result) {

      assert.ok(!err, err ? err.message + err.stack : undefined)

      var primaryObj   = result[0]
      var secondaryObj = result[1]

      primaryObj.updated   = true
      secondaryObj.updated = true

      primaryObj.save$(function(err, result) {

        assert.ok(!err, err ? err.message + err.stack : undefined)

        foobarEntity.save$(secondaryObj, function(err, secondaryResult) {
          assert.ok(!err, err ? err.message + err.stack : undefined)
          assert.equal(secondaryResult.id, secondaryObj.id, 'id mismatch when updating a secondary object')
          assert.equal(secondaryResult.updated, true, 'expected updated attr to be true right after update')

          var foobarEntitySecondary = secondarySeneca.make('foo/bar')
          foobarEntitySecondary.load$({id: secondaryObj.id}, function(err, archivedEntity) {

            assert.ok(!err, err ? err.message + err.stack : undefined)
            assert.ok(archivedEntity, 'the archived entity is not in the archive')
            assert.equal(archivedEntity.id, secondaryObj.id, 'id mismatch')
            assert.equal(archivedEntity.updated, true, 'expected updated attr to be true')


            foobarEntitySecondary.load$({id: primaryObj.id}, function(err, nonArchivedEntity) {

              assert.ok(!err, err ? err.message + err.stack : undefined)
              assert.ok(!nonArchivedEntity, 'the non archived entity should not be in the secondary DB')

              done()

            })

          })

        })
      })

    })

  })

  it('pre-archive', function(done) {
    var foobarEntity = primarySeneca.make('foo/bar')

    foobarEntity.list$(function(err, result) {

      assert.ok(!err, err ? err.message + err.stack : undefined)

      var primaryObj   = result[0]

      primaryObj.db    = 'secondary'

      primaryObj.save$(function(err, result) {

        assert.ok(!err, err ? err.message + err.stack : undefined)

        var foobarEntitySecondary = secondarySeneca.make('foo/bar')
        foobarEntitySecondary.load$({id: primaryObj.id}, function(err, nonArchivedEntity) {

          assert.ok(!err, err ? err.message + err.stack : undefined)
          assert.ok(!nonArchivedEntity, 'the non archived entity should not be in the secondary DB')

          done()

        })

      })

    })

  })

  it('archive', function(done) {
    primarySeneca.act({role: 'archive', cmd: 'scan', skip: 0, limit: 100, entity: 'foo/bar'}, function(err, info) {
      assert.ok(!err, err ? err.message + err.stack : undefined)

      assert.ok(info)
      assert.equal(info.count, 1)

      var foobarEntitySecondary = secondarySeneca.make('foo/bar')
      foobarEntitySecondary.list$(function(err, archivedEntities) {

        assert.ok(!err, err ? err.message + err.stack : undefined)
        assert.ok(archivedEntities)
        assert.equal(archivedEntities.length, 2, 'the newly archived entity should be in the secondary DB')


        var foobarEntityPrimary = primarySeneca.make('foo/bar')
        foobarEntityPrimary.list$({archived$: false}, function(err, nonArchivedEntities) {

          assert.ok(!err, err ? err.message + err.stack : undefined)
          assert.ok(nonArchivedEntities)
          assert.equal(nonArchivedEntities.length, 0, 'the newly archived entity should not be in the primary DB')


          done()

        })
      })
    })
  })


})
