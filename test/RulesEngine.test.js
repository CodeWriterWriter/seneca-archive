

var RulesEngine = require('../lib/RulesEngine.js')
var assert = require('assert')

describe('RulesEngine', function() {


  describe('entity type', function() {


    var rulesEngine = new RulesEngine({base: 'foo', type: 'bar'}, [])

    it('match', function() {
      var entity = {
        entity$: {
          base: 'foo',
          type: 'bar'
        }
      }

      var match = rulesEngine.matchEntity(entity)

      assert.ok(match)

    })

    it('base mismatch', function() {

      var entity = {
        entity$: {
          base: 'fi',
          type: 'bar'
        }
      }

      var match = rulesEngine.matchEntity(entity)

      assert.ok(!match)


    })

    it('type mismatch', function() {

      var entity = {
        entity$: {
          base: 'foo',
          type: 'barman'
        }
      }

      var match = rulesEngine.matchEntity(entity)

      assert.ok(!match)


    })

    it('missing', function() {

      var entity = {}

      try{

        rulesEngine.matchEntity(entity)
        assert.fail('expected an error')

      } catch(missingTypeError) {

      }

    })

  })


})
