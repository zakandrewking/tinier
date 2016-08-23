import {
  ARRAY_OF, OBJECT_OF, COMPONENT, ARRAY, OBJECT, NODE, NULL, TOP, noop, get,
  isObject, isFunction, map, reduce, zip, filter, tagType, checkType, match,
  updateEl, addressWith, addressEqual, diffWithModel, getState, setState,
  getTinierState, setTinierState, makeSignal, makeOneSignalAPI,
  makeChildSignalsAPI, reduceChildren, mergeSignals, objectOf, arrayOf,
  createComponent, makeStateCallers, run,
} from '../main'

import { describe, it } from 'mocha'
import { assert } from 'chai'

const EL = 'EL'
const EL2 = 'EL2'
const TAG = 'TAG'
const _state    = { [TOP]: null }
const _bindings = { [TOP]: null }
const _signals  = { [TOP]: null }
const defStateCallers = makeStateCallers(_state, _bindings, _signals)
const DefComponent = createComponent()
const NestedComponent = createComponent({
  model: {
    hello: arrayOf(createComponent({
      model: {
        friend: createComponent(),
        ghost: 'GHOST',
      }
    }))
  },
})

describe('get', () => {
  it('gets a value from an object with a default return value', () => {
    const object = { a: 10 }
    assert.strictEqual(get(object, 'a', 20), 10)
    assert.strictEqual(get(object, 'b', 20), 20)
  })

  it('gets array indices', () => {
    assert.strictEqual(get([ 0, 1 ], 1, null), 1)
    assert.isNull(get([ 0, 1 ], 2, null))
  })

  it('default for null, undefined, true, false', () => {
    assert.strictEqual(get(null, 'b', 20), 20)
    assert.strictEqual(get(undefined, 'b', 20), 20)
    assert.strictEqual(get(true, 'b', 20), 20)
    assert.strictEqual(get(false, 'b', 20), 20)
  })
})

describe('isObject', () => {
  it('is true for object literals', () => {
    assert.isTrue(isObject({ a: 10 }))
  })

  it('is true for array literals', () => {
    assert.isTrue(isObject([ 10 ]))
  })

  it('is false for functions, strings, numbers', () => {
    assert.isFalse(isObject(() => [ 10 ]))
    assert.isFalse(isObject(10))
    assert.isFalse(isObject('10'))
  })
})

describe('isFunction', () => {
  it('is true for functions', () => {
    assert.isTrue(isFunction(() => {}))
  })

  it('is false for object literals', () => {
    assert.isFalse(isFunction({}))
  })
})

describe('map', () => {
  it('iterates over keys for objects', () => {
    const obj = { a: 1, b: 2 }
    const res = map(obj, (x, k) => k + String(x + 1))
    assert.deepEqual({ a: 'a2', b: 'b3' }, res)
  })

  it('iterates over indices for arrays', () => {
    const arr = [ 1, 2 ]
    const res = map(arr, (x, i) => i + String(x + 1))
    assert.deepEqual([ '02', '13' ], res)
  })
})

describe('reduce', () => {
  it('iterates over keys for objects', () => {
    const obj = { a: 1, b: 2 }
    const res = reduce(obj, (accum, x, k) => accum + x, 0)
    assert.deepEqual(res, 3)
  })

  it('iterates over indices for arrays', () => {
    const arr = [ 1, 2 ]
    const res = reduce(arr, (accum, x, i) => accum + x, 0)
    assert.deepEqual(res, 3)
  })
})

describe('zip', () => {
  it('zips and fills null', () => {
    const arrays = [ [ 1, 2 ], [ 3 ], null ]
    const expect = [ [ 1, 3, null ], [ 2, null, null ] ]
    assert.deepEqual(zip(arrays), expect)
  })

  it('zips objects and fills null', () => {
    const objects = [ { a: 1, b: 2 }, { a: 3, c: 4 }, null ]
    const expect = { a: [ 1, 3, null ], b: [ 2, null, null ], c: [ null, 4, null ] }
    assert.deepEqual(zip(objects), expect)
  })
})

describe('filter', () => {
  it('filters an object', () => {
    const obj = { a: 1, b: 2 }
    const res = filter(obj, a => a === 1)
    assert.deepEqual(res, { a: 1 })
  })
  it('filters an array', () => {
    const arr = [ 1, 2 ]
    const res = filter(arr, a => a === 1)
    assert.deepEqual(res, [ 1 ])
  })
})

