/** tinier */

'use strict';

import mapValues from 'lodash.mapvalues';
import isPlainObject from 'lodash.isplainobject';
import compose from 'lodash.flowright';
import zip from 'lodash.zip';
import { createStore } from 'redux';
import { zipFillNull } from './utils';

const ARRAY_OF = 'ARRAY_OF';
const OBJECT_OF = 'OBJECT_OF';

const isObjectOf = content => Array.isArray(content) && content[0] === OBJECT_OF;
const isArrayOf  = content => Array.isArray(content) && content[0] === ARRAY_OF;
const isView     = content => (content !== undefined &&
                               content !== null &&
                               content.hasOwnProperty('isView') &&
                               content.isView === true);

function mapState (state, content, fn) {
  /** mapState - Return the state after recursively evaluating the callback
     function.

     state: The current state.

     content: The content corresponding to this state.

     fn: The callback with arguments: (instance, localState)

   */

  if (Array.isArray(state)) {
    // state [ 'a', 'b' ]  content [ARRAY_OF, Subtask]
    // state [ ... ]       content Task
    if (isObjectOf(content)) {
      // mismatch
      throw Error('Content shape does not match state shape: ' + content +
                  ' <-> Array ' + state);
    } else if (isView(content)) {
      return fn(content, s);
    } else if (isArrayOf(content)) {
      // Array with view.
      return state.map(s => fn(content[1], s));
    } else {
      // Ordinary array.
      return zipFillNull(state, content).map((s, c) => mapState(s, c, fn));
    }
  } else if (isPlainObject(state)) {
    // state { 'id1': {}, 'id2': 'x' }  content [OBJECT_OF, Todo]
    // state { ... }                    content Task
    if (isArrayOf(content)) {
      // mismatch
      throw Error('Content shape does not match state shape: ' + content +
                  ' <-> Object ' + state);
    } else if (isView(content)) {
      return fn(content, s);
    } else if (isObjectOf(content)) {
      // Object with view.
      return mapValues(state, s => fn(content[1], s));
    } else {
      // Ordinary object
      const out = {};
      Object.keys(state).map(k => {
        const contentValue = typeof content[k] === 'undefined' ? null : content[k];
        out[k] = mapState(state[k], contentValue, fn);
      });
      return out;
    }
  } else {
    return state;
  }
}

function combineReducers (reducer, content) {
  return (state, action) => {
    const newState = reducer(state, action);
    const oldState = newState === state ? null : state;
    return mapState(newState, content, (instance, localState) => {
      return instance.combinedReducer(localState, action);
    });
  };
}

function walkContent (content, fn, data) {
  // TODO can reduceContent call this general function?
}

function checkBindings (parentBindings, bindKey, state) {
  const bindings = parentBindings[bindKey];
  // TODO compare bindings to state
  return bindings;
}

function reduceContent (content, fn, value) {
  if (content[0] === OBJECT_OF || content[0] === ARRAY_OF || content.isView) {
    // state { 'id1': {}, 'id2': 'x' }  content [OBJECT_OF, Todo]
    // state [ 'a', 'b' ]  content [ARRAY_OF, Subtask]
    const instance = content.isView ? content : content[1];
    return reduceContent(instance.content, fn, fn(value, instance));
  } else if (Array.isArray(content)) {
    // state [ 'a', { ... } ]  content [ null, { ... } ]
    return content.reduce((v, c) => reduceContent(c, fn, v), value);
  } else if (isPlainObject(content)) {
    // state { nested: { ... }, other: 'stuff' }  content { nested: { ... } }
    return Object.keys(content).reduce((v, k) => reduceContent(content[k], fn, v), value);
  } else {
    // state { other: 'stuff' }  content null
    return value;
  }
}

function collectActionCreators (initialActionCreators, content) {
  return reduceContent(content, (actionCreators, instance) => {
    return {...actionCreators, ...instance.actionCreators};
  }, initialActionCreators);
}

function applyDiffToContent (newState, oldState, content) {
  /** Diff newState and oldState, and where differences exist, update the needsCreate
     and needsDestroy labels in the view in the content. */
  // TODO write this in terms of walkContent
}

function withDispatch (actionCreators, dispatch) {
  /** Apply the dispatch function through function composition with the action
     creators. */
  return mapValues(actionCreators, actionCreator => {
    return compose(dispatch, actionCreator);
  });
}

export function createClass ({ reducer, actionCreators, create, update, destroy }) {
  return (bindKey, content = {}) => {
    const combinedReducer = combineReducers(reducer, content);
    return {
      run: (appEl, hot_state = null, createStore = createStore) => {
        // Use new variables for app state
        let appNeedsUpdate = true;
        // Modify the top-level reducer to calculate the state diff and update
        // the view instances with details.
        const combinedReducerWithDiff = (state, action) => {
          const newState = combinedReducer(state, action);
          appNeedsUpdate = newState !== state;
          const oldState = appNeedsUpdate ? state : null;
          applyDiffToContent(newState, oldState, content);
          return newState;
        }
        // Create the store
        const store = createStore(combinedReducerWithDiff, hot_state);
        // Collect the action creators and apply dispatch
        const actions = withDispatch(collectActionCreators(actionCreators, content),
                                     store.dispatch);
        // Subscribe to changes
        const walkFn = (instance, localState, { appState, parentBindings }) => {
          const bindings = checkBindings(parentBindings, instance.bindKey, localState);
          /* const needsCreateArray, needsUpdateArray, needsDestroyArray; //TODO */
          for (let [ binding, indState, needsCreate, needsUpdate, needsDestroy ] in zip(bindings, localState, needsCreateArray, needsUpdateArray, needsDestroyArray)) {
            if (needsCreate) {
              instance.create(indState, appState, binding, actions);
            }
            if (needsUpdate) {
              const newBindings = instance.update(indState, appState, binding, actions);
              walkContent(instance.content, indState, { appState, parentBindings: newBindings }, walkFn);
            }
            if (needsDestroy) {
              instance.destroy(indState, appState, binding, actions);
              // always walkContent ?
            }
          }
        };
        const appUpdate = () => {
          /** Update function calls walkContent and walkFn recursively to find
             nodes that need updates and update them. */
          const appState = store.getState();
          if (appNeedsUpdate) {
            const parentBindings = update(appState, appState, appEl, actions);
            walkContent(content, appState, { appState, parentBindings }, walkFn);
          }
        };
        store.subscribe(appUpdate);

        // first update
        const state = store.getState();
        create(state, state, appEl, actions);
        appUpdate();

        // return actions as API
        return actions;
      },
      combinedReducer,
      actionCreators,
      content,
      bindKey,
      isView: true,
      needsCreate: true,
      needsUpdate: true,
      needsDestroy: false
    };
  };
}

export function createReducer(initialState, handlers) {
  return function reducer(localState = initialState, action) {
    if (handlers.hasOwnProperty(action.type)) {
      return handlers[action.type](localState, action);
    } else {
      return localState;
    }
  };
}

export function objectOf(cls) {
  return [OBJECT_OF, cls];
}

export function arrayOf(cls) {
  return [ARRAY_OF, cls];
}
