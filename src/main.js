/** @module tinier */

import MiniSignal from 'mini-signals'

// constants
export const ARRAY_OF  = '@TINIER_ARRAY_OF'
export const OBJECT_OF = '@TINIER_OBJECT_OF'
export const COMPONENT = '@TINIER_COMPONENT'
export const ARRAY     = '@TINIER_ARRAY'
export const OBJECT    = '@TINIER_OBJECT'

// basic functions
function noop () {}

function constant (val) {
  return () => val
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
export function isObject (value) {
  return value != null && (typeof value === 'object')
}

/**
 * Check if the value is an array
 *
 * @param {*} value - The value to test.
 *
 * @return {Boolean}
 */
export function isArray (value) {
  return Array.isArray(value)
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

export function tagType (obj, type) {
  return { ...obj, type }
}

export function checkType (type, obj) {
  return get(obj, 'type', null) === type
}

/**
 * Run functions depending on the object type of node.
 *
 * @param {Object} node - A node in a Tinier model.
 * @param {Object} caseFns - An object with the following keys: OBJECT_OF,
 * ARRAY_OF, COMPONENT, ARRAY, and OBJECT. Each value is a function that takes
 * the node as a single argument.
 * @param {Function} defaultFn - A function to run if the node falls into none
 * of the categories. It takes the node as a single argument.
 *
 * @return {*} Return value from the callback function.
 */
export function handleNodeTypes (node, caseFns, defaultFn) {
  if      (checkType(OBJECT_OF, node)) return caseFns[OBJECT_OF](node)
  else if (checkType(ARRAY_OF, node))  return caseFns[ARRAY_OF](node)
  else if (checkType(COMPONENT, node)) return caseFns[COMPONENT](node)
  else if (isArray(node))              return caseFns[ARRAY](node)
  else if (isObject(node))             return caseFns[OBJECT](node)
  else                                 return defaultFn(node)
}

function throwUnrecognizedType (node) {
  throw Error('Unrecognized node type in model: ' + node)
}

function throwContentMismatch (state, node, ...args) {
  throw Error('Content shape does not match state shape: ' + node +
              ' <-> Array ' + state)
}

// -------------------------------------------------------------------
// Update components by walking content
// -------------------------------------------------------------------

/**
 * Run lifecycle functions for the component.
 *
 * @param {Object} component
 * @param {Boolean} needsCreate
 * @param {Boolean} needsUpdate
 * @param {Boolean} needsDestroy
 * @param {Object} state - The local state.
 * @param {Object} el - The element for the child to render in.
 * @param {Object} methods - The patched method functions.
 * @param {Object} signals - Instantiated signals.
 *
 * @return {Object} New bindings if needsUpdate is true. Otherwise null.
 */
export function updateEl (component, needsCreate, needsUpdate, needsDestroy,
                          arg) {
  if (needsDestroy) {
    component.willUnmount(arg)
    return null
  }

  const shouldUpdateOut = component.shouldUpdate(arg)
  const shouldUpdate = needsCreate ||
          ((shouldUpdateOut === null && needsUpdate) || shouldUpdateOut)

  if      (needsCreate)  component.willMount(arg)
  else if (shouldUpdate) component.willUpdate(arg)

  // render
  const res = shouldUpdate ? component.render(arg) : null

  if      (needsCreate)  component.didMount(arg)
  else if (shouldUpdate) component.didUpdate(arg)

  return res
}

/**
 * Run create, update, and destroy for component. Recursive.
 *
 * @param {Array} address - The location of the component in the state.
 * @param {Object} node - A model or a node within a model.
 * @param {Object} state - The user state corresponding to the model node.
 * @param {Object} diff - The diff object for this component.
 * @param {Object} signals -
 * @param {Object} bindings -
 * @param {Object} callReducer - A function that can call a reducer on the state
 * for a given address.
 * @param {Object} callMethod - A function that can call a method on the state
 * for a given address.
 */
function updateWithModel (address, node, state, diff, signals, bindings,
                          callReducer, callMethod) {
  handleNodeTypes(
    node,
    {
      [OBJECT_OF]: (node) => {
        // tinierState might have more keys than bindings, userState, and
        // modelNode, so map over tinierState.
        zipObjects([ diff, state, bindings ]).map(([ d, s, b ], k) => {
          const newBindings = updateEl(node.component, d, s, b, signals,
                                       callReducer)
          if (newBindings) {
            updateWithModel(addressWith(address, k), node.component.model, s, d,
                            callReducer)
          }
        })
      },
      [ARRAY_OF]: (node) => {
        // diff might have more keys than bindings, userState, and
        // modelNode, so map over tinierState. TODO what if diff
        zip([ diff, state, bindings ]).map(([ d, s, b ], i) => {
          const newBindings = updateEl(node.component, d, s, b, signals,
                                       callReducer)
          if (newBindings) {
            updateWithModel(addressWith(address, i), node.component.model, s, d,
                            callReducer)
          }
        })
      },
      [COMPONENT]: (node) => {
        const s = state
        const d = diff
        const b = bindings
        const newBindings = updateEl(node.component, d, s, b, d.signals,
                                     callReducer)
        if (newBindings) {
          updateWithModel(address, node.component.model, s, d, callReducer)
        }
      },
      [ARRAY]: (node) => {
        node.map((n, i) => {
          updateWithModel(n, userState[i], tinierState[i], bindings[i])
        })
      },
      [OBJECT]: (node) => {
        mapValues(node, (n, k) => {
          updateWithModel(n, userState[k], tinierState[k], bindings[k])
        })
      }
    },
    throwUnrecognizedType
  )
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
function diffWithModel (modelNode, newState, oldState) {
  return handleNodeTypes(
    modelNode,
    {
      [OBJECT_OF]: (node) => {
        const isValid = (obj, k) => isObject(obj) && k in obj && obj[k] !== null
        const l = Object.assign({}, newState || {}, oldState || {})
        return mapValues(l, function (_, k) {
          const res = diffWithModel(node.component.model, get(newState, k, null), get(oldState, k, null))
          res.needsCreate  =  isValid(newState, k) && !isValid(oldState, k)
          res.needsUpdate  =  isValid(newState, k) &&  isValid(oldState, k) && newState[k] !== oldState[k]
          res.needsDestroy = !isValid(newState, k) &&  isValid(oldState, k)
          return res
        })
      },
      [ARRAY_OF]: (node) => {
        const isValid = (obj, i) => isArray(obj) && i < obj.length && obj[i] !== null
        const longest = Math.max(isArray(newState) ? newState.length : 0,
                                 isArray(oldState) ? oldState.length : 0)
        const l = Array.apply(null, { length: longest })
        return l.map(function (_, i) {
          const res = diffWithModel(node.component.model, get(newState, i, null), get(oldState, i, null))
          res.needsCreate  =  isValid(newState, i) &&  !isValid(oldState, i)
          res.needsUpdate  =  isValid(newState, i) &&   isValid(oldState, i) && newState[i] !== oldState[i]
          res.needsDestroy = !isValid(newState, i) &&   isValid(oldState, i)
          return res
        })
      },
      [COMPONENT]: (node) => {
        const isValid = obj => obj !== null
        const res = diffWithModel(node.component.model, newState || null, oldState || null)
        res.needsCreate  =  isValid(newState) &&  !isValid(oldState)
        res.needsUpdate  =  isValid(newState) &&   isValid(oldState) && newState !== oldState
        res.needsDestroy = !isValid(newState) &&   isValid(oldState)
        return res
      },
      [ARRAY]: (node) => {
        return modelNode.map((v, i) => {
          return diffWithModel(v, get(newState, i, null), get(oldState, i, null))
        })
      },
      [OBJECT]: (node) => {
        return mapValues(modelNode, (v, k) => {
          return diffWithModel(v, get(newState, k, null), get(oldState, k, null))
        })
      }
    },
    throwUnrecognizedType
  )
}

// -------------------------------------------------------------------
// Signals
// -------------------------------------------------------------------

export function makeSignal (_name, isCollection) {
  const _onFns = []
  const _callFns = []
  const on = fn => _onFns.push(fn)
  const call = fn => _callFns.push(fn)
  return (isCollection ?
          { onEach: on, call, _onFns, _callFns, _name } :
          { on, call, _onFns, _callFns, _name })
}

/**
 * Implement the signal API.
 */
function makeSignals (signalNames, isCollection = false) {
  return fromPairs(signalNames.map(name => {
    return [ name, makeSignal(name, isCollection) ]
  }))
}

/**
 * Implement the childSignal API.
 */
export function makeChildSignals (model) {
  const makeEachSignal = _name => makeSignal(_name, true)
  const mapFilterRecurse = (node) => {
    return filter(map(node, makeChildSignals), n => n !== null)
  }
  return handleNodeTypes(
    model,
    {
      [OBJECT_OF]: node => makeSignals(node.component.signals, true),
      [ARRAY_OF]: node => makeSignals(node.component.signals, true),
      [COMPONENT]: node => makeSignals(node.signals),
      [ARRAY]: mapFilterRecurse,
      [OBJECT]: mapFilterRecurse,
    },
    constant(null)
  )
}

function getTinierState (address, object) {
  return address.reduce((node, val) => {
    return checkType(node, SIGNALS) ? node.children[val] : node[val]
  }, object)
}

function setTinierState (address, object, value) {
  const [ ar, last ] = tail(address)
  const parent = getTinierState(ar, object)
  parent[last] = value
}

// function initializeSignalsRaw (node, callReducer, callMethod, address = []) {
//   // TODO run setup
//   // TODO bindings needs to keep track of the full state tree!
//   const tinierNodeRecurse = component => {
//     const reducers = patchReducers(component.reducers, callReducer, address)
//     const methods = patchMethods(component.methods, callMethod, address)
//     const signals = makeSignals(component.signals)
//     const childSignals = makeChildSignals(component.model)
//     component.setup({ childSignals, signals, reducers, methods })
//     return tagType(
//       {
//         signals: null,
//         children: initializeSignals(component.model, callReducer, callMethod,
//                                     address)
//       },
//       TINIER_STATE
//     )
//   }
//   const mapRecurse = node => map(node, (x, k) => {
//     initializeSignals(x, callReducer, callMethod, addressWith(address, k))
//   })
//   return handleNodeTypes(
//     node,
//     {
//       [OBJECT_OF]: node => tinierNodeRecurse(node.component),
//       [ARRAY_OF]: node => tinierNodeRecurse(node.component),
//       [COMPONENT]: tinierNodeRecurse,
//       [ARRAY]: mapRecurse,
//       [OBJECT]: mapRecurse,
//     },
//     constant(null)
//   )
// }

// function mergeSignals () {
//   throw new Error('Not implemented')
// }

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
  return tagType({ component }, OBJECT_OF)
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
  return tagType({ component }, ARRAY_OF)
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
    signals:      [],
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
  return tagType({ ...defaults, ...options }, COMPONENT)
}

function patchReducers (component, callReducer) {
  return map(component.reducers, reducer => {
    return function (arg) {
      callReducer(state, signals, bindings, callReducer, callMethod)
    }
  })
}

/**
 * Return an object of functions that call the methods with component-specific
 * arguments.
 */
export function patchMethods (address, component, callMethod, reducers) {
  const methods = map(component.methods, method => {
    return function (arg) {
      if (arg instanceof Event) {
        callMethod(address, method, methods, reducers, this, arg, {})
      } else {
        callMethod(address, method, methods, reducers, null, null, arg)
      }
    }
  })
  return methods
}

/**
 * Patch methods and reducers for the application.
 */
function patchFunctions (component, callMethod, callReducer, address = []) {
  const nodeRecurse = (component, type) => {
    const reducers = patchReducers(component, callReducer)
    const methods = patchMethods(address, component, callMethod, reducers)
    return {
      reducers,
      methods,
      children: nodeRecurse(component.model, callMethod, callReducer,
                            addressWith(address, '???'))
    }
  }
  const mapRecurse = (node) => map(node, (x, k) => {
    return patchFunctions(x, callMethod, callReducer, addressWith(address, k))
  })
  return handleNodeTypes(
    component,
    {
      [OBJECT_OF]: node => nodeRecurse(node.component, OBJECT_OF),
      [ARRAY_OF]: node => nodeRecurse(node.component, ARRAY_OF),
      [COMPONENT]: node => nodeRecurse(node, COMPONENT),
      [ARRAY]: mapRecurse,
      [OBJECT]: mapRecurse,
    },
    constant(null)
  )
}

function buildCallMethod (state) {
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
    // get the local state
    const localState = getState(address, state)
    // run the method
    method({ state: localState, signals, methods, reducers, target, event,
             ...arg })
  }
}

function buildCallReducer (state, tinierState, callReducer, callMethod) {
  /**
   * Call a reducer on the local state
   * @param address - A location, as an array of keys (strings and integers).
   * @param component
   * @param reducer
   * @param arg - An argument object.
   */
  return (address, component, reducer, arg) => {
    // get the local state
    const localState = getState(address, state)
    const localTinierState = getTinierState(address, tinierState)
    // run the reducer
    const modLocalState = reducer({ ...arg, state: localState })
    // diff and set
    // TODO make sure diffWithModel accepts top-level null
    const diff = diffWithModel(component, modLocalState, localState)
    const newLocalState = (localState === modLocalState ?
                           localState : modLocalState)
    setState(address, state, newLocalState)
    // update the components
    const newTinierState = updateWithModel(address, component, newLocalState,
                                           diff, localTinierState, callReducer,
                                           callMethod)
    // TODO make sure this accepts null for signals & bindings
    setTinierState(address, tinierState, newTinierState)
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
  let state = null
  let tinierState = null

  // functions that access state, signals, and bindings
  const callMethod = buildCallMethod(state)
  const callReducer = buildCallReducer(state, tinierState, callReducer,
                                       callMethod)

  // first draw
  const initReducer = () => initialState || component.init()
  callReducer([], component, initReducer, {})

  // return API
  const { signals, methods } = getTinierState([], tinierState)
  return { getState: () => state, signals, methods }
}