describe('tagType', () => {
  it('returns a new object with the type', () => {
    assert.deepEqual(tagType('TAG', { a: 10 }), { a: 10, type: 'TAG' })
  })

  it('checks for invalid tag', () => {
    assert.throws(() => {
      tagType({ a: 10 }, { b: 20 })
    }, 'First argument must be a string')
  })

  it('checks for object', () => {
    assert.throws(() => {
      tagType('TAG', 'TAG')
    }, 'Second argument must be an object')
  })
})

describe('checkType', () => {
  it('checks for a type tag', () => {
    assert.isTrue(checkType('TAG', { a: 10, type: 'TAG' }))
  })

  it('checks for invalid tag', () => {
    assert.throws(() => {
      checkType({ a: 10 }, { b: 20 })
    }, 'First argument must be a string')
  })

  it('checks for object', () => {
    assert.throws(() => {
      checkType('TAG', 'TAG')
    }, 'Second argument must be an object')
  })
})

describe('match', () => {
  it('tests for tags', () => {
    const result = match(tagType(OBJECT_OF, { a: 10 }), {
      [OBJECT_OF]: (node) => node.a,
    })
    assert.strictEqual(result, 10)
  })

  it('uses NULL for null', () => {
    // LEFTOFF
    const result = match(null, {
      [OBJECT_OF]: (node) => node.a,
      [NULL]: () => null,
    })
    assert.isNull(result)
  })

  it('uses custom default for null', () => {
    const result = match(null, {
      [OBJECT_OF]: (node) => node.a,
    }, () => 10)
    assert.strictEqual(result, 10)
  })
})

describe('addressWith', () => {
  it('adds a key', () => {
    const obj = { a: [ 0, { b: 10 } ] }
    const address = addressWith([ 'a', 1 ], 'b')
    assert.strictEqual(getState(address, obj), 10)
  })

  it('returns original if key is null', () => {
    const obj = { a: [ 0, { b: 10 } ] }
    const address = addressWith([ 'a', 1 ], null)
    assert.deepEqual(getState(address, obj), { b: 10 })
  })
})

describe('addressEqual', () => {
  it('compares', () => {
    assert.isTrue(addressEqual([ 1, 2 ], [ 1, 2 ]))
    assert.isFalse(addressEqual([ 1, 2 ], [ 1, 3 ]))
  })
})

describe('getState', () => {
  it('traverses arrays and objects', () => {
    const obj = { a: [ 0, { b: 10 } ] }
    assert.strictEqual(getState([ 'a', 1, 'b' ], obj), 10)
  })
})

describe('setState', () => {
  it('sets an object', () => {
    const object = { a: [ 0, { b: 10 } ] }
    const address = [ 'a', 1, 'b' ]
    setState(address, object, 20)
    assert.strictEqual(getState(address, object), 20)
  })
})

describe('getTinierState', () => {
  it('traverses arrays, objects, and children', () => {
    // model: { child1: arrayOf(Child1({ model: { a: [ 0, Child2 ] } })) }
    const obj = {
      child1: tagType(
        NODE,
        {
          data: {
            signals: [],
            bindings: [
              {
                a: [ null, TAG ],
              },
            ],
          },
          children: [
            {
              a: [
                0,
                tagType(
                  NODE,
                  {
                    data: {
                      signals: [TAG],
                      bindings: [],
                    },
                    children: []
                  }
                ),
              ],
            },
          ],
        }
      ),
    }
    const address = [ 'child1', 0, 'a', 1 ]
    assert.strictEqual(getTinierState(address, obj).data.signals[0], TAG)
  })
})

describe('setTinierState', () => {
  it('sets signals', () => {
    // model: { child1: arrayOf(Child1({ model: { a: [ 0, Child2 ] } })) }
    const obj = {
      child1: tagType(
        NODE,
        {
          data: { signals: [] },
          children: [ { a: [
            0,
            tagType(NODE, { data: { signals: [ TAG ] }, children: [] }),
          ] } ],
        }
      ),
    }
    const address = [ 'child1', 0, 'a', 1 ]
    const newState = tagType(NODE, { data: { signals: [ TAG ] }, children: [] })
    setTinierState(address, obj, newState)
    assert.deepEqual(getTinierState(address, obj), newState)
  })
})

