
var assert      = require('assert')
var async       = require('async')
var _           = require('underscore')

var SenecaType  = require('./lib/SenecaType.js')
var RulesEngine = require('./lib/RulesEngine.js')

var pluginName  = 'archive'


function archive(options) {

  var primarySeneca = this

  assert.ok(options.archivalInstance, 'missing archivalInstance option. It should be a seneca instance that manages your archival DB')
  assert.ok(options.conditions, 'missing conditions option.')


  var checkExistsBeforeUpdate = true
  if(options.hasOwnProperty('checkExistsBeforeUpdate')) {
    checkExistsBeforeUpdate = options.checkExistsBeforeUpdate
  }


  var secondarySeneca = options.archivalInstance

  var entities = options.entities || []
  var rules = []

  for(var entityTypeStr in options.conditions) {
    if(options.conditions.hasOwnProperty(entityTypeStr)) {
      var typeDef = SenecaType.parse(entityTypeStr)
      rules.push(new RulesEngine(typeDef, options.conditions[entityTypeStr]))
    }
  }

  // entity events
  primarySeneca.add({role: 'entity', cmd: 'save'}  , saveOverride)
  primarySeneca.add({role: 'entity', cmd: 'remove'}, removeOverride)
  primarySeneca.add({role: 'entity', cmd: 'load'}  , loadOverride)
  primarySeneca.add({role: 'entity', cmd: 'list'}  , listOverride)


  function saveOverride(args, callback) {

    var entity = args.ent
    var self = this

    if(entity.archived$ || (!entity.id$ && !entity.id && shouldBeArchived(entity))) {

      secondarySeneca.act(args, callback)

    } else if(entity.id && checkExistsBeforeUpdate) {

      // Note: some 'update' implementation do not throw an error if the entity does not already exist
      // so we need to check if the entity exists in the primary DB before we update it there.
      // * Perf: * Maybe we should check if entity exists in the secondary first and then fall back on the
      // primary but my rationale is that we should check the primary first because it has better perf.

      var loadEnt = primarySeneca.make(args.ent.entity$)
      loadEnt.load$({id: args.ent.id}, function(err, result) {
        if(err || !result) {
          primarySeneca.log.debug('entity does not exist in primary. saving it in secondary', args.ent)
          secondarySeneca.act(args, callback)
        } else {
          primarySeneca.log.debug('entity saved in primary', args.ent)
          self.prior(args, callback)
        }
      })

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
