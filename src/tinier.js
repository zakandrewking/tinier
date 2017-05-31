/** @module tinier */

// constants
const COMPONENT       = '@TINIER_COMPONENT'
const INSTANCE        = '@TINIER_INSTANCE'
export const NODE     = '@TINIER_NODE'
export const CREATE   = '@TINIER_CREATE'
export const UPDATE   = '@TINIER_UPDATE'
export const DESTROY  = '@TINIER_DESTROY'
export const BINDING  = '@TINIER_BINDING'
export const BINDINGS = '@TINIER_BINDINGS'
export const ELEMENT  = '@TINIER_ELEMENT'
const LISTENER_OBJECT = '@TINIER_LISTENERS'

// Basic functions
export function tail (array) {
  return [ array.slice(0, -1), array[array.length - 1] ]
}

export function head (array) {
  return [ array[0], array.slice(1) ]
}

export function fromPairs (pairs) {
  return pairs.reduce((accum, [ key, val ]) => {
    return { ...accum, [key]: val }
  }, {})
}

/**
 * Get the property of the object or index of the array, or return null.
 * @param {Object|Array} object - An object or array.
 * @param {String} property - An property of the object.
 * @return {*} The value of the property or, if not present, null.
 */
export function get (object, property) {
  return (object &&
          typeof object !== 'string' &&
          object.hasOwnProperty(property)) ? object[property] : null
}

export function isUndefined (object) {
  return typeof object === 'undefined'
}

/**
 * Check if the value is an object with enumerable properties. Also returns true
 * for arrays.
 * @param {*} value - The value to test.
 * @return {Boolean}
 */
export function isObject (object) {
  return object != null && (typeof object === 'object')
}

/**
 * Check if the object is an array
 * @param {*} object - The object to test.
 * @return {Boolean}
 */
export function isArray (object) {
  return Array.isArray(object)
}

export function isString (v) {
  return typeof v === 'string'
}

export function isNumber (v) {
  return typeof v === 'number'
}

export function isBoolean (v) {
  return typeof v === 'boolean'
}

/**
 * Check if the object is a function.
 * @param {*} object - The object to test.
 * @return {Boolean}
 */
export function isFunction (object) {
  return typeof(object) === 'function'
}

export function notNull (val) {
  return val !== null
}

/**
 * Iterate over the keys and values of an object. Uses Object.keys to find
 * iterable keys.
 * @param {Object} obj - The input object.
 * @param {Function} fn - A function that takes the arguments (value, key).
 * @return {Object} A transformed object with values returned by the function.
 */
export function mapValues (obj, fn) {
  const newObj = {}
  for (let key in obj) {
    newObj[key] = fn(obj[key], key)
  }
  return newObj
}

export function reduceValues (obj, fn, init) {
  let accum = init
  for (let key in obj) {
    accum = fn(accum, obj[key], key)
  }
  return accum
}

export function zipArrays (arrays) {
  const lenLongest = Math.max.apply(null, arrays.filter(x => x !== null).map(a => a.length))
  const res = []
  for (let i = 0; i < lenLongest; i++) {
    res.push(arrays.map(a => a !== null && i < a.length ? a[i] : null))
  }
  return res
}

export function zipObjects (objects) {
  const len = objects.length
  // find all the keys
  const allKeys = {}
  for (let i = 0; i < len; i++) {
    const object = objects[i]
    if (object === null) {
      continue
    }
    for (let k in object) {
      allKeys[k] = true
    }
  }
  // make new object
  const res = {}
  for (let key in allKeys) {
    res[key] = Array(len)
    for (let i = 0; i < len; i++) {
      const object = objects[i]
      res[key][i] = get(object, key)
    }
  }
  return res
}

export function filterValues (object, fn) {
  const out = {}
  for (let key in object) {
    const value = object[key]
    if (fn(value, key)) out[key] = value
  }
  return out
}

/**
 * Lazy any function.
 * @param {[Boolean]}
 * @return {Boolean}
 */
export function any (ar) {
  for (let i = 0, l = ar.length; i < l; i++) {
    const val = ar[i]
    if (!isBoolean(val)) {
      throw new Error('Not a boolean: ' + val)
    }
    if (val) {
      return true
    }
  }
  return false
}

/**
 * Defers calling fn until the current process finishes.
 */
function defer (fn) {
  setTimeout(fn, 1)
}

function throwUnrecognizedType (value) {
  throw new Error('Unrecognized type: ' + value)
}

// ------------------
// Update components
// ------------------

/**
 * Determine whether the model has any child components.
 * @param {Object} A state tree.
 * @return {Boolean} True if the state has any children.
 */
export function hasChildren (state) {
  if (state && state.type === INSTANCE) {
    return true
  } else if (isArray(state)) {
    // Array
    return any(state.map(hasChildren))
  } else if (isObject(state)) {
    // isObject always goes after isArray
    return any(Object.keys(state).map(k => hasChildren(state[k])))
  } else {
    return false
  }
}

/**
 * Convert string, number, or array to hashable string.
 * @param {String|Number|Array} input
 * @return {String} Hashable string.
 */
export function makeBindingKey (input) {
  if (isArray(input)) {
    // Separate with , and escape commas
    return input
      .map(x => String(x).replace(',', '\\,').replace(/\\$/, '\\\\'))
      .join(',')
  } else {
    return String(input)
  }
}

