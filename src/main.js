/** tinier */

'use strict'

import mapValues from 'lodash.mapvalues'
import isPlainObject from 'lodash.isplainobject'
import compose from 'lodash.flowright'
import zip from 'lodash.zip'
import get from 'lodash.get'
import { createStore } from 'redux'
import { zipFillNull } from './utils'

const UPDATE_STATE = 'updateState'

const ARRAY_OF = 'ARRAY_OF'
const OBJECT_OF = 'OBJECT_OF'

const isObjectOf = content => Array.isArray(content) && content[0] === OBJECT_OF
const isArrayOf  = content => Array.isArray(content) && content[0] === ARRAY_OF
const isView     = content => (content !== undefined &&
                               content !== null &&
                               content.hasOwnProperty('isView') &&
                               content.isView === true)

// 1. Reduce state by mapping over state tree

function mapState (state, content, fn) {
  /** Return the state after calling fn for each view in content. This is
     usually a mutually recursive function with fn.

     state: The current state.

     content: The content corresponding to this state.

     fn: The callback with arguments: (view, localState, key)

   */

  if (Array.isArray(state)) {
    // state [ 'a', 'b' ]  content [ARRAY_OF, Subtask]
    // state [ ... ]       content Task
    if (isObjectOf(content)) {
      // mismatch
      throw Error('Content shape does not match state shape: ' + content +
                  ' <-> Array ' + state)
    } else if (isView(content)) {
      return fn(content, state, null)
    } else if (isArrayOf(content)) {
      // Array with view.
      return state.map((s, i) => fn(content[1], s, i))
    } else if (Array.isArray(content)) {
      // content array.
      return zipFillNull(state, content).map((s, c) => mapState(s, c, fn))
    } else {
      // no content
      return state
    }
  } else if (isPlainObject(state)) {
    // state { 'id1': {}, 'id2': 'x' }  content [OBJECT_OF, Todo]
    // state { ... }                    content Task
    if (isArrayOf(content)) {
      // mismatch
      throw Error('Content shape does not match state shape: ' + content +
                  ' <-> Object ' + state)
    } else if (isView(content)) {
      return fn(content, state, null)
    } else if (isObjectOf(content)) {
      // Object with view.
      return mapValues(state, (s, k) => fn(content[1], s, k))
    } else if (isPlainObject(content)) {
      // Ordinary object
      const out = {}
      Object.keys(state).map(k => {
        const contentValue = typeof content[k] === 'undefined' ? null : content[k]
        out[k] = mapState(state[k], contentValue, fn)
      })
      return out
    } else {
      return state
    }
  } else {
    return state
  }
}

function combineReducers (reducer, content) {
  /** combineReducers

   reducer: The current reducer.

   content: The view content.

   */

  return (state, action) => {
    const newState = reducer(state, action)
    const oldState = newState === state ? null : state
    return mapState(newState, content, (view, localState, key) => {
      // Mutually recursive: view.combinedReducer will call mapState again.
      if ('key' in action && action.key !== key)
        return localState
      else
        return view.combinedReducer(localState, action, key)
    })
  }
}

// 2. Collect actionCreators by walking content

function reduceContent (content, fn, value) {
  /** Recursive function that reduces the value with fn by walking through
     content.

   */
  if (content[0] === OBJECT_OF || content[0] === ARRAY_OF || content.isView) {
    // state { 'id1': {}, 'id2': 'x' }  content [OBJECT_OF, Todo]
    // state [ 'a', 'b' ]  content [ARRAY_OF, Subtask]
    const view = content.isView ? content : content[1]
    return reduceContent(view.content, fn, fn(value, view))
  } else if (Array.isArray(content)) {
    // state [ 'a', { ... } ]  content [ null, { ... } ]
    return content.reduce((v, c) => reduceContent(c, fn, v), value)
  } else if (isPlainObject(content)) {
    // state { nested: { ... }, other: 'stuff' }  content { nested: { ... } }
    return Object.keys(content).reduce((v, k) => reduceContent(content[k], fn, v), value)
  } else {
    // state { other: 'stuff' }  content null
    return value
  }
}

function collectActionCreators (initialActionCreators, content) {
  /** collectActionCreators

   initialActionCreators: An object with the action creators for the view.

   content: The view content to walk through and collect action creators.

   */
  return reduceContent(content, (actionCreators, view) => {
    return Object.assign({}, actionCreators, view.actionCreators)
  }, initialActionCreators)
}

// 3. Diff state by walking content

