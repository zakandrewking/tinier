/** tinier */

'use strict';

import mapValues from 'lodash.mapvalues';
import isPlainObject from 'lodash.isplainobject';
import { createStore } from 'redux';
import { zipFillNull } from './utils';

const ARRAY_OF = 'ARRAY_OF';
const OBJECT_OF = 'OBJECT_OF';

function walkContent(state, oldState, content, data, fn) {
    /** walkContent

       Arguments
       ---------

       state:

       oldState: If null, then strip all the __fresh and __outdated tags.
       
       content:

       data: An object that will be maintained in all recursive call.

       fn: The callback with arguments: (instance, localState, data, fresh, outdated)

     */

    // TODO mark _fresh and _outdated 

    if (content[0] === OBJECT_OF) {
        // state { 'id1': {}, 'id2': 'x' }  content [OBJECT_OF, Todo]
        /* for (let id in state) {
           if  */
        return mapValues(state, s => fn(content[1], s, data));
    }
    else if (content[0] === ARRAY_OF) {
        // state [ 'a', 'b' ]  content [ARRAY_OF, Subtask]
        return state.map(s => fn(content[1], s, data));
    }
    else if (content.isView) {
        // state { ... }  content Task
        const instance = content;
        instance.fresh    = state !== null && state !== oldState; 
        instance.outdated = state === null && state !== oldState; 
        return fn(content, state, data);
    }
    else if (Array.isArray(content)) {
        // state [ 'a', { ... } ]  content [ null, { ... } ]
        return zipFillNull(state, oldState, content).map((s, o, c) => {
            return walkContent(s, o, c, data, fn);
        });
    }
    else if (isPlainObject(content)) {
        // state { nested: { ... }, other: 'stuff' }  content { nested: { ... } }
        var keys = Object.keys(content);
        if (isPlainObject(state))    keys = keys.concat(Object.keys(state));
        if (isPlainObject(oldState)) keys = keys.concat(Object.keys(oldState));
        keys.map(key => {
            const contentVal  = content[key]  || null;
            const stateVal    = state[key]    || null;
            const oldStateVal = oldState[key] || null;
            if (contentVal !== null)
                return walkContent(stateVal, oldStateVal, contentVal, data, fn);
            else
                return s;
        });
    }
    else {
        // state { other: 'stuff' }  content null
        return state;
    }
}

function combineReducers(reducer, content) {
    return (state, action) => {
        const newState = reducer(state, action);
        const oldState = newState === state ? null : state;
        return walkContent(newState, oldState, content, null, (instance, localState) => {
            return instance.combinedReducer(localState, action);
        });
    };
}

function reduceContent(content, fn, value) {
    if (content[0] === OBJECT_OF || content[0] === ARRAY_OF || content.isView) {
        // state { 'id1': {}, 'id2': 'x' }  content [OBJECT_OF, Todo]
        // state [ 'a', 'b' ]  content [ARRAY_OF, Subtask]
        const instance = content.isView ? content : content[1];
        return reduceContent(instance.content, fn, fn(value, instance));
    }
    else if (Array.isArray(content)) {
        // state [ 'a', { ... } ]  content [ null, { ... } ]
        return content.reduce((v, c) => reduceContent(c, fn, v), value);
    }
    else if (isPlainObject(content)) {
        // state { nested: { ... }, other: 'stuff' }  content { nested: { ... } }
        return Object.keys(content).reduce((v, k) => reduceContent(content[k], fn, v), value);
    }
    else {
        // state { other: 'stuff' }  content null
        return value;
    }
}

function collectActionCreators(initialActionCreators, content) {
    return reduceContent(content, (actionCreators, instance) => {
        return {...actionCreators, ...instance.actionCreators};
    }, initialActionCreators);
}

function withDispatch(actionCreators, dispatch) {
    return mapValues(actionCreators, actionCreator => {
        return data => dispatch(actionCreator(data));
    });
}

export function createClass({ reducer, actionCreators, create, update, destroy }) {
    return (bindKey, content = {}) => {
        const combinedReducer = combineReducers(reducer, content);
        return {
            run: (el, hot_state = null, createStore = createStore) => {
                const store = createStore(combinedReducer, hot_state);
                const actions = withDispatch(collectActionCreators(actionCreators, content),
                                             store.dispatch);
                const walkFn = (instance, localState, parentBindings) => {
                    /* check_bindings(parentBindings, instance.bindKey, localState); */
                    /* TODO loop here? */
                    if (localState.__fresh) {
                        instance.create(localState, state, parentBindings[instance.bindKey],
                                        actions);
                    }
                    if (!localState.__outdated) {
                        const newBindings = instance.update(localState, state,
                                                            parentBindings[instance.bindKey],
                                                            actions);
                        walkContent(localState, null, instance.content, newBindings, walkFn);
                    }
                    if (localState.__outdated) {
                        instance.destroy(localState, state, parentBindings[instance.bindKey],
                                         actions);
                    }
                };
                const appUpdate = () => {
                    const state = store.getState();
                    const bindings = update(state, state, el, actions);
                    walkContent(state, null, content, bindings, walkFn);
                };
                store.subscribe(appUpdate);
                appUpdate();

                return actions;
            },
            combinedReducer,
            actionCreators,
            content,
            bindKey,
            isView: true
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