describe('diffWithModel', () => {
  it('diffs state by looking at model -- array', () => {
    const model = { a: arrayOf(DefComponent) }
    const oldState = { a: [ 10 ] }
    const newState = { a: [ 11, 12 ] }
    const res = diffWithModel(model, newState, oldState)
    const expect = { a: [
      tagType(NODE, {
        data: { needsCreate: false, needsUpdate: true,  needsDestroy: false },
        children: {},
      }),
      tagType(NODE, {
        data: { needsCreate: true, needsUpdate: false,  needsDestroy: false },
        children: {},
      }),
    ] }
    assert.deepEqual(res, expect)
  })

  it('diffs state by looking at model -- object nested', () => {
    const Child = createComponent({ model: { a: objectOf(DefComponent) } })
    const model = { e: Child }
    const oldState = { e: { a: { b: 9, c: 10 } } }
    const newState = { e: { a: { c: 11, d: 12 } } }
    const res = diffWithModel(model, newState, oldState)
    const expect = { e: tagType(NODE, {
      data: { needsCreate: false, needsUpdate: true, needsDestroy: false },
      children: { a: {
        b: tagType(NODE, {
          data: { needsCreate: false, needsUpdate: false, needsDestroy: true },
          children: {},
        }),
        c: tagType(NODE, {
          data: { needsCreate: false, needsUpdate: true, needsDestroy: false },
          children: {},
        }),
        d: tagType(NODE, {
          data: { needsCreate: true, needsUpdate: false, needsDestroy: false },
          children: {},
        }),
      } },
    }) }
    assert.deepEqual(res, expect)
  })

  it('accepts null for old state', () => {
    const model = { a: arrayOf(DefComponent) }
    const oldState = null
    const newState = { a: [ 11, {} ] }
    const res = diffWithModel(model, newState, oldState)
    const expect = { a: [
      tagType(NODE, {
        data: { needsCreate: true, needsUpdate: false,  needsDestroy: false },
        children: {},
      }),
      tagType(NODE, {
        data: { needsCreate: true, needsUpdate: false,  needsDestroy: false },
        children: {},
      }),
    ] }
    assert.deepEqual(res, expect)
  })
})

describe('updateEl', () => {
  it('returns null if needsDestroy', () => {
    const diff = {
      needsCreate: false,
      needsUpdate: false,
      needsDestroy: true,
    }
    const bindings = updateEl([], DefComponent, {}, diff, EL, defStateCallers)
    assert.isNull(bindings)
  })

  it('returns binding', () => {
    const component = createComponent({
      model: ({ c: DefComponent }),
      render: ({ el }) => ({ c: el }),
    })
    const state = { c: {} }
    const diff = { needsCreate: false, needsUpdate: true, needsDestroy: false }
    const bindings = updateEl([], component, state, diff, EL, defStateCallers)
    assert.deepEqual(bindings, { c: EL })
  })

  it('accepts null for tinierState', () => {
    const component = createComponent({
      model: ({ c: DefComponent }),
      render: ({ el }) => ({ c: el }),
    })
    const state = { c: {} }
    const diff = { needsCreate: true, needsUpdate: false, needsDestroy: false }
    const bindings = updateEl([], component, state, diff, EL, defStateCallers)
    assert.deepEqual(bindings, { c: EL })
  })

  it('always updates on create', () => {
    const component = createComponent({
      render: ({ el }) => el,
      shouldUpdate: () => false,
    })
    const state = { c: {} }
    const diff = { needsCreate: true, needsUpdate: false, needsDestroy: false }
    const bindings = updateEl([], component, state, diff, EL, defStateCallers)
    assert.strictEqual(bindings, EL)
  })

  it('shouldUpdate can force update', () => {
    const component = createComponent({
      render: ({ el }) => el,
      shouldUpdate: () => true,
    })
    const state = { c: {} }
    const diff = { needsCreate: false, needsUpdate: false, needsDestroy: false }
    const bindings = updateEl([], component, state, diff, EL, defStateCallers)
    assert.strictEqual(bindings, EL)
  })

  it('shouldUpdate can stop update', () => {
    const component = createComponent({
      render: ({ el }) => el,
      shouldUpdate: () => false,
    })
    const state = { c: {} }
    const diff = { needsCreate: false, needsUpdate: true, needsDestroy: false }
    const bindings = updateEl([], component, state, diff, EL, defStateCallers)
    assert.isNull(bindings)
  })
})

