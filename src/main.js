/** @module tinier */

import MiniSignal from 'mini-signals'

// constants
export const ARRAY_OF  = '@TINIER_ARRAY_OF'
export const OBJECT_OF = '@TINIER_OBJECT_OF'
export const COMPONENT = '@TINIER_COMPONENT'
export const ARRAY     = '@TINIER_ARRAY'
export const OBJECT    = '@TINIER_OBJECT'
export const STATE     = '@TINIER_STATE'
export const NULL      = '@TINIER_NULL'
export const TOP       = '@TINIER_TOP'
export const CREATE    = '@TINIER_CREATE'
export const DESTROY   = '@TINIER_DESTROY'
export const UPDATE    = '@TINIER_UPDATE'

// basic functions
function noop () {}

function constant (val) {
  return () => val
}

function identity (val) {
  return val
}

function tail (array) {
  return [ array.slice(0, -1), array[array.length - 1] ]
}

function fromPairs (pairs) {
  return pairs.reduce((accum, [ key, val ]) => {
    return { ...accum, [key]: val }
  }, {})
}

/**
 * Get the property of the object, or return the default value.
 * @param {Object} object - An object.
 * @param {String} property - An property of the object.
 * @param {*} defaultValue - The default if the property is not present.
 * @return {*} The value of the property or, if not present, the default value.
 */
export function get (object, property, defaultValue) {
  return object && object.hasOwnProperty(property) ? object[property] : defaultValue
}

/**
 * Check if the value is an object with enumerable properties. Also returns true
 * for arrays.
 *
 * @param {*} value - The value to test.
 *
 * @return {Boolean}
 */
export function isObject (object) {
  return object != null && (typeof object === 'object')
}

/**
 * Check if the object is an array
 *
 * @param {*} object - The object to test.
 *
 * @return {Boolean}
 */
export function isArray (object) {
  return Array.isArray(object)
}

/**
 * Check if the object is a function.
 *
 * @param {*} object - The object to test.
 *
 * @return {Boolean}
 */
export function isFunction (object) {
  return typeof(object) === 'function'
}

/**
 * Iterate over the keys and values of an object. Uses Object.keys to find
 * iterable keys.
 * @param {Object} obj - The input object.
 * @param {Function} fn - A function that takes the arguments (value, key).
 * @return {Object} A transformed object with values returned by the function.
 */
function mapValues (obj, fn) {
  return Object.keys(obj).reduce((c, v) => {
    return { ...c, [v]: fn(obj[v], v) }
  }, {})
}

/**
 * Use map for Array and mapValues for Object.
 * @param {Object} obj - The input object or array.
 * @param {Function} fn - A function that takes the arguments (value, key/index).
 * @return {Object} A transformed object/array with values returned by the function.
 */
export function map (obj, fn) {
  return isArray(obj) ? obj.map(fn) : mapValues(obj, fn)
}

function zipArrays (arrays) {
  const lenLongest = Math.max.apply(null, map(filter(arrays, x => x !== null), a => a.length))
  const res = []
  for (let i = 0; i < lenLongest; i++) {
    res.push(map(arrays, a => a !== null && i < a.length ? a[i] : null))
  }
  return res
}

function flatten (arrays) {
  return Array.prototype.concat(...arrays)
}

function zipObjects (objects) {
  const res = {}
  const allKeys = flatten(map(filter(objects, x => x !== null), Object.keys))
  return fromPairs(map(allKeys, k => {
    return [ k, objects.map(o => o !== null && k in o ? o[k] : null) ]
  }))
}

export function zip (vals) {
  return isArray(get(vals, 0)) ? zipArrays(vals) : zipObjects(vals)
}

export function filterValues (object, fn) {
  const out = {}
  for (var key in object) {
    const value = object[key]
    if (fn(value, key)) out[key] = value
  }
  return out
}

export function filter (obj, fn) {
  return isArray(obj) ? obj.filter(fn) : filterValues(obj, fn)
}

export function tagType (type, obj) {
  if (typeof type !== 'string') {
    throw new Error('First argument must be a string')
  }
  if (!isObject(obj)) {
    throw new Error('Second argument must be an object')
  }
  return { ...obj, type }
}