/**
 * Check the result of render against the model and state.
 * @param {Object} node - A model node.
 * @param {*} state - A state node.
 * @param {Object} bindings - The new bindings returned by render.
 * @return {Object} The render result object.
 */
export function processBindings (bindings) {
  const renderResult = {}
  for (let i = 0, l = bindings.data.length; i < l; i++) {
    const thisBinding = bindings.data[i]
    renderResult[makeBindingKey(thisBinding[0])] = thisBinding[1]
  }
  return renderResult
}

/**
 *
 */
function runAndProcessRender (shouldUpdate, render, props) {
  if (shouldUpdate) {
    const res = render(props)
    if (res == null) {
      // Render might return null or undefined if there are no children
      return null
    } else if (res && res.type === BINDINGS) {
      return processBindings(res)
    } else if (isArray(res)) {
      return processBindings(render(props.el, ...res))
    } else {
      return processBindings(render(props.el, res))
    }
  } else {
    return null
  }
}

/**
 * Run lifecycle functions for the component.
 * @param {Array} address -
 * @param {Object} component -
 * @param {Object} state -
 * @param {Object} diffVal -
 * @param {Object|null} lastRenderedEl - The element rendered in previously, if
 *                                       there was one.
 * @param {Object} renderResult - The bindings lookup object.
 * @param {Array} relativeAddress - The address relative to the parent
 *                                  component.
 * @param {Object} stateCallers -
 * @return {Object}
 */
export function updateEl (address, instance, diffVal, el, stateCallers, opts) {
  const { component, state, lastRenderedEl } = instance

  // TODO running these every time is inefficient. Replace lastRenderedEl with
  // lastRenderData, and store any calculated quantities (el, reducers, signals,
  // methods). When to trash the cache?
  const reducers = patchReducersWithState(address, component, stateCallers.callReducer)
  const signals = patchSignals(address, component.signalNames, stateCallers.callSignal)
  const methods = patchMethods(address, component.methods, stateCallers.callMethod,
                               reducers, signals)

  // Warn if the el is null
  if (el === null
      && diffVal !== DESTROY
      && instance.component.render !== component_defaults.render) {
    throw new Error('No binding provided for instance ' + instance.displayName
                    + ' at [' + address.join(', ') + '].')
  }

  // The object passed to lifecycle functions
  const props = { state, methods, reducers, signals, el, lastRenderedEl }

  if (diffVal === DESTROY) {
    // Destroy
    if (component.willUnmount !== component_defaults.willUnmount) {
      component.willUnmount(props)
    }
    return null
  } else {
    // Create or update
    const shouldUpdate = (diffVal === CREATE
                          || diffVal === UPDATE
                          || el !== lastRenderedEl)

    // Lifecycle functions
    if (diffVal === CREATE
        && component.willMount !== component_defaults.willMount) {
      component.willMount(props)
    } else if (shouldUpdate
               && component.willUpdate !== component_defaults.willUpdate) {
      component.willUpdate(props)
    }

    if (opts.verbose && shouldUpdate) {
      console.log('Rendering ' + instance.displayName + ' at [' +
                  address.join(', ') + '].')
    }

    // Render
    const nextRenderResult = runAndProcessRender(shouldUpdate, component.render,
                                                 props)

    // Check result
    if (shouldUpdate
        && nextRenderResult === null
        && hasChildren(instance.state)) {
      throw new Error('The render function of instance ' +
                      instance.displayName + ' did not return new bindings')
    }

    // These need to be asynchronous
    if (diffVal === CREATE
        && component.didMount !== component_defaults.didMount) {
      defer(() => component.didMount(props))
    } else if (shouldUpdate
               && component.didUpdate !== component_defaults.didUpdate) {
      defer(() => component.didUpdate(props))
    }

    // If the instance rendered, then change lastEl
    return nextRenderResult
  }
}

/**
 * Run create, update, and destroy for component.
 * @param {Array} address - The location of the component in the state.
 * @param {Object} state -
 * @param {Object} diff - The diff object for this component.
 * @param {Object} renderResult -
 * @param {Object} relativeAddress -
 * @param {Object} stateCallers - The object with functions to modify global
 *                                state.
 * @param {Object|null} upChild - The childSignalsAPI object for the parent
 *                                Component.
 * @param {Array|null} upAddress - A local address specifying the location
 *                                 relative to the parent Component.
 * @return {Object}
 */
function updateComponents (state, diff, stateCallers, opts, renderResult = null,
                           address = [], relativeAddress = [], upChild = null) {
  if (state && state.type === INSTANCE) {
    const instance = state
    const component = instance.component

    // Get binding el
    const el = renderResult !== null
          ? renderResult[makeBindingKey(relativeAddress)]
          : instance.lastRenderedEl

    // Create or update the signals
    if (diff.data === CREATE) {
      instance.signalData = createSignals(instance, stateCallers, address,
                                          relativeAddress, upChild)
    } else if (diff.data === UPDATE) {
      updateSignals(diff, instance, stateCallers, address, relativeAddress,
                    upChild)
    }
    const childSignalsAPI = instance.signalData.childSignalsAPI

    // Update the component. If DESTROY, result will be null.
    const nextRenderResult = updateEl(address, instance, diff.data, el,
                                      stateCallers, opts)

    // Update children
    updateComponents(instance.state, diff.children, stateCallers, opts,
                     nextRenderResult, address, [], childSignalsAPI)
  } else if (isArray(state)) {
    // Array
    return state.map((s, i) => {
      updateComponents(s, diff[i], stateCallers, opts, renderResult,
                       addressWith(address, i), addressWith(relativeAddress, i),
                       upChild)

    })
  } else if (isObject(state)) {
    // isObject always goes after isArray
    return mapValues(state, (s, k) => {
      updateComponents(s, diff[k], stateCallers, opts, renderResult,
                       addressWith(address, k), addressWith(relativeAddress, k),
                       upChild)
    })
  }
  // Ignore other state
}