describe('makeSignal', () => {
  it('calls multiple listeners', () => {
    let called = 0
    const signal = makeSignal()
    signal.on(x => called += x, [ 'a' ])
    signal.on(x => called += x * 2, [ 'b' ])
    signal.call(2)
    assert.strictEqual(called, 6)
  })
})

describe('makeOneSignalAPI', () => {
  it('stores on functions', () => {
    const sig = makeOneSignalAPI(false)
    let count = 0
    sig.on(({ x }) => { count = x })
    sig._onFns[0]()({ x: 10 })
    assert.strictEqual(count, 10)
  })

  it('stores onEach functions for collections', () => {
    const sig = makeOneSignalAPI(true)
    let count = 0
    // key
    sig.onEach(({ x, k, i }) => {
      assert.isUndefined(i)
      count = k + x
    })
    sig._onFns[0]('key')({ x: 10 })
    assert.strictEqual(count, 'key10')
    // index
    sig.onEach(({ x, k, i }) => {
      assert.isUndefined(k)
      count = i + x
    })
    sig._onFns[1](3)({ x: 10 })
    assert.strictEqual(count, 13)
  })

  it('accepts a new call function', () => {
    const sig = makeOneSignalAPI(false)
    let count = 0
    sig._callFns = [ { fn: ({ x, y }) => count = x + y } ]
    sig.call({ x: 20, y: 30 })
    assert.deepEqual(count, 50)
  })

  it('only accepts a single object argument for on/onEach', () => {
    assert.throws(() => {
      const sig = makeOneSignalAPI(false)
      sig.on(({ x }) => x)
      sig._onFns[0]()(1, 2)
    }, 'On function only accepts a single object as argument.')
  })

  it('only accepts a single object argument for call', () => {
    assert.throws(() => {
      const sig = makeOneSignalAPI(false)
      sig.call(1, 2)
    }, 'Call only accepts a single object as argument.')
  })
})

describe('makeChildSignalsAPI', () => {
  it('keeps model shape', () => {
    const HasSignal = createComponent({
      signalNames: [ 'ribose' ],
    })
    const Parent = createComponent({
      model: {
        deoxy: arrayOf(HasSignal)
      }
    })
    const childSignals = makeChildSignalsAPI(Parent.model)
    let watch = ''
    childSignals.deoxy.ribose.onEach(({ s, i }) => { watch = s + i })
    childSignals.deoxy.ribose._onFns[0](2)({ s: 'S' })
    assert.strictEqual(watch, 'S2')
    // TODO allow return values? e.g. for Promises
  })
})

describe('reduceChildren', () => {
  it('works over nested NODE', () => {
    const obj = {
      child1: tagType(
        NODE,
        {
          data: 3,
          children: [
            {
              a: [
                0,
                tagType(
                  NODE,
                  {
                    data: 2 ,
                    children: []
                  }
                ),
              ],
            },
          ],
        }
      ),
    }
    const fn = (accum, data, address) => accum + data + address[0]
    const res = reduceChildren(obj, fn, 0)
    assert.deepEqual(res, '3child1')
  })
})