export function checkType (type, obj) {
  if (obj === null) {
    return type === NULL
  }
  if (typeof type !== 'string') {
    throw new Error('First argument must be a string')
  }
  if (!isObject(obj)) {
    throw new Error('Second argument must be an object or null')
  }
  return get(obj, 'type', null) === type
}

/**
 * Basic pattern matching.
 * @param {Object|null} object - An object generated with tagType, an object, an
 *                               array, or null.
 * @param {Object} fns - An object with types for keys and functions for values.
 *                       Also accepts keys tinier.OBJECT, tinier.ARRAY, and
 *                       tinier.NULL. To avoid conflict, tinier.OBJECT has the
 *                       lowest priority.
 * @param {Function} defaultFn - A function to run if the object type is not
 *                               found. Takes `object` as a single argument.
 * @return {*} Return value from the called function.
 */
export function match (object, fns, defaultFn = throwUnrecognizedType) {
  for (let key in fns) {
    if ((key === NULL   && object === null ) ||
        (key === ARRAY  && isArray(object) ) ||
        checkType(key, object)) {
      return fns[key](object)
    }
  }
  if (OBJECT in fns && isObject(object)) {
    return fns[OBJECT](object)
  }
  return defaultFn(object)
}

function throwUnrecognizedType (node) {
  throw new Error('Unrecognized node type in model: ' + node)
}

function throwContentMismatch (state, node, ...args) {
  throw new Error('Content shape does not match state shape: ' + node +
                  ' <-> Array ' + state)
}

// -------------------------------------------------------------------
// Update components
// -------------------------------------------------------------------

export function mergeBindings (tinierState, directives) {
}

/**
 * Run lifecycle functions for the component.
 *
 * @param {Object} address
 * @param {Object} component
 * @param {Object} diff
 * @param {Object} state
 * @param {Object} tinierState
 * @param {Function} callReducer - A function that can call a reducer on the
 * state for a given address.
 * @param {Function} callMethod - A function that can call a method on the state
 * for a given address.
 *
 * @return {Object}
 */
export function updateEl (address, component, state, diff, el, signals,
                          callReducer, callMethod) {
  // the object passed to lifecycle functions
  const reducers = patchReducers(address, component, callReducer)
  const methods = patchMethods(address, component, callMethod, reducers,
                               signals)
  const arg = { state, methods, reducers, signals, el }

  if (diff.needsDestroy) {
    component.willUnmount(arg)
    return null
  }

  const shouldUpdateOut = component.shouldUpdate(arg)
  const shouldUpdate = diff.needsCreate ||
          ((shouldUpdateOut === null && diff.needsUpdate) || shouldUpdateOut)

  if      (diff.needsCreate) component.willMount(arg)
  else if (shouldUpdate) component.willUpdate(arg)

  // render
  const bindings = shouldUpdate ? component.render(arg) : null

  if      (diff.needsCreate) component.didMount(arg)
  else if (shouldUpdate) component.didUpdate(arg)

  return bindings
}

/**
 * Run create, update, and destroy for component. Recursive.
 *
 * @param {Array} address - The location of the component in the state.
 * @param {Object} node - A model or a node within a model.
 * @param {Object} diff - The diff object for this component.
 * @param {Object} state - The user state corresponding to the model node.
 * @param {Object} tinierState -
 * @param {Function} callReducer - A function that can call a reducer on the
 * state for a given address.
 * @param {Function} callMethod - A function that can call a method on the state
 * for a given address.
 */
function updateComponents (address, node, state, diff, bindings, signals,
                           callReducer, callMethod) {
  const updateRecurse = ([ d, s, b, sig ], k) => {
    const component = k !== null ? node.component : node
    const newAddress = k !== null ? addressWith(address, k) : address
    const data = updateEl(newAddress, component, s, d.data, get(b, 'data', null),
                          sig.data, callReducer, callMethod)
    const children = updateComponents(newAddress, component.model, s,
                                      d.children, get(b, 'children', null),
                                      sig.children, callReducer, callMethod)
    return tagType(STATE, { data, children })
  }
  const mapRecurse = node => map(node, (n, k) => {
    return updateComponents(addressWith(address, k), n, state[k], diff[k],
                            bindings[k], signals[k], callReducer, callMethod)
  })
  const returnedBindings = match(
    node,
    {
      [OBJECT_OF]: node => zip([ diff, state, bindings, signals ]).map(updateRecurse),
      [ARRAY_OF]:  node => zip([ diff, state, bindings, signals ]).map(updateRecurse),
      [COMPONENT]: node => updateRecurse([ diff, state, bindings, signals ], null),
      [ARRAY]:  mapRecurse,
      [OBJECT]: mapRecurse,
    })
  // merge the returned bindings into a coherent object after updating each
  // component instances
  return mergeBindings(bindings, returnedBindings)
}