// -------------------------------------------------------------------
// State
// -------------------------------------------------------------------

export function addressWith (address, key) {
  if (key === null) {
    return address
  } else {
    const newAddress = address.slice(0)
    newAddress.push(key)
    return newAddress
  }
}

export function addressEqual (a1, a2) {
  if (a1 === null || a2 === null || a1.length !== a2.length) return false
  return a1.reduce((accum, v, i) => accum && v === a2[i], true)
}

/**
 * Get the value in a tree. If the value is an Instance, then returns the
 * Instance.
 * @param {Array} address -
 * @param {Object} tree -
 * @return {*} - The value at the given address.
 */
export function treeGet (address, tree) {
  return address.reduce((t, k) => {
    return t && t.type === INSTANCE ? t.state[k] : t[k]
  }, tree)
}

function treeSetInner (address, tree, value) {
  if (address.length === 0) {
    return value
  } else {
    const [ k, rest ] = head(address)
    // TODO possibly check for trees that don't match keys here
    return (typeof k === 'string'
            ? { ...tree, [k]: treeSet(rest, treeGet([ k ], tree), value) }
            : [ ...tree.slice(0, k), treeSet(rest, treeGet([ k ], tree), value), ...tree.slice(k + 1) ])
  }
}

/**
 * Set the value in a tree; immutable. When a Component Instance is found, sets
 * the state attribute rather than replacing the Instance.
 * @param {Array} address -
 * @param {Object} tree -
 * @param {*} value - The new value to set at address.
 * @return (*) The new tree.
 */
export function treeSet (address, tree, value) {
  if (tree && tree.type === INSTANCE) {
    // For a Component Instance, set the state attribute
    tree.state = treeSetInner(address, tree.state, value)
    return tree
  } else {
    return treeSetInner(address, tree, value)
  }
}

/**
 * Determine whether to update, create, destroy, or do nothing for a new state
 * and old state. Also run shouldUpdate to potentially ignore the update.
 */
function computeDiffValue (instance, lastInstance, shouldUpdate, address, trigAddress) {
  if (instance !== null
      && (lastInstance === null
          || !(lastInstance && lastInstance.type === INSTANCE))) {
    return CREATE
  } else if (instance !== null
             && lastInstance && lastInstance.type === INSTANCE) {
    const localState = get(instance, 'state')
    const lastLocalState = get(lastInstance, 'state')
    const shouldUpdateRes = shouldUpdate({
      state: localState,
      lastState: lastLocalState,
      componentTriggeredUpdate: addressEqual(address, trigAddress),
    })
    if (localState !== lastLocalState && shouldUpdateRes) {
      return UPDATE
    } else {
      // Do nothing
      return null
    }
  } else if (instance === null && lastInstance !== null) {
    return DESTROY
  }
  // Both old and new instance null, then doing nothing
  return null
}

/**
 * Compute the full diff tree for the state. Calls shouldUpdate.
 * @param {Object} state - The new state.
 * @param {Object|null} lastState - The old state.
 * @param {Array} trigAddress -
 * @param {Array} address -
 * @returns {Object} The diff tree.
 */
export function diffTree (state, lastState, trigAddress, address = []) {
  if ((state && state.type === INSTANCE)
      || (state === null && lastState && lastState.type === INSTANCE)) {
    // For an instance, calculate a diff value
    const shouldUpdate = state !== null
          ? state.component.shouldUpdate
          : null
    const data = computeDiffValue(state, lastState, shouldUpdate,
                                  address, trigAddress)
    const children = diffTree(get(state, 'state'), get(lastState, 'state'),
                              trigAddress, address)
    return { type: NODE, data, children }
  } else if (isArray(state)) {
    // For array, get the longest array and diff based on that. Deal with the
    // possibility that lastState is not an array.
    const l = isArray(lastState)
          ? Array.apply(null, { length: Math.max(state.length, lastState.length) })
          : state
    return l.map((_, i) => {
      return diffTree(get(state, i), get(lastState, i), trigAddress,
                      addressWith(address, i))
    })
  } else if (isObject(state)) { // isObject always goes after isArray
    // Get all keys from both objects. Deal with possibility that lastState and
    // state have different shapes.
    const l = (isObject(lastState) && !isArray(lastState))
          ? Object.keys(state).concat(Object.keys(lastState))
          : Object.keys(state)
    return fromPairs(l.map(k => {
      const diff = diffTree(get(state, k), get(lastState, k), trigAddress, addressWith(address, k))
      return [ k, diff ]
    }))
  } else {
    // Null in a diff means do nothing
    return null
  }
}

