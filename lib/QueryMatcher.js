var _ = require('underscore')

function QueryMatcher(query) {

  this._conditions = []

  for(var attr in query) {
    if(query.hasOwnProperty(attr)) {
      this._conditions = this._conditions.concat(this._buildConditions(attr, query[attr]))
    }
  }

}

QueryMatcher.prototype.match = function(target) {
  if(!target) {
    return false
  }
  for(var i = 0 ; i < this._conditions.length ; i++) {
    if(!this.matchSinglecondition(this._conditions[i], target)) {
      return false
    }
  }
  return true
}

QueryMatcher.prototype.matchSinglecondition = function(condition, target) {
  var match = false
  switch(condition.type) {
    case '===':
      match = target[condition.attr] === condition.value
      break
    case '==':
      match = target[condition.attr] ==  condition.value
      break
    case '>':
      match = target[condition.attr] >  condition.value
      break
    case '<':
      match = target[condition.attr] <  condition.value
      break
    default:
      throw new Error('unsupported condition type ['+condition.type+'] in condition ' + JSON.stringify(condition))
  }

  return match
}

QueryMatcher.prototype._buildConditions = function(attr, value) {
  var conditions = []

  var isQueryLikeValue = false

  if(_.isObject(value)) {
    if(value.hasOwnProperty('$gt')) {
      isQueryLikeValue = true
      conditions.push({
        type: '>',
        attr: attr,
        value: value['$gt']
      })
    }
    if(value.hasOwnProperty('$lt')) {
      isQueryLikeValue = true
      conditions.push({
        type: '<',
        attr: attr,
        value: value['$lt']
      })
    }
    if(value.hasOwnProperty('$seq')) {
      isQueryLikeValue = true
      conditions.push({
        type: '===',
        attr: attr,
        value: value['$seq']
      })
    }
    if(value.hasOwnProperty('$eq')) {
      isQueryLikeValue = true
      conditions.push({
        type: '==',
        attr: attr,
        value: value['$eq']
      })
    }

  }

  if(!isQueryLikeValue) {
    // TODO: deep equal if value is a hash
    conditions.push({
      type: '===',
      attr: attr,
      value: value
    })
  }
  return conditions
}

module.exports = QueryMatcher