// -------------------------------------------------------------------
// State
// -------------------------------------------------------------------

export function addressWith (address, key) {
  return key === null ? address : [ ...address, key ]
}

/**
 * Get the value in state.
 *
 * @param {Array} address
 * @param {Object} object
 *
 * @return {*}
 */
export function getState (address, object) {
  return address.reduce((accum, val) => accum[val], object)
}

/**
 * Set the value in state.
 *
 * @param {Array} address
 * @param {Object} object
 * @param {*} value
 *
 * @return {*}
 */
export function setState (address, object, value) {
  const [ ar, last ] = tail(address)
  const parent = getState(ar, object)
  parent[last] = value
}

export function getTinierState (address, object) {
  return address.reduce((node, val) => {
    return checkType(STATE, node) ? node.children[val] : node[val]
  }, object)
}

export function setTinierState (address, object, value) {
  const [ ar, last ] = tail(address)
  const parent = getTinierState(ar, object)
  parent[last] = value
}

/**
 * Walk content and diff newState and oldState. Where differences exist, update
 * the needsCreate, needsUpdate, and needsDestroy labels in the view in the
 * content.
 *
 * @param {Object} modelNode - A model or a node of a model.
 * @param {Object} newState - The new state corresponding to modelNode.
 * @param {Object|null} oldState - The old state corresponding to modelNode.
 * @param {Array} address - The current address.
 *
 * @returns {Object} An object with the same shape as modelNode that specifies which
 * view need to be created, updated, and destroyed. Also keeps track of the
 * actions for each view.
 */
export function diffWithModel (modelNode, newState, oldState) {
  const mapRecurse = (node) => {
    return map(modelNode, (v, i) => {
      return diffWithModel(v, get(newState, i, null), get(oldState, i, null))
    })
  }
  return match(
    modelNode,
    {
      [OBJECT_OF]: (node) => {
        const isValid = (obj, k) => isObject(obj) && k in obj && obj[k] !== null
        const l = Object.assign({}, newState || {}, oldState || {})
        return mapValues(l, function (_, k) {
          const data = {
            needsCreate:  isValid(newState, k) && !isValid(oldState, k),
            needsUpdate:  isValid(newState, k) &&  isValid(oldState, k) && newState[k] !== oldState[k],
            needsDestroy: !isValid(newState, k) &&  isValid(oldState, k),
          }
          const children = diffWithModel(node.component.model, get(newState, k, null), get(oldState, k, null))
          return tagType(STATE, { data, children })
        })
      },
      [ARRAY_OF]: (node) => {
        const isValid = (obj, i) => isArray(obj) && i < obj.length && obj[i] !== null
        const longest = Math.max(isArray(newState) ? newState.length : 0,
                                 isArray(oldState) ? oldState.length : 0)
        const l = Array.apply(null, { length: longest })
        return l.map(function (_, i) {
          const data = {
            needsCreate:   isValid(newState, i) &&  !isValid(oldState, i),
            needsUpdate:   isValid(newState, i) &&   isValid(oldState, i) && newState[i] !== oldState[i],
            needsDestroy: !isValid(newState, i) &&   isValid(oldState, i),
          }
          const children = diffWithModel(node.component.model, get(newState, i, null), get(oldState, i, null))
          return tagType(STATE, { data, children })
        })
      },
      [COMPONENT]: (node) => {
        const isValid = obj => obj !== null
        const data = {
          needsCreate:   isValid(newState) &&  !isValid(oldState),
          needsUpdate:   isValid(newState) &&   isValid(oldState) && newState !== oldState,
          needsDestroy: !isValid(newState) &&   isValid(oldState),
        }
        const children = diffWithModel(node.model, newState || null, oldState || null)
        return tagType(STATE, { data, children })
      },
      [ARRAY]: mapRecurse,
      [OBJECT]: mapRecurse,
    },
    throwUnrecognizedType
  )
}