function walkContentAndDiff (content, newState, oldState) {
  if (content[0] === OBJECT_OF) {
    const view = content[1]
    const isValid = (obj, k) => isPlainObject(obj) && k in obj && obj[k] !== null
    const l = Object.assign({}, newState || {}, oldState || {})
    view.needsCreate  = mapValues(l, (_, k) =>  isValid(newState, k) &&  !isValid(oldState, k))
    view.needsUpdate  = mapValues(l, (_, k) =>  isValid(newState, k) && (!isValid(oldState, k) || newState[k] !== oldState[k]))
    view.needsDestroy = mapValues(l, (_, k) => !isValid(newState, k) &&   isValid(oldState, k))
    mapValues(l, (_, k) => walkContentAndDiff(view.content, get(newState, k, null), get(oldState, k, null)))
  } else if (content[0] === ARRAY_OF) {
    const view = content[1]
    const isValid = (obj, i) => Array.isArray(obj) && i < obj.length && obj[i] !== null
    const longest = Math.max(Array.isArray(newState) ? newState.length : 0,
                             Array.isArray(oldState) ? oldState.length : 0)
    const l = Array.apply(null, { length: longest })
    view.needsCreate  = l.map((_, i) =>  isValid(newState, i) &&  !isValid(oldState, i))
    view.needsUpdate  = l.map((_, i) =>  isValid(newState, i) && (!isValid(oldState, i) || newState[i] !== oldState[i]))
    view.needsDestroy = l.map((_, i) => !isValid(newState, i) &&   isValid(oldState, i))
    l.map((_, i) => walkContentAndDiff(view.content, get(newState, i, null), get(oldState, i, null)))
  } else if (content.isView) {
    const view = content
    const isValid = obj => obj !== null
    view.needsCreate  =  isValid(newState) &&  !isValid(oldState)
    view.needsUpdate  =  isValid(newState) && (!isValid(oldState) || newState !== oldState)
    view.needsDestroy = !isValid(newState) &&   isValid(oldState)
    walkContentAndDiff(view.content, newState || null, oldState || null)
  } else if (Array.isArray(content)) {
    content.map(       (v, i) => walkContentAndDiff(v, get(newState, i, null), get(oldState, i, null)))
  } else if (isPlainObject(content)) {
    mapValues(content, (v, k) => walkContentAndDiff(v, get(newState, k, null), get(oldState, k, null)))
  }
}

function applyDiffToContent (content, newState, oldState) {
  /** Walk content and diff newState and oldState. Where differences exist,
   update the needsCreate, needsUpdate, and needsDestroy labels in the view in
   the content. */
  // TODO rewrite this to return the needs* functions and keep the whole concept
  // functionally pure. This will probably require making run() a top-level
  // function (and will also let us this hack).
  // TODO
  walkContentAndDiff(content, newState, oldState)
}

// 4. Update views by walking content

function updateEl (view, binding, state, data, key,
                   needsCreate, needsUpdate, needsDestroy) {
  /** Mutually recursive with walkContentAndUpdate */
  const { appState, parentBindings, actions } = data
  if (needsCreate)
    view.create(state, appState, binding, actions, key)
  if (needsUpdate) {
    const newBindings = view.update(state, appState, binding, actions, key)
    walkContentAndUpdate(view.content, state,
                         Object.assign({}, data, { parentBindings: newBindings }))
  }
  if (needsDestroy)
    view.destroy(state, appState, binding, actions, key)
}

function walkContentAndUpdate (content, state, data) {
  /** Mutually recursive with updateEl */
  if (content[0] === OBJECT_OF) {
    const view = content[1]
    const bindings = checkBindings(data.parentBindings, view.bindKey, state)
    // needs* might have more keys than bindings and state
    mapValues(view.needsUpdate, (_, k) => {
      return updateEl(view, get(bindings, k, null), get(state, k, null), data, k,
                      view.needsCreate[k], view.needsUpdate[k], view.needsDestroy[k])
    })
  } else if (content[0] === ARRAY_OF) {
    const view = content[1]
    const bindings = checkBindings(data.parentBindings, view.bindKey, state)
    // needs* might be longer than bindings and state
    view.needsUpdate.map((_, i) => {
      return updateEl(view, get(bindings, i, null), get(state, i, null), data, i,
                      view.needsCreate[i], view.needsUpdate[i], view.needsDestroy[i])
    })
  } else if (content.isView) {
    const view = content
    const binding = checkBindings(data.parentBindings, view.bindKey, state)
    updateEl(view, binding, state, data, null,
             view.needsCreate, view.needsUpdate, view.needsDestroy)
  } else if (Array.isArray(content)) {
    content.map(       (v, i) => walkContentAndUpdate(v, get(state, i, null), data))
  } else if (isPlainObject(content)) {
    mapValues(content, (v, k) => walkContentAndUpdate(v, get(state, k, null), data))
  }
}

