
var assert = require('assert')
var async = require('async')

var SenecaType = require('./lib/SenecaType.js')

var pluginName = 'archive'


function archive(options) {

  var primarySeneca = this

  assert.ok(options.archivalInstance, 'missing archivalInstance option. It should be a seneca instance that manages your archival DB')

  var secondarySeneca = options.archivalInstance

  var entities = options.entities || []
  var rules = []

  for(var entityTypeStr in options.rules) {
    if(options.rules.hasOwnProperty(entityTypeStr)) {
      var typeDef = SenecaType.parse(entityTypeStr)
      rules.push(new RulesEngine(typeDef), options.rules[entityTypeStr])
    }
  }

  // entity events
  primarySeneca.add({role: 'entity', cmd: 'save'}  , saveOverride)
  primarySeneca.add({role: 'entity', cmd: 'remove'}, removeOverride)
  primarySeneca.add({role: 'entity', cmd: 'load'}  , loadOverride)
  primarySeneca.add({role: 'entity', cmd: 'list'}  , listOverride)


  function saveOverride(args, callback) {

    var entity = args.ent

    if(entity.archived$ || (!entity.id && shouldBeArchived(entity))) {
      secondarySeneca.act(args, callback)
    } else {
      executePrimaryThenFallbackToSecondary.call(this, args, callback)
    }

  }

  function removeOverride(args, callback) {
    executePrimaryThenFallbackToSecondary.call(this, args, callback)
  }

  function loadOverride(args, callback) {
    executePrimaryThenFallbackToSecondary.call(this, args, callback)
  }

  function listOverride(args, callback) {

    var self = this

    var primaryError
    var primaryResult
    var secondaryError
    var secondaryResult

    async.parallel([
      function(callback) {

        self.prior(args, function(err, result) {
          primaryError = err
          primaryResult = result || []
        })

      },
      function(callback) {

        secondarySeneca.act(args, function(err, result) {
          secondaryError = err
          secondaryResult = result || []
          // TODO: stamp archived$ flag on entities
        })

      }
    ], callback);
    this.prior(args, function() {

      if(primaryError) {
        callback(primaryError, undefined)

      } else if(secondaryError) {
        callback(secondaryErr, undefined)

      } else {
        var aggregatedResult = primaryResult.concat(secondaryResult)
        callback(undefined, aggregatedResult)
      }
    })
  }

  function shouldBeArchived(entity) {
    for(var i = 0 ; i < rules.length ; i++) {
      if(rules[i].applies(entity) && rules[i].match(entity)) {
        return true
      }
    }
    return false
  }

  function executePrimaryThenFallbackToSecondary(args, callback) {
    this.prior(args, function(priorErr, priorResult) {
      if(priorErr) {
        secondarySeneca.act(args, function(secondaryErr, secondaryResult) {
          if(secondaryErr) {
            callback(priorErr, priorResult)
          } else {
            // TODO: stamp archived$ flag on entity(ies)
            callback(undefined, secondaryResult)
          }
        })
      } else {
        callback(undefined, priorResult)
      }
    })
  }

  return {
    name: pluginName
  }

}


module.exports = archive