// -------------------------------------------------------------------
// Signals
// -------------------------------------------------------------------

/**
 * Create an object that with `on/onEach` and `call` attributes.
 */
export function makeOneSignalAPI (isCollection) {
  // make a `_callFn` function that will be replaced later and is the target of
  // `call`
  const res = { _callFn: noop }
  // call will run `_callFn`
  res.call = (...args) => {
    if (args.length > 1 || !isObject(args[0])) {
      throw new Error('Call only accepts a single object as argument.')
    }
    res._callFn(args[0])
  }
  // store callbacks passed with `on` or `onEach`
  res._onFns = []
  const onName = isCollection ? 'onEach' : 'on'
  res[onName] = fn => {
    if (!isFunction(fn)) {
      throw new Error('Argument to "' + onName + '" must be a function')
    }
    res._onFns.push(index => (...args) => {
      if (args.length > 1 || !isObject(args[0])) {
        throw new Error('On function only accepts a single object as argument.')
      }
      const argObject = ( typeof index === 'string' ? { k: index, ...args[0] } :
                          (typeof index === 'number' ? { i: index, ...args[0] } :
                           args[0]))
      fn(argObject)
    })
  }
  return res
}

/**
 * Implement the signals API.
 */
function makeSignalsAPI (signalNames, isCollection) {
  return fromPairs(signalNames.map(name => {
    return [ name, makeOneSignalAPI(isCollection) ]
  }))
}

/**
 * Implement the childSignals API.
 */
export function makeChildSignalsAPI (model) {
  const mapFilterRecurse = node => {
    return filter(map(node, makeChildSignalsAPI), n => n !== null)
  }
  return match(
    model,
    {
      [OBJECT_OF]: node => makeSignalsAPI(node.component.signalNames, true),
      [ARRAY_OF]:  node => makeSignalsAPI(node.component.signalNames, true),
      [COMPONENT]: node => makeSignalsAPI(node.signalNames, false),
      [ARRAY]:  mapFilterRecurse,
      [OBJECT]: mapFilterRecurse,
    },
    constant(null)
  )
}

export function getSignalCallbacks (address, component, diff, callReducer,
                                    callMethod, signals) {
  if (diff.needsCreate) {
    const signalCallbacks = makeSignalsAPI(component.signalNames, false)
    const childSignalCallbacks = makeChildSignalsAPI(component.model)
    const reducers = patchReducers(address, component, callReducer)
    const methods = patchMethods(address, component, callMethod, reducers,
                                 signals)
    // cannot call signalSetup any earlier because it needs a reference to
    // `methods`, which must know the address
    component.signalSetup({
      methods,
      signals: signalCallbacks,
      childSignals: childSignalCallbacks
    })
    return tagType(CREATE, { signalCallbacks, childSignalCallbacks})
  } else if (diff.needsDestroy) {
    return tagType(DESTROY, {})
  } else {
    return tagType(UPDATE, {})
  }
}

export function mergeSignals (signals, callbacks, upChildCallbacks = null,
                              upChildKey = null) {
  const updateRecurse = node => {
    // node data will be tagged with create or destroy
    return match(node.data, {
      // In the case of destroy, this leaf in the signals object will be null.
      // TODO also delete references in other signals.
      [DESTROY]: constant(null),
      // For create, apply the callbacks
      [CREATE]: nodeData => {
        const signalsData = get(signals, 'data', null)
        const data = map(
          zip([signalsData, nodeData.signalCallbacks, upChildCallbacks]),
          ([ signal, callbackObj, upChildObj ], key) => {
            // Check if the signal already exists. Otherwise, create one.
            // TODO replace MiniSignal with local implementation
            const newSignal = signal === null ? new MiniSignal() : signal

            // For each callback, add each onFn to the signal, and set the
            // callFn to the signal dispatch.
            const bs = callbackObj._onFns.map(fn => {
              // only on, not onEach, so execute the fn with no argument
              return newSignal.add(fn())
            })
            callbackObj._callFn = val => newSignal.dispatch(val)

            // For the childSignalCallbacks from the parent
            if (upChildObj !== null) {
              const bsUp = upChildObj._onFns.map(fn => {
                return newSignal.add(fn(upChildKey))
              })
              upChildObj._callFn = val => newSignal.dispatch(val)
            }

            // TODO save bs and bsUp somewhere
            // bs.map(b => b.detach())

            return newSignal
          }
        )
        // loop through the children of signals and node
        const children = mergeSignals(get(signals, 'children', null),
                                      node.children,
                                      nodeData.childSignalCallbacks)
        return tagType(STATE, { data, children })
      },
      // For update, return the existing signals
      [UPDATE]: identity,
    })
  }
  const mapRecurse = node => {
    return map(node, (n, k) => mergeSignals(get(signals, k, null), n,
                                            get(upChildCallbacks, k, null), k))
  }
  return match(callbacks, {
    [STATE]: updateRecurse,
    [ARRAY]:  mapRecurse,
    [OBJECT]: mapRecurse,
    [NULL]: identity,
  })
}

