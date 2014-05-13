

var QueryMatcher = require('../lib/QueryMatcher.js')
var assert = require('assert')

describe('QueryMatcher', function() {


  it('straight', function() {

    var qm = new QueryMatcher({attr1: '123456'})

    assert.ok(qm.match({attr1: '123456', attr2: 'foobar'}))
    assert.ok(!qm.match({attr1: '1234567', attr2: 'foobar'}))
    assert.ok(!qm.match({attr1: 123456, attr2: 'foobar'}))

  })

  it('straight - multi', function() {

    var qm = new QueryMatcher({attr1: '123456', attr2: 'foobar', attr3: 123})

    assert.ok(qm.match({attr1:  '123456',  attr2: 'foobar',   attr3: 123}))
    assert.ok(!qm.match({attr1: '123456',  attr2: 'foobar',   attr3: 1234}))
    assert.ok(!qm.match({attr1: '123456',  attr2: 'foobar2',   attr3: 123}))
    assert.ok(!qm.match({attr1: '1234567', attr2: 'foobar',   attr3: 123}))
    assert.ok(!qm.match({attr1: 123456,    attr2: 'foobar',   attr3: 123}))

  })

  it('gt', function() {

    var qm = new QueryMatcher({attr1: {$gt: 123}})

    assert.ok(qm.match({attr1:   124}))
    assert.ok(qm.match({attr1:   1233424}))
    assert.ok(!qm.match({attr1:  122}))
    assert.ok(!qm.match({attr1: -123}))

  })

  it('lt', function() {

    var qm = new QueryMatcher({attr1: {$lt: 123}})

    assert.ok(!qm.match({attr1:  124}))
    assert.ok(!qm.match({attr1:  1233424}))
    assert.ok(qm.match({attr1:   122}))
    assert.ok(qm.match({attr1:  -123}))

  })

  it('eq', function() {

    var qm = new QueryMatcher({attr1: {$eq: 123}})

    assert.ok(qm.match({attr1:   123}))
    assert.ok(qm.match({attr1:   '123'}))
    assert.ok(!qm.match({attr1:  1233424}))
    assert.ok(!qm.match({attr1:  122}))
    assert.ok(!qm.match({attr1: -123}))

  })

  it('seq', function() {

    var qm = new QueryMatcher({attr1: {$seq: 123}})

    assert.ok(qm.match({attr1:   123}))
    assert.ok(!qm.match({attr1:  '123'}))
    assert.ok(!qm.match({attr1:  1233424}))
    assert.ok(!qm.match({attr1:  122}))
    assert.ok(!qm.match({attr1: -123}))

  })

  it('mix', function() {

    var now = new Date()
    var oneSecondFromNow = new Date(now.getTime() + 1000)
    var oneYearAgo = new Date().setFullYear(now.getFullYear() - 1)
    var oneYearFromNow = new Date().setFullYear(now.getFullYear() + 1)

    var qm = new QueryMatcher({
      attr1: { $gt: 123, $lt:1234 },
      attr2: { $gt: 12 },
      attr3: { $seq: 45.5 },
      attr4: { $eq: '60' },
      attr5: { $gt: now }
    })

    assert.ok(qm.match({
      attr1: 124,
      attr2: 13,
      attr3: 45.5,
      attr4: '60',
      attr5: oneYearFromNow
    }))

    assert.ok(qm.match({
      attr1: 1233,
      attr2: 130,
      attr3: 45.5,
      attr4: 60,
      attr5: oneSecondFromNow
    }))

    assert.ok(!qm.match({
      attr1: 1233,
      attr2: 130,
      attr3: 45.5,
      attr4: 60,
      attr5: oneYearAgo
    }))

    assert.ok(!qm.match({
      attr1: 12367,
      attr2: 130,
      attr3: 45.5,
      attr4: 60,
      attr5: oneSecondFromNow
    }))

    assert.ok(!qm.match({
      attr1: 123,
      attr2: 130,
      attr3: 45.5,
      attr4: '-60',
      attr5: oneSecondFromNow
    }))

    assert.ok(!qm.match({
      attr1: 123323,
      attr2: 13230,
      attr3: 4523.5,
      attr4: '-630',
      attr5: oneSecondFromNow
    }))

  })


})