function updateContent (content, state, data) {
  /** updateContent -  */
  walkContentAndUpdate(content, state, data);
}

function checkBindings (parentBindings, bindKey, state) {
  const bindings = parentBindings[bindKey]
  if (typeof bindings === 'undefined') {
    throw Error('No bindings for key "' + bindKey + '"')
  } else if (Array.isArray(state)) {
    if (!Array.isArray(bindings))
      throw Error('Bindings for key "' + bindKey + '" are not an array: ' +
                  bindings)
    if (bindings.length !== state.length)
      throw Error('Bindings for key "' + bindKey + '" have length ' +
                  bindings.length + ' but state array has length ' +
                  state.length)
  } else if (isPlainObject(state) && isPlainObject(bindings)) {
    const missingKeys = Object.keys(state).filter(k => !(k in bindings))
    if (missingKeys.length > 0)
      throw Error('Bindings for key "' + bindKey + '" are missing keys ' +
                  missingKeys)
  }
  return bindings
}

function withDispatchAndKeyCheck (actionCreators, dispatch) {
  /** Apply the dispatch function through function composition with the action
   creators.

   actionCreators: An object where values are action creators.

   dispatch: A dispatch function.

   */
  // TODO how can these return values as API functions
  return mapValues(actionCreators,
                   actionCreator => compose(dispatch, actionCreator))
}

const defaultReducer = state => state
const emptyFunction = () => undefined

export function createClass ({ reducer        = defaultReducer,
                               actionCreators = {},
                               create         = emptyFunction,
                               update         = emptyFunction,
                               destroy        = emptyFunction }) {
  return (bindKey, content = {}) => {
    // TODO move this call into run() at ** so combineReducers only needs to be
    // called once and mapState can be an ordinary recursive function (not
    // mutually recursive). This might help simplify the walk/map/reduce tree
    // functions.
    const combinedReducer = combineReducers(reducer, content)
    return {
      run: (appEl, hot_state = null, createStore = createStore) => {
        // Use new variables for app state
        let appNeedsUpdate = true
        // Modify the top-level reducer to calculate the state diff and update
        // the view views with details.
        const combinedReducerWithDiff = (state, action) => { // **
          // TODO better solution
          const newState = (action.type === UPDATE_STATE) ? action.state : combinedReducer(state, action)
          applyDiffToContent(content, newState, state)
          return newState
        }
        // Create the store
        const store = createStore(combinedReducerWithDiff)
        // add an action for state update (TODO better solution)
        const stateUpdateCreator = state => ({ type: UPDATE_STATE, state })
        // Collect the action creators and apply dispatch
        const actions = withDispatchAndKeyCheck(
          collectActionCreators(
            Object.assign({}, actionCreators, { [UPDATE_STATE]: stateUpdateCreator }),
            content
          ),
          store.dispatch
        )
        // Subscribe to changes
        const appUpdate = () => {
          /** Update function calls walkContent and walkFn recursively to find
             nodes that need updates and update them. */
          const appState = store.getState()
          if (appNeedsUpdate) {
            const parentBindings = update(appState, appState, appEl, actions, null)
            updateContent(content, appState, { appState, parentBindings, actions })
          }
        }
        store.subscribe(appUpdate)

        // first update
        const state = store.getState()
        create(state, state, appEl, actions, null)
        appUpdate()

        // apply a state
        if (hot_state)
          actions[UPDATE_STATE](hot_state)

        // return actions as API
        return actions
      },
      combinedReducer,
      actionCreators,
      content,
      create,
      update,
      destroy,
      // TODO make bindKey optional if the shape of the bindings object is the
      // same as the shape of the parent content object.
      // TODO allow a function for bindKey.
      bindKey,
      isView: true,
      needsCreate: true,
      needsUpdate: true,
      needsDestroy: false
    }
  }
}

export function createReducer(initialState, handlers) {
  return function reducer(state = initialState, action, key) {
    if (handlers.hasOwnProperty(action.type)) {
      return handlers[action.type](state, action, key)
    } else {
      return state
    }
  }
}

export function basicActionCreators(types) {
  /** Create very simple action creators from a list of type strings.

   Each action will accept a payload argument, and actions will have the form:

   { type: 'MY_TYPE', payload: ['my', 'payload'] }

    */
  const actionCreators = {}
  types.map(type => {
    actionCreators[type] = payload => ({ type, payload })
  })
  return actionCreators
}

export function objectOf(cls) {
  return [OBJECT_OF, cls]
}

export function arrayOf(cls) {
  return [ARRAY_OF, cls]
}

// Actions form the API for the top-level object. TODO this about managing
// hidden methods ('_getState') and namespaced methods ('todos.addTodo')