/**
 *
 */
function updateSignals (address, node, diff, signals, callReducer, callMethod) {
  const updateRecurse = ([ d, sig ], k) => {
    const component = k !== null ? node.component : node
    const newAddress = k !== null ? addressWith(address, k) : address
    const sigData = signals !== null ? signals.data : null
    const sigChildren = signals !== null ? signals.children : null
    const data = getSignalCallbacks(address, component, d.data, callReducer,
                                    callMethod, sigData)
    const children = updateSignals(newAddress, component.model, d.children,
                                   sigChildren, callReducer, callMethod)
    return tagType(STATE, { data, children })
  }
  const mapRecurse = node => map(node, (n, k) => {
    return updateSignals(addressWith(address, k), n, diff[k],
                         get(signals, k, null),
                         callReducer, callMethod)
  })
  const callbacks = match(node, {
    [OBJECT_OF]: node => zip([ diff, signals ]).map(updateRecurse),
    [ARRAY_OF]:  node => zip([ diff, signals ]).map(updateRecurse),
    [COMPONENT]: node => updateRecurse([ diff, signals ], null),
    [ARRAY]:  mapRecurse,
    [OBJECT]: mapRecurse,
  })
  // TODO is this recursing twice?
  return mergeSignals(signals, callbacks)
}

// -------------------------------------------------------------------
// Component & run functions
// -------------------------------------------------------------------

/**
 * Create an object representing many instances of this component, for use in a
 * tinier model.
 *
 * @param {Object} component - Tinier component.
 *
 * @return {Object}
 */
export function objectOf (component) {
  return tagType(OBJECT_OF, { component })
}

/**
 * Create an array representing many instances of this component, for use in a tinier
 * model.
 *
 * @param {Object} component - Tinier component.
 *
 * @return {Object}
 */
export function arrayOf (component) {
  return tagType(ARRAY_OF, { component })
}

/**
 * Create a tinier component.
 *
 * @param {Object} componentArgs - Functions defining the Tinier component.
 * @param {str} componentArgs.displayName - A name for the component.
 * @param {[str]} componentArgs.signals - An array of signal names.
 * @param {Object} componentArgs.model - The model object.
 * @param {Function} componentArgs.init - A function to initialize the state.
 * @param {Object} componentArgs.reducers -
 * @param {Object} componentArgs.methods -
 * @param {Function} componentArgs.willMount -
 * @param {Function} componentArgs.didMount -
 * @param {Function} componentArgs.shouldUpdate - Return true if the component
 * should update, false if it should not, or null to use to default behavior
 * (update when state changes).
 * @param {Function} componentArgs.willUpdate -
 * @param {Function} componentArgs.didUpdate -
 * @param {Function} componentArgs.willUnmount -
 * @param {Function} componentArgs.render -
 *
 * @returns {Object} A tinier component.
 */
export function createComponent (options = {}) {
  // default attributes
  const defaults = {
    displayName:  '',
    signalNames:  [],
    signalSetup:  noop,
    model:        {},
    init:         constant({}),
    reducers:     {},
    methods:      {},
    willMount:    noop,
    didMount:     noop,
    shouldUpdate: constant(null),
    willUpdate:   noop,
    didUpdate:    noop,
    willUnmount:  noop,
    render:       constant({}),
  }
  // check inputs
  mapValues(options, (_, k) => {
    if (!(k in defaults)) {
      console.error('Unexpected argument ' + k)
    }
  })
  // check model
  if (options.model && checkType(COMPONENT, options.model)) {
    throw new Error('The model cannot be another Component. The top level of the' +
                    'model should be an array or an object literal')
  }
  // set defaults & tag
  return tagType(COMPONENT, { ...defaults, ...options })
}

