

var RulesEngine = require('../lib/RulesEngine.js')
var assert = require('assert')

describe('RulesEngine', function() {


  describe('entity type', function() {


    var rulesEngine = new RulesEngine({base: 'foo', name: 'bar'}, [])

    it('match', function() {
      var entity = {
        entity$: {
          base: 'foo',
          name: 'bar'
        }
      }

      var match = rulesEngine.applies(entity)

      assert.ok(match)

    })

    it('base mismatch', function() {

      var entity = {
        entity$: {
          base: 'fi',
          name: 'bar'
        }
      }

      var match = rulesEngine.applies(entity)

      assert.ok(!match)


    })

    it('type mismatch', function() {

      var entity = {
        entity$: {
          base: 'foo',
          name: 'barman'
        }
      }

      var match = rulesEngine.applies(entity)

      assert.ok(!match)


    })

    it('missing', function() {

      var entity = {}

      try{

        rulesEngine.applies(entity)
        assert.fail('expected an error')

      } catch(missingTypeError) {

      }

    })

  })


})