describe('mergeSignals', () => {
  it('creates a new signals object', () => {
    // listener
    let valChild1 = ''
    let valChild2 = 0
    let valParent = 0

    // components
    const Child = createComponent({
      displayName: 'Child',

      signalNames: [ 'setParent', 'setChild1', 'setChild2' ],

      signalSetup: ({ signals, methods }) => {
        signals.setChild1.on(methods.setChild1)
        signals.setChild2.on(methods.setChild2)
      },

      methods: {
        setChild1: ({ v }) => { valChild1 += v },
        setChild2: ({ v }) => { valChild2 = v },
      },
    })

    const Parent = createComponent({
      displayName: 'Parent',

      model: { child: arrayOf(Child) },

      signalNames: [ 'setChild1', 'passThrough' ],

      signalSetup: ({ signals, childSignals, methods }) => {
        signals.setChild1.on(childSignals.child.setChild1.call)
        childSignals.child.setParent.onEach(({ v, i }) => {
          methods.setParent({ v: v + i })
        })
        childSignals.child.setParent.onEach(signals.passThrough.call)
      },

      methods: {
        setParent: ({ v }) => { valParent = v }
      },
    })

    // CREATE
    const state    = { [TOP]: { child: [ {}, {} ] } }
    const bindings = { [TOP]: null }
    const signals  = { [TOP]: null }
    const address = [ TOP ]
    const stateCallers = makeStateCallers(state, bindings, signals)
    const localDiff = diffWithModel(Parent, state[TOP], null)

    // data
    const signals1 = mergeSignals(Parent, address, localDiff, signals[TOP],
                                  stateCallers)

    // callSelf
    signals1.children.child[1].data.signals.setChild2.call({ v: 2 })
    assert.strictEqual(valChild2, 2)

    // callChild
    signals1.data.signals.setChild1.call({ v: 'a' })
    assert.strictEqual(valChild1, 'aa')

    // callParent
    signals1.children.child[1].data.signals.setParent.call({ v: 50 })
    assert.strictEqual(valParent, 51)

    // TODO UPDATE
    const localState2 = { child: [ ...state[TOP].child, {} ] }
    const localDiff2 = diffWithModel(Parent, localState2, state[TOP])
    const signals2 = mergeSignals(Parent, address, localDiff2, signals1,
                                  stateCallers)

    // child -> parent
    signals2.children.child[2].data.signals.setParent.call({ v: 50 })
    assert.strictEqual(valParent, 52)
    // parent -> child
    valChild1 = ''
    signals2.data.signals.setChild1.call({ v: 'a' })
    assert.strictEqual(valChild1, 'aaa')
    // check callFns
    assert.strictEqual(signals2.data.childSignalsAPI
                       .child.setParent._callFns.length, 3)

    // then DESTROY
    const localState3 = { child: [ state[TOP].child[0] ] }
    const localDiff3 = diffWithModel(Parent, localState3, localState2)
    const signals3 = mergeSignals(Parent, address, localDiff3, signals2,
                                  stateCallers)
    valChild1 = ''
    signals2.data.signals.setChild1.call({ v: 'a' })
    assert.strictEqual(valChild1, 'a')
    // check callFns
    assert.strictEqual(signals3.data.childSignalsAPI
                       .child.setParent._callFns.length, 1)
  })
})

describe('createComponent', () => {
  it('errors if the model is a single component', () => {
    assert.throws(() => {
      createComponent({ model: DefComponent })
    }, /cannot be another Component/)
  })
})

describe('run', () => {
  it('respects binding object for create and render', () => {
    const Child = createComponent({
      init: () => ({ val: 1 }),
      signalNames: [ 'add' ],
      signalSetup: ({ signals, reducers }) => signals.add.on(reducers.add),
      reducers: {
        add: ({ state, v }) => ({ ...state, val: v })
      },

      render: ({ state, methods, el }) => {
        assert.strictEqual(el, EL2)
      },

      willMount: ({ el }) => {
        assert.strictEqual(el, EL2)
      },

      didMount: ({ el }) => {
        assert.strictEqual(el, EL2)
      },

      shouldUpdate: () => {
        return true
      },

      willUpdate: ({ el }) => {
        assert.strictEqual(el, EL2)
      },

      didUpdate: ({ el }) => {
        assert.strictEqual(el, EL2)
      },

      willUnmount: ({ el }) => {
        assert.strictEqual(el, EL2)
      },
    })

    const Parent = createComponent({
      displayName: 'Parent',
      model: { child: Child },
      signalNames: [ 'add' ],
      signalSetup: ({ signals, childSignals }) => {
        signals.add.on(childSignals.child.add.call)
      },
      methods: { add: ({ signals, v }) => signals.add.call({ v }) },
      init: () => ({ child: Child.init() }),
      render: () => ({ child: EL2 }),
    })

    const { getState, signals, methods } = run(Parent, EL)
    signals.add.call({ v: 2 })
    assert.strictEqual(getState().child.val, 2)
    methods.add({ v: 3 })
    assert.strictEqual(getState().child.val, 3)
  })
})