function patchReducers (address, component, callReducer) {
  return map(component.reducers, reducer => {
    return function (arg) {
      callReducer(address, component, reducer, arg)
    }
  })
}

/**
 * Return an object of functions that call the methods with component-specific
 * arguments.
 */
export function patchMethods (address, component, callMethod, reducers, signals) {
  const methods = map(component.methods, method => {
    return function (arg) {
      if (typeof Event !== 'undefined' && arg instanceof Event) {
        callMethod(address, method, signals, methods, reducers, this, arg, {})
      } else {
        callMethod(address, method, signals, methods, reducers, null, null, arg)
      }
    }
  })
  return methods
}

export function buildCallMethod (state) {
  /**
   * Call a method on the local state
   * @param address
   * @param method
   * @param signals
   * @param methods - Patched method functions.
   * @param reducers - Patched reducer functions.
   * @param target - The value of this in the called function.
   * @param event - The event at the time of the function call.
   * @param arg - An argument object.
   */
  return (address, method, signals, methods, reducers, target, event, arg) => {
    // check for uninitialized state
    if (state[TOP] === null) {
      throw new Error('Cannot call method before the app is initialized (e.g. ' +
                      'in signalSetup).')
    }
    // get the local state
    const localState = getState(address, state)
    // run the method
    method({ state: localState, signals, methods, reducers, target, event,
             ...arg })
  }
}

/**
 * Return a new callReducer function.
 * @param state -
 * @param bindings -
 * @param signals -
 * @param callReducer -
 * @param callMethod -
 * @returns {Function} -
 *   Call a reducer on the local state
 *   @param address - A location, as an array of keys (strings and integers).
 *   @param component
 *   @param reducer
 *   @param arg - An argument object.
 */
export function buildCallReducer (state, bindings, signals, callReducer,
                                  callMethod) {
  return (address, component, reducer, arg) => {
    // get the local state
    const localState = getState(address, state)
    const localBindings = getTinierState(address, bindings)
    const localSignals = getTinierState(address, signals)
    // run the reducer
    const newLocalState = reducer({ ...arg, state: localState })
    // set
    setState(address, state, newLocalState)
    // diff
    const diff = diffWithModel(component, newLocalState, localState)
    // update the signals
    const newSignals = updateSignals(address, component, diff, localSignals,
                                     callReducer, callMethod)
    setTinierState(address, signals, newSignals)
    // update the components
    const newBindings = updateComponents(address, component, newLocalState,
                                         diff, localBindings, localSignals,
                                         callReducer, callMethod)
    setTinierState(address, bindings, newBindings)
  }
}

/**
 * Run a tinier component.
 * @param {Object} component - A tinier component.
 * @param {*} appEl - An element to pass to the component's create, update, and
 * destroy methods.
 * @param {Function} createStore - A function to create a redux store. This can
 * be redux.createStore or a store with middleware generated by
 * redux.createStoreWithMiddleware.
 * @param {Object} initialState - The initial state. If null, then component.init()
 * will be called to initialize the state.
 * @return {Object} The API functions, incuding getState and getSignals.
 */
export function run (component, appEl, initialState = null) {
  // Create variables that will store the state for the whole lifetime of the
  // application. Similar to the redux model.
  let state    = { [TOP]: null }
  let bindings = { [TOP]: null }
  let signals  = { [TOP]: null }
  let topAddress = [ TOP ]

  // functions that access state, signals, and bindings
  const callMethod = buildCallMethod(state)
  const callReducer = buildCallReducer(state, bindings, signals, callReducer,
                                       callMethod)

  // first draw
  const initReducer = () => initialState !== null ? initialState : component.init()
  callReducer(topAddress, component, initReducer, {})

  // return API
  const localSignals = getTinierState(topAddress, signals).data
  const reducers = patchReducers(topAddress, component, callReducer)
  const methods = patchMethods(topAddress, component, callMethod, reducers,
                               localSignals)
  return { getState: () => state, signals: localSignals, methods }
}
