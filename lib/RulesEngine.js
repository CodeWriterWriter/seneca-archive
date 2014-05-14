
var assert       = require('assert')
var _            = require('underscore')

var QueryMatcher = require('./QueryMatcher.js')
var SenecaType   = require('./SenecaType.js')

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
  var actualDef = _.isString(entity.entity$) ? SenecaType.parse(entity.entity$) : entity.entity$
  return this.appliesToDefinition(actualDef)
}

RulesEngine.prototype.appliesToDefinition = function(typeDefinition) {
  var doesApply = (this._entityDefinition.base === typeDefinition.base) && (this._entityDefinition.name === typeDefinition.name)
  return doesApply
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
