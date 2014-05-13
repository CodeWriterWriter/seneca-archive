
var assert = require('assert')

function RulesEngine(entityTypeDef, rulesDefinitions) {

  this._entityDefinition = entityTypeDef
  this._rulesDefinitions = rulesDefinitions || []
  this._rules = []
  for(var i = 0 ; i < this._rulesDefinitions.length ; i++) {
    this._rules.push(new QueryMatcher(this._rulesDefinitions[i]))
  }
}


RulesEngine.prototype.applies = function(entity) {
  assert.ok(entity.entity$, 'entity object is missing an \'entity$\' attribute that should contain the entity\'s type definition: '+JSON.stringify(entity))
  var actualDef = entity.entity$
  return (this._entityDefinition.base === actualDef.base) && (this._entityDefinition.name === actualDef.name)
}

RulesEngine.prototype.match = function(entity) {


  if(this.applies(entity)) {

    for(var i = 0 ; i < this._rules.length ; i++) {

      // it's an 'OR' condition between each rule
      if(this._rules[i].match(entity)) {
        return true
      }

    }

  }

  return false

}

module.exports = RulesEngine
