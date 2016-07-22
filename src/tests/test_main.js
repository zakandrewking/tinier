import {
  ARRAY_OF, OBJECT_OF, COMPONENT, ARRAY, OBJECT, STATE, TOP, get, isObject, map,
  zip, filter, tagType, checkType, handleNodeTypes, updateEl,
  addressWith, diffWithModel, getState, setState, getTinierState,
  setTinierState, makeOneSignalAPI, makeChildSignalsAPI, getSignalCallbacks,
  mergeSignals, objectOf, arrayOf, createComponent, buildCallMethod,
  buildCallReducer, run,
} from '../main'

import { describe, it } from 'mocha'
import { assert } from 'chai'

const EL = 'EL'
const EL2 = 'EL2'
const TAG = 'TAG'
const _state    = { [TOP]: null }
const _bindings = { [TOP]: null }
const _signals  = { [TOP]: null }
const defCallMethod = buildCallMethod(_state)
const defCallReducer = buildCallReducer(_state, _bindings, _signals,
                                        defCallReducer, defCallMethod)
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

describe('handleNodeTypes', () => {
  it('tests for tags', () => {
    const result = handleNodeTypes(tagType(OBJECT_OF, { a: 10 }), {
      [OBJECT_OF]: (node) => node.a,
    })
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
        STATE,
        {
          signals: [],
          bindings: [
            {
              a: [ null, TAG ],
            },
          ],
          children: [
            {
              a: [
                0,
                tagType(
                  STATE,
                  { signals: [TAG], bindings: [], children: [] }
                ),
              ],
            },
          ],
        }
      ),
    }
    const address = [ 'child1', 0, 'a', 1 ]
    assert.strictEqual(getTinierState(address, obj).signals[0], TAG)
  })
})