//---------
// Signals
//---------

/**
 * Make a signal.
 * @return {Object} A signal with attributes on and call.
 */
export function makeSignal () {
  const res = { _onFns: [] }
  res.on = fn => {
    if (!isFunction(fn)) {
      throw new Error('First argument to "on" must be a function')
    }
    res._onFns = [ ...res._onFns, fn ]
  }
  res.call = (...args) => res._onFns.map(fn => fn(...args))
  return res
}

/**
 * Create an object that with on/onEach and call attributes.
 * @param {Boolean} isCollection -
 * @return {Object} The signal API.
 */
export function makeOneSignalAPI () {
  // Make a _callFn that will be replaced later and is the target of call
  const res = { _callFns: [] }
  // call will run all functions in _callFns
  res.call = (...args) => {
    if (args.length > 1 || !isObject(args[0])) {
      throw new Error('Call only accepts a single object as argument.')
    }
    res._callFns.map(({ fn }) => fn(args[0]))
  }
  // store callbacks passed with `on` or `onEach`
  res._onFns = []
  res.on = fn => {
    if (!isFunction(fn)) {
      throw new Error('Argument to "on" must be a function')
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
function makeSignalsAPI (signalNames) {
  return fromPairs(signalNames.map(name => [ name, makeOneSignalAPI() ]))
}

/**
 * Implement the childSignals API.
 */
export function makeChildSignalsAPI (state) {
  if (state && state.type === INSTANCE) {
    return makeSignalsAPI(state.component.signalNames)
  } else if (isArray(state)) {
    return state.map(makeChildSignalsAPI).filter(notNull)
  } else if (isObject(state)) {
    // isObject always goes after isArray
    return filterValues(mapValues(state, makeChildSignalsAPI), notNull)
  } else {
    return null
  }
}

/**
 * Run signalSetup with the component.
 * @param {Object} component -
 * @param {Array} address -
 * @param {Object} stateCallers -
 * @return {Object} Object with keys signalsAPI and childSignalsAPI.
 */
function runSignalSetup (instance, address, stateCallers) {
  const component = instance.component
  const signalsAPI = makeSignalsAPI(component.signalNames)
  const childSignalsAPI = makeChildSignalsAPI(instance.state)
  const reducers = patchReducersWithState(address, component,
                                          stateCallers.callReducer)
  const signals = patchSignals(address, component.signalNames,
                               stateCallers.callSignal)
  const methods = patchMethods(address, component.methods,
                               stateCallers.callMethod, reducers, signals)
  // Cannot call signalSetup any earlier because it needs a reference to
  // methods, which must know the address.
  const signalSetup = instance.component.signalSetup
  if (signalSetup !== component_defaults.signalSetup) {
    signalSetup({
      methods,
      reducers,
      signals: signalsAPI,
      childSignals: childSignalsAPI,
    })
  }
  return { signalsAPI, childSignalsAPI }
}

/**
 *
 */
function createSignals (instance, stateCallers, newAddress, upAddress, upChild) {
  // For create, apply the callbacks
  const { signalsAPI, childSignalsAPI } = runSignalSetup(instance, newAddress, stateCallers)
  const signals = mapValues(
    zipObjects([ signalsAPI, upChild ]),
    ([ callbackObj, upCallbackObj ], key) => {
      const signal = makeSignal()

      // For each callback, add each onFn to the signal,
      // and set the callFn to the signal dispatch. Only
      // on, not onEach, so execute the fn with no
      // argument.
      callbackObj._onFns.map(fn => signal.on(fn()))
      callbackObj._callFns = [ { fn: signal.call, address: null } ]

      // For the childSignalCallbacks from the parent
      if (upCallbackObj !== null) {
        upCallbackObj._onFns.map(fn => signal.on(fn(k)))
        upCallbackObj._callFns = [
          ...upCallbackObj._callFns,
          { fn: signal.call, address: upAddress }
        ]
      }

      return signal
    }
  )
  return { signals, signalsAPI, childSignalsAPI }
}

/**
 * Reduce the direct children of the tree.
 * @param {Object} node - A node in a diff tree.
 * @param {Function} fn - Function with arguments (accum, object).
 * @param {*} init - An initial value.
 * @param {Array} address - The local address.
 * @return {*}
 */
export function reduceChildren (node, fn, init, address = []) {
  if (node && node.type === NODE) {
    return fn(init, node.data, address)
  } else if (isArray(node)) {
    // Array
    return node.reduce((accum, n, k) => {
      return reduceChildren(n, fn, accum, addressWith(address, k))
    }, init)
  } else if (isObject(node)) {
    // isObject always goes after isArray
    return reduceValues(node, (accum, n, k) => {
      return reduceChildren(n, fn, accum, addressWith(address, k))
    }, init)
  } else {
    return init
  }
}

/**
 *
 */
function updateSignals (diff, instance, stateCallers, address, upAddress,
                        upChild) {
  // Check for created and destroyed children
  const { hasCreated, destroyed } = reduceChildren(
    diff.children,
    (accum, diffVal, address) => {
      const hasCreated = accum.hasCreated || diffVal === CREATE
      const destroyed = diffVal === DESTROY
        ? [ ...accum.destroyed, address ]
        : accum.destroyed
      return { hasCreated, destroyed }
    },
    { hasCreated: false, destroyed: [] }
  )

  // If there are deleted children, delete references to them
  destroyed.map(childAddress => {
    // Get the right child within childSignalsAPI
    const childSignalsAPINode = childAddress.reduce((accum, k, i) => {
      if (k in accum) {
        return accum[k]
      } else if (i === childAddress.length - 1) {
        return accum
      } else {
        throw new Error('Bad address ' + childAddress + ' for object ' +
                        instance.signalData.childSignalsAPI)
      }
    }, instance.signalData.childSignalsAPI)
    mapValues(childSignalsAPINode, obj => {
      // Remove the matching callFns
      obj._callFns = obj._callFns.filter(({ address }) => {
        return !addressEqual(address, childAddress)
      })
    })
  })
}

//---------------------------
// Component & run functions
//---------------------------

function checkInputs (options, defaults) {
  mapValues(options, (_, k) => {
    if (!(k in defaults)) {
      console.error('Unexpected argument ' + k)
    }
  })
}

function patchInitNoArg (init) {
  return (...args) => {
    if (args.length === 0) {
      return init({})
    } else if (args.length > 1 || !isObject(args[0])) {
      throw new Error('Init function can only take 1 or 0 arguments, and the ' +
                      'argument should be an object.')
    } else {
      return init(args[0])
    }
  }
}

// default attributes
const component_defaults = {
  displayName:  '',
  signalNames:  [],
  signalSetup:  null,
  init:         () => ({}),
  reducers:     {},
  methods:      {},
  willMount:    null,
  didMount:     null,
  shouldUpdate: () => true,
  willUpdate:   null,
  didUpdate:    null,
  willUnmount:  null,
  render:       null,
}

/**
 * Create a tinier component.
 * @param {Object} options - Functions defining the Tinier component.
 * @param {str} options.displayName - A name for the component.
 * @param {[str]} options.signalNames - An array of signal names.
 * @param {Function} options.signalSetup -
 * @param {Function} options.init - A function to initialize the state.
 * @param {Object} options.reducers -
 * @param {Object} options.methods -
 * @param {Function} options.willMount -
 * @param {Function} options.didMount -
 * @param {Function} options.shouldUpdate - Return true if the component should
 *                                          update, false if it should not, or
 *                                          null to use to default behavior
 *                                          (update when state changes).
 * @param {Function} options.willUpdate -
 * @param {Function} options.didUpdate -
 * @param {Function} options.willUnmount -
 * @param {Function} options.render -
 * @returns {Function} A tinier component.
 */
export function createComponent (options = {}) {
  // Check inputs
  checkInputs(options, component_defaults)

  // Create component object. A Component called as a function invokes init and
  // returns an Instance.
  const component = (...args) => ({
    type: INSTANCE,
    component: component,
    state: component.init(...args),
    binding: null,
    signalData: null,
  })
  component.type = COMPONENT
  for (let key in component_defaults) {
    component[key] = key in options ? options[key] : component_defaults[key]
  }
  return component
}

function patchReducersWithState (address, component, callReducer) {
  return mapValues(component.reducers, (reducer, reducerName) => {
    return (...args) => callReducer(args, address, reducer, reducerName,
                                    component.displayName)
  })
}

function patchSignals (address, signalNames, callSignal) {
  return fromPairs(signalNames.map(signalName => {
    return [
      signalName,
      { call: (...args) => callSignal(address, signalName, args) }
    ]
  }))
}

/**
 * Return an object of functions that call the methods with component-specific
 * arguments.
 */
export function patchMethods (address, originalMethods, callMethod, reducers,
                              signals) {
  const methods = mapValues(originalMethods, method => {
    return function (...args) {
      if (typeof Event !== 'undefined' && args[0] instanceof Event) {
        callMethod(address, method, signals, methods, reducers, this, args[0], [])
      } else {
        callMethod(address, method, signals, methods, reducers, null, null, args)
      }
    }
  })
  return methods
}

/**
 * Make the callReducer function.
 */
export function makeCallMethod (stateTree, opts) {
  return (address, method, signals, methods, reducers, target, event, args) => {
    // Get the local state
    const localState = treeGet(address, stateTree).state
    // Run the method
    const props = { state: localState, signals, methods, reducers, target, event }
    method(props, ...args)
  }
}

/**
 * Return a callSignal function.
 */
export function makeCallSignal (stateTree, opts) {
  return (address, signalName, args) => {
    if (opts.verbose) {
      console.log('Called signal ' + signalName + ' at [' + address.join(', ') + '].')
    }
    treeGet(address, stateTree).signals[signalName].call(...args)
  }
}

/**
 * Return a new callReducer function.
 * @param {Object} stateTree - The global stateTree.
 * @param {Object} stateCallers - An object with functions callMethod,
 *                                callSignal, and callReducer.
 * @param {Object} opts - Options from `run`.
 * @returns {Function} - Call a reducer on the local state
 *   @param {Array} args - Arguments to pass to reducer.
 *   @param {Array} address -
 *   @param {Function} reducer - A reducer function.
 *   @param {String} reducerName - The name of the reducer (for logging).
 *   @param {String} componentName - The name of the component (for logging).
 */
export function makeCallReducer (stateTree, stateCallers, opts) {
  return (args, address, reducer, reducerName, componentName) => {
    // Check arguments
    if (!isFunction(reducer)) {
      throw new Error('Reducer ' + reducerName + ' is not a function')
    }

    // Run the reducer, and optionally log the result
    const localState = treeGet(address, stateTree).state
    const newLocalState = reducer(localState, ...args)
    if (opts.verbose) {
      console.log('Called reducer ' + reducerName + ' for ' +
                  componentName + ' at [' + address.join(', ') + '].')
      console.log(localState)
      console.log(newLocalState)
    }

    // Set the state with immutable objects and arrays. A reference to lastState
    // will used for diffing.

    // Clone state tree, and make the changes
    const lastStateTree = { ...stateTree }
    treeSet(address, stateTree, newLocalState)

    // Calculate the diff. We have to do this for the whole tree in case
    // components have other definitions of shouldUpdate.
    const diff = diffTree(stateTree, lastStateTree, address)

    // Update components and set up signals
    updateComponents(stateTree, diff, stateCallers, opts)
  }
}

/**
 * Run Tinier.
 * @param {Object} instance - An evaluated Tinier Component, i.e. Instance. If a
 *                            Component is passed, it will be evaluate with no
 *                            arguments.
 * @param {*} appEl - An element to pass to the Component's create, update, and
 *                    destroy methods.
 * @param {Boolean} opts.verbose - If true, print messages.
 * @return {Object} The API functions, incuding getState, signals, and methods.
 */
export function run (instance, appEl, opts = {}) {
  // If a component was passed in, then evaluate.
  if (instance && instance.type === 'COMPONENT') instance = instance()
  const component = instance.component

  // Instance object will store the state for the whole application
  const stateTree = instance

  // Functions that access state
  const stateCallers = {}
  stateCallers.callReducer = makeCallReducer(stateTree, stateCallers, opts)
  stateCallers.callMethod = makeCallMethod(stateTree, opts)
  stateCallers.callSignal = makeCallSignal(stateTree, opts)

  // First draw
  const diff = diffTree(stateTree, null, [])
  updateComponents(stateTree, diff, stateCallers, opts)

  // Return API
  const state = stateTree
  const reducers = patchReducersWithState([], component, stateCallers.callReducer)
  const signals = patchSignals([], component.signalNames, stateCallers.callSignal)
  const methods = patchMethods([], component.methods, stateCallers.callMethod,
                               reducers, signals)
  return { state, reducers, methods, signals }
}

// -------------------------------------------------------------------
// DOM
// -------------------------------------------------------------------

function reverseObject (obj) {
  const newObj = {}
  for (let k in obj) {
    newObj[obj[k]] = k
  }
  return newObj
}

// some attribute renaming as seen in React
const ATTRIBUTE_RENAME = {}
const ATTRIBUTE_RENAME_REV = reverseObject(ATTRIBUTE_RENAME)
const ATTRIBUTE_APPLY = {
  checked: (el, name, val = false) => {
    if (name !== 'input') {
      throw new Error('"checked" attribute is only supported on input elements.')
    }
    el.checked = val
  },
  value: (el, name, val = false) => {
    if ([ 'input', 'textarea' ].indexOf(name) === -1) {
      throw new Error('"value" attribute is only supported on input and ' +
                      'textarea elements.')
    }
    el.value = val
  },
}

// namespace management inspired by of D3.js, Mike Bostock, BSD license
const NAMESPACES = {
  svg: 'http://www.w3.org/2000/svg',
  xhtml: 'http://www.w3.org/1999/xhtml',
  xlink: 'http://www.w3.org/1999/xlink',
  xml: 'http://www.w3.org/XML/1998/namespace',
  xmlns: 'http://www.w3.org/2000/xmlns/',
}

/**
 * Turn an array of objects into a new object of objects where the keys are
 * given by the value of `key` in each child object.
 * @param {[Object]} arr - The array of objects.
 * @param {String} key - The key to look for.
 */
function keyBy (arr, key) {
  var obj = {}
  arr.map(x => obj[x[key]] = x)
  return obj
}

/**
 * Returns true if it is a DOM element.
 * http://stackoverflow.com/questions/384286/javascript-isdom-how-do-you-check-if-a-javascript-object-is-a-dom-object
 */
function isElement (o) {
  return (o && typeof o === 'object' && o !== null &&
          o.nodeType === 1 && typeof o.nodeName === 'string')
}

/**
 * Returns true if it is a DOM text element.
 */
function isText (o) {
  return (o && typeof o === 'object' && o !== null &&
          o.nodeType === 3 && typeof o.nodeName === 'string')
}

/**
 * Create a new TinierDOM element.
 * @param {String} tagName - The name for the element.
 * @param {Object|null} attributesIn - The attributes. Note that JSX will pass
 *                                     null in when there are no attributes. In
 *                                     the resulting object, this will be an
 *                                     empty object {}.
 * @param {Object[]|Object|String} ...children - A single binding or a mix of
 *                                               elements and strings.
 * @return {Object} A TinierDOM element.
 */
export function createElement (tagName, attributesIn, ...children) {
  const attributes = attributesIn == null ? {} : attributesIn
  return { type: ELEMENT, tagName, attributes, children }
}

/**
 * Create a new TinierDOM binding.
 * @param {Array|String|Number} address - An address array, single key, or index
 * @return {Object} A TinierDOM binding
 */
export function bind (address) {
  return { type: BINDING, data: address }
}

function explicitNamespace (name) {
  const i = name.indexOf(':')
  if (i !== -1) {
    const prefix = name.slice(0, i)
    if (prefix in NAMESPACES) {
      // for xmlns or xlink, treat the whole name (e.g. xmlns:xlink) as the name
      const newName = prefix === 'xmlns' || prefix === 'xlink'
        ? name
        : name.slice(i + 1)
      return { name: newName, explicit: NAMESPACES[prefix] }
    } else {
      return { name, explicit: null }
    }
  } else {
    return { name, explicit: null }
  }
}

/**
 * Create a DOM element, inheriting namespace or choosing one based on tag.
 * @param {Object} tinierEl - A TinierDOM element.
 * @param {Object} parent - The parent el.
 * @return {Object} The DOM element.
 */
export function createDOMElement (tinierEl, parent) {
  const tag = tinierEl.tagName
  const { name, explicit } = explicitNamespace(tag)
  const ns = (explicit !== null ? explicit :
              (tag in NAMESPACES ? NAMESPACES[tag] : parent.namespaceURI))
  const el = ns === NAMESPACES.xhtml
    ? document.createElement(name)
    : document.createElementNS(ns, name)
  return updateDOMElement(el, tinierEl)
}

export function getStyles (cssText) {
  const reg = /([^:; ]+):/g
  const res = []
  let ar
  while ((ar = reg.exec(cssText)) !== null) {
    res.push(ar[1])
  }
  return res
}

function toCamelCase (name) {
  return name
  // Uppercase the first character in each group immediately following a dash
    .replace(/-(.)/g, m => m.toUpperCase())
  // Remove dashes
    .replace(/-/g, '')
}

function stripOn (name) {
  return name.slice(2).toLowerCase()
}

function setAttributeCheckBool (namespace, el, name, val) {
  // set boolean appropriately
  const valToSet = val === true ? name : val
  if (namespace === NAMESPACES.xlink || namespace === NAMESPACES.xmlns) {
    el.setAttributeNS(namespace, name, valToSet)
  } else {
    el.setAttribute(name, valToSet)
  }
}

/**
 * Update the DOM element to match a TinierDOM element.
 * @param {Element} el - An existing DOM element.
 * @param {Object} tinierEl - A TinierDOM element.
 */
export function updateDOMElement (el, tinierEl) {
  let thenFn = null
  const parentNamespace = el.namespaceURI

  // remove event listeners first, because they cannot simply be replaced
  if (el.hasOwnProperty(LISTENER_OBJECT)) {
    mapValues(el[LISTENER_OBJECT], (onFn, name) => {
      el.removeEventListener(name, onFn)
    })
    delete el[LISTENER_OBJECT]
  }

  // Update the attributes.
  // TODO is it faster to check first, or set first?
  mapValues(tinierEl.attributes, (v, k) => {
    if (k === 'id') {
      // ID is set directly
      el.id = v
    } else if (k === 'style' && !isString(v)) {
      // For a style object. For a style string, use setAttribute below.
      mapValues(v, (sv, sk) => {
        el.style.setProperty(sk, sv)
      })
    } else if (k.indexOf('on') === 0) {
      // Special handling for listeners
      if (!el.hasOwnProperty(LISTENER_OBJECT)) {
        el[LISTENER_OBJECT] = {}
      }
      // allow null
      if (v !== null) {
        const name = stripOn(k)
        if (!isFunction(v) && v !== null) {
          throw new Error(v + ' is not a function.')
        }
        el[LISTENER_OBJECT][name] = v
        el.addEventListener(name, v)
      }
    } else if (k in ATTRIBUTE_RENAME) {
      // By default, set the attribute.
      const { name, explicit } = explicitNamespace(k)
      setAttributeCheckBool(explicit !== null ? explicit : parentNamespace,
                            el, ATTRIBUTE_RENAME[explicit], v)
    } else if (k in ATTRIBUTE_APPLY) {
      ATTRIBUTE_APPLY[k](el, tinierEl.tagName, v)

    } else if (k === 'then') {
      if (v !== null) {
        if (!isFunction(v)) {
          throw new Error(v + ' is not a function or null.')
        }
        thenFn = v
      }
    } else {
      // By default, set the attribute.
      const { name, explicit } = explicitNamespace(k)
      setAttributeCheckBool(explicit !== null ? explicit : parentNamespace,
                            el, name, v)
    }
  })
  // Delete attributes if not provided. First, loop through this attributes
  // object to get a nice array.
  let attributeNames = []
  for (let i = 0, l = el.attributes.length; i < l; i++) {
    attributeNames.push(el.attributes[i].name)
  }
  attributeNames
    .filter(k => !(k in tinierEl.attributes) || tinierEl.attributes[k] === false)
    .map(k => {
      if (k in ATTRIBUTE_RENAME_REV) {
        el.removeAttribute(ATTRIBUTE_RENAME_REV[k])
      } else if (k in ATTRIBUTE_APPLY) {
        ATTRIBUTE_APPLY[k](el, tinierEl.tagName)
      } else {
        el.removeAttribute(k)
      }
    })
  // Delete styles if not provided.
  const tStyle = tinierEl.attributes.style
  if (tStyle && !isString(tStyle)) {
    getStyles(el.style.cssText)
      .filter(a => !(a in tStyle || toCamelCase(a) in tStyle))
      .map(a => el.style.removeProperty(a))
  }

  // Call the callback
  if (thenFn) {
    defer(() => thenFn(el))
  }

  return el
}

/**
 * flatten the elements array
 */
function flattenElementsAr (ar) {
  return ar.reduce((acc, el) => {
    return isArray(el) ? [ ...acc, ...el ] : [ ...acc, el ]
  }, []).filter(notNull) // null means ignore
}

function removeExtraNodes (container, length) {
  for (let i = container.childNodes.length - 1; i >= length; i--) {
    container.removeChild(container.childNodes[i])
  }
}

/**
 * Render the given element tree into the container.
 * @param {Element} container - A DOM element that will be the container for
 *                              the renedered element tree.
 * @param {...[Object|String]|Object|String} tinierElementsAr -
 *   Any number of TinierDOM elements or strings that will be rendered.
 * @return {Array} An array of bindings.
 */
export function renderRecurse (container, ...tinierElementsAr) {
  // check arguments
  if (!isElement(container)) {
    throw new Error('First argument must be a DOM Element.')
  }

  const tinierElements = flattenElementsAr(tinierElementsAr)

  // If it's just a binding, then return that. Otherwise, continue to
  // automatically create a div or g below.
  const first = get(tinierElements, 0)
  if (first && first.type === BINDING && tinierElements.length === 1) {
    return [ [ first.data, container ] ]
  }

  // get the children with IDs
  const childrenWithKeys = Array.from(container.children).filter(c => c.id)
  const elementsByID = keyBy(childrenWithKeys, 'id')

  // Render each element
  const bindings = tinierElements.map((tinierEl, i) => {
    // If an element if a binding, then there can only be one child.
    if (isUndefined(tinierEl)) {
      // Cannot be undefined
      throw new Error('Children in Tinier Elements cannot be undefined.')
    } else if (tinierEl && tinierEl.type === ELEMENT) {
      // container.childNodes is a live collection, so get the current node at
      // this index.
      const el = container.childNodes[i]
      // tinierEl is a TinierDOM element.
      if (tinierEl.attributes.id in elementsByID) {
        // If el exist, then check for a matching node by ID
        const movedEl = elementsByID[tinierEl.attributes.id]
        if (el) {
          // If match and existing el, then replace the element
          container.replaceChild(movedEl, el)
        } else {
          // If match and el is undefined, then append the element
          container.appendChild(movedEl)
        }
        // Then render children
        return renderRecurse(movedEl, ...tinierEl.children)
      } else if (el) {
        // Both defined, check type and id
        if (el.tagName
            && el.tagName.toLowerCase() === tinierEl.tagName.toLowerCase()) {
          // Matching tag, then update the node to match. Be aware that existing
          // nodes with IDs might get moved, so we should clone them?
          const elToUpdate = el.id ? el.cloneNode(true) : el
          updateDOMElement(elToUpdate, tinierEl)
          if (el.id) container.replaceChild(elToUpdate, el)
          return renderRecurse(elToUpdate, ...tinierEl.children)
        } else {
          // not a matching tag, then replace the element with a new one
          const newEl = createDOMElement(tinierEl, container)
          container.replaceChild(newEl, el)
          return renderRecurse(newEl, ...tinierEl.children)
        }
      } else {
        // no el and no ID match, then add a new Element or string node
        const newEl2 = createDOMElement(tinierEl, container)
        container.appendChild(newEl2)
        return renderRecurse(newEl2, ...tinierEl.children)
      }
    } else if (tinierEl && tinierEl.type === BINDING) {
      // Automatically add a div or g for raw bindings
      const isSvg = container.namespaceURI === NAMESPACES.svg
      const newEl = createDOMElement(createElement(isSvg ? 'g' : 'div'),
                                     container)
      container.appendChild(newEl)
      return renderRecurse(newEl, tinierEl)
    } else {
      const el = container.childNodes[i]
      const s = String(tinierEl)
      // This should be a text node.
      if (isText(el)) {
        // If already a text node, then set the text content.
        el.textContent = s
      } else if (el) {
        // If not a text node, then replace it.
        container.replaceChild(document.createTextNode(s), el)
      } else {
        // If no existing node, then add a new one.
        container.appendChild(document.createTextNode(s))
      }
      // No binding here. TODO test for this case
      return null
    }
  }).reduce((acc, val) => [ ...acc, ...val ], [])

  // remove extra nodes
  // TODO This should not run if the child is a binding. Make a test for
  // this. When else should it not run?
  removeExtraNodes(container, tinierElements.length)

  return bindings.filter(x => x !== null)
}

/**
 * Render the given element tree into the container.
 * @param {Element} container - A DOM element that will be the container for
 *                              the renedered element tree.
 * @param {...[Object|String]|Object|String} tinierElementsAr -
 *   Any number of TinierDOM elements or strings that will be rendered.
 * @return {Object} A bindings object.
 */
export function renderDOM (container, ...tinierElementsAr) {
  const bindingsAr = renderRecurse(container, ...tinierElementsAr)
  return { type: BINDINGS, data: bindingsAr }
}

// Export API
export default { createComponent, run, bind, createElement, renderDOM }
