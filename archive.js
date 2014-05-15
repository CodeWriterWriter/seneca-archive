
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
  var directArchival = true
  if(options.hasOwnProperty('directArchival')) {
    directArchival = options.directArchival
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


  // archiving API
  primarySeneca.add({role: 'archive', cmd: 'scan'}, archivePrimaryEntities)

  function saveOverride(args, callback) {

    var entity = args.ent
    var self = this

    if(entity.archive$ || (entity.archive$ !== false && !entity.id$ && !entity.id && shouldBeArchived(entity))) {

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

        if(args.q.archived$ === true) {

          primaryResult = []
          callback()

        } else {

          self.prior(args, function(err, result) {
            primaryError = err
            primaryResult = result || []
            callback()
          })

        }

      },
      function(callback) {

        if(args.q.archived$ === false) {

          secondaryResult = []
          callback()

        } else {

          secondarySeneca.act(args, function(err, result) {
            secondaryError = err
            secondaryResult = result || []
            // TODO: stamp archived$ flag on entities
            callback()
          })

        }

      }
    ], function() {

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

  function isEntityTypeSupported(typeDef) {
    for(var i = 0 ; i < rules.length ; i++) {
      if(rules[i].applies(entity) && rules[i].match(entity)) {
        return true
      }
    }
    return false
  }

  function executePrimaryThenFallbackToSecondary(args, callback) {
    this.prior(args, function(priorErr, priorResult) {
      if(args.archived$ === false) {
        callback(priorErr, priorResult)
      } else if(priorErr) {
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

  function archivePrimaryEntities(args, callback) {
    var skip  = args.skip  || 0
    var limit = args.limit || 10
    var entityTypeStr = _.isString(args.entity) ? args.entity : SenecaType.stringify(args.entity)

    var entMgr = primarySeneca.make(entityTypeStr)
    entMgr.list$({skip$: skip, limit$: limit, archived$: false}, function(err, results) {
      if(err) {
        callback(err, undefined)
      } else {
        var info = {
          count: 0,
          hits: 0
        }
        var entitiesToArchive = []
        if(results) {
          info.hits = results.length
          for(var i = 0 ; i < results.length ; i++) {

            if(shouldBeArchived(results[i])) {
              entitiesToArchive.push(results[i])
            }
          }
        }
        if(entitiesToArchive.length > 0) {

          async.map(entitiesToArchive, archiveEntity, function(err, results) {

            if(results) {
              info.count = results.length
            }
            callback(err, info)
          })

        } else {
          callback(undefined, info)
        }
      }

    })

  }

  function archiveEntity(entity, callback) {
    var id = entity.id
    primarySeneca.log.info('archiving entity', id)

    var archive = _.clone(entity)

    delete archive.id // make the DB layer believe this is a new entity
    archive.id$ = id

    var secondaryEnt = secondarySeneca.make(entity.entity$)

    secondaryEnt.save$(archive, function(err, result) {

      if(err) {
        callback(err, undefined)
      } else {

        entity.remove$({id: entity.id, archived$: false}, function(err) {

          if(err) {
            callback(err, undefined)
          } else {
            callback(undefined, result)
          }
        })
      }

    })
  }

  return {
    name: pluginName
  }

}


module.exports = archive