describe('setTinierState', () => {
  it('sets signals', () => {
    // model: { child1: arrayOf(Child1({ model: { a: [ 0, Child2 ] } })) }
    const obj = {
      child1: tagType(
        STATE,
        {
          data: { signals: [] },
          children: [ { a: [
            0,
            tagType(STATE, { data: { signals: [ TAG ] }, children: [] }),
          ] } ],
        }
      ),
    }
    const address = [ 'child1', 0, 'a', 1 ]
    const newState = tagType(STATE, { data: { signals: [ TAG ] }, children: [] })
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
      tagType(STATE, {
        data: { needsCreate: false, needsUpdate: true,  needsDestroy: false },
        children: {},
      }),
      tagType(STATE, {
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
    const expect = { e: tagType(STATE, {
      data: { needsCreate: false, needsUpdate: true, needsDestroy: false },
      children: { a: {
        b: tagType(STATE, {
          data: { needsCreate: false, needsUpdate: false, needsDestroy: true },
          children: {},
        }),
        c: tagType(STATE, {
          data: { needsCreate: false, needsUpdate: true, needsDestroy: false },
          children: {},
        }),
        d: tagType(STATE, {
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
    const newState = { a: [ 11, 12 ] }
    const res = diffWithModel(model, newState, oldState)
    const expect = { a: [
      tagType(STATE, {
        data: { needsCreate: true, needsUpdate: false,  needsDestroy: false },
        children: {},
      }),
      tagType(STATE, {
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
    const bindings = updateEl([], DefComponent, {}, diff, EL, {},
                              defCallReducer, defCallMethod)
    assert.isNull(bindings)
  })

  it('returns binding', () => {
    const component = createComponent({
      model: ({ c: DefComponent }),
      render: ({ el }) => ({ c: el }),
    })
    const state = { c: {} }
    const diff = { needsCreate: false, needsUpdate: true, needsDestroy: false }
    const bindings = updateEl([], component, state, diff, EL, {},
                              defCallReducer, defCallMethod)
    assert.deepEqual(bindings, { c: EL })
  })

  it('accepts null for tinierState', () => {
    const component = createComponent({
      model: ({ c: DefComponent }),
      render: ({ el }) => ({ c: el }),
    })
    const state = { c: {} }
    const diff = { needsCreate: true, needsUpdate: false, needsDestroy: false }
    const bindings = updateEl([], component, state, diff, EL, {},
                              defCallReducer, defCallMethod)
    assert.deepEqual(bindings, { c: EL })
  })

  it('always updates on create', () => {
    const component = createComponent({
      render: ({ el }) => el,
      shouldUpdate: () => false,
    })
    const state = { c: {} }
    const diff = { needsCreate: true, needsUpdate: false, needsDestroy: false }
    const bindings = updateEl([], component, state, diff, EL, {},
                              defCallReducer, defCallMethod)
    assert.strictEqual(bindings, EL)
  })

  it('shouldUpdate can force update', () => {
    const component = createComponent({
      render: ({ el }) => el,
      shouldUpdate: () => true,
    })
    const state = { c: {} }
    const diff = { needsCreate: false, needsUpdate: false, needsDestroy: false }
    const bindings = updateEl([], component, state, diff, EL, {},
                              defCallReducer, defCallMethod)
    assert.strictEqual(bindings, EL)
  })

  it('shouldUpdate can stop update', () => {
    const component = createComponent({
      render: ({ el }) => el,
      shouldUpdate: () => false,
    })
    const state = { c: {} }
    const diff = { needsCreate: false, needsUpdate: true, needsDestroy: false }
    const bindings = updateEl([], component, state, diff, EL, {},
                              defCallReducer, defCallMethod)
    assert.isNull(bindings)
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
    sig._callFn = ({ x, y }) => { count = x + y }
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

// describe('getSignalCallbacks', () => {
//   it('collects callbacks if needsCreate', () => {
//     const diff = { needsCreate: false, needsUpdate: true, needsDestroy: false }
//     const { signalCallbacks, childSignalCallbacks } =
//             getSignalCallbacks([], DefComponent, diff, {}, defCallReducer,
//                                defCallMethod)
//   })

//   it('returns nulls if not needsCreate', () => {
//   })
// })

describe('mergeSignals', () => {
  it('creates a new signals object', () => {
    // listener
    let valChild = 0
    let valParent = 0

    // components
    const Child = createComponent({
      signalNames: [ 'callParent', 'call' ],

      setupSignals: ({ signals, methods }) => {
        signals.call.on(methods.call)
      },

      methods: {
        call: ({ v }) => { valChild = v }
      },
    })

    const Parent = createComponent({
      model: arrayOf(Child),

      signalNames: [ 'callChild' ],

      setupSignals: ({ signals, childSignals, methods }) => {
        signals.callChild.on(childSignals.call.dispatch)
        childSignals.callParent.on(({ v, i }) => {
          methods.call({ v: v + i })
        })
      },

      methods: {
        call: ({ v }) => { valParent = v }
      },
    })

    const state    = { [TOP]: null }
    const bindings = { [TOP]: null }
    const signals  = { [TOP]: null }
    const address = [ TOP ]
    const callMethod = buildCallMethod(state)
    const callReducer = buildCallReducer(state, bindings, signals, callReducer, callMethod)

    // data
    const diff = { needsCreate: true, needsUpdate: false, needsDestroy: false }
    const callbacks = {
      [TOP]: tagType(STATE, {
        data: getSignalCallbacks(address, Parent, diff, callReducer,
                                 callMethod),
        children: [
          tagType(STATE, {
            data: getSignalCallbacks(addressWith(address, 0), Child, diff,
                                     callReducer, callMethod),
            children: null
          }),
          tagType(STATE, {
            data: getSignalCallbacks(addressWith(address, 1), Child, diff,
                                     callReducer, callMethod),
            children: null
          }),
        ]
      })
    }
    const result = mergeSignals(signals, callbacks)

    // callChild
    signals[TOP].data.callChild.dispatch({ v: 10 })
    assert.strictEqual(valChild, 10)

    // callParent
    signals[TOP].children[1].data.callParent.dispatch({ v: 50 })
    assert.strictEqual(valParent, 52)
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
  it('respects binding object for create and render', (done) => {
    const Child = createComponent({
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
        done()
      },

      willUnmount: ({ el }) => {
        assert.strictEqual(el, EL2)
      },
    })

    const Parent = createComponent({
      model: { child: Child },
      init: () => ({ child: Child.init() }),
      render: () => ({ child: EL2 }),
    })

    run(Parent, EL)
  })
})
