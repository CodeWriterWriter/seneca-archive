

var SenecaType = {}

SenecaType.parse = function(typeStr) {
  if(!typeStr) {
    return
  }
  var typeData = typeStr.split('/')
  var typeDefinition = {}
  if(typeData[2]) {
    typeDefinition.zone = typeData[0]
    typeDefinition.base = typeData[1]
    typeDefinition.name = typeData[2]
  } else if(typeData[1] && typeData[0] !== '-') {
    typeDefinition.base = typeData[0]
    typeDefinition.name = typeData[1]
  } else {
    typeDefinition.name = typeData[0]
  }
  return typeDefinition
}


SenecaType.stringify = function(typeDefinition) {
  if(!typeDefinition) {
    return
  }

  var typeStr = ''


  if(typeDefinition.zone) {
    typeStr += typeDefinition.zone
  } else {
    typeStr += '-'
  }
  typeStr += '/'


  if(typeDefinition.base) {
    typeStr += typeDefinition.base
  } else {
    typeStr += '-'
  }
  typeStr += '/'


  if(typeDefinition.name) {
    typeStr += typeDefinition.name
  } else {
    typeStr += '-'
  }

  return typeStr
}

SenecaType.match(expected, actual) {
  if(expected.zone && expected.zone !== actual.zone) {
    return false
  }
  if(expected.base && expected.base !== actual.base) {
    return false
  }
  if(expected.name && expected.name !== actual.name) {
    return false
  }
  return true
}




module.exports = SenecaType
