
var assert = require('assert')

function RulesEngine(entity, rulesDefinitions) {

  this._entityDefinition = entity
  this._rulesDefinitions = rulesDefinitions
}


RulesEngine.prototype.matchEntity = function(entity) {
  assert.ok(entity.entity$, 'entity object is missing an \'entity$\' attribute that should contain the entity\'s type definition: '+JSON.stringify(entity))
  var actualDef = entity.entity$
  return (this._entityDefinition.base === actualDef.base) && (this._entityDefinition.type === actualDef.type)
}

RulesEngine.prototype.match = function(entity) {



}


module.exports = RulesEngine
