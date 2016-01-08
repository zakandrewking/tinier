'use strict';

import * as d3 from 'd3';
import { createClass, createReducer } from './tinier';
import { ADD_TODO } from './actionTypes';
import { toArray, newId } from './utils';
import { empty_todo } from './Todo';

function newId(obj) {
    /** Return a key by incrementing the largest integer key in the object. */
    // map(parseInt) does not work
    return Math.max.apply(null, Object.keys(obj).map(x => parseInt(x))) + 1;
}

function toArray(obj) {
    /** Convert object of objects to array of objects, and add original keys
       with the 'id' attribute in the inner objects. */
    return Object.keys(obj).map(key => ({...obj[key], id: key }));
};

export const empty_todo_list = { todos: [] };

export const TodoList = createClass({
    reducer: createReducer(empty_todo_list, {
        [ADD_TODO]: (state, action) => {
            return {
                ...state,
                todos: {
                    ...state.todos,
                    [newId(state.todos)]: {...empty_todo, text: action.text }
                }
            };
        }
    }),
    create: (localState, appState, el) => {
        const sel = d3.select(el);
        // add title
        sel.append('span').text('Todos');
        sel.append('div').attr('id', 'todos');
        sel.append('div').attr('id', 'add-button');
    },
    update: (localState, appState, el) => {
        const sel = d3.select(el);
        const todos_sel = sel.select('#todos');
        // bind data
        const sels = todos_sel.selectAll('.todo')
                              .data(toArray(localState.todos), d => d.id);
        // object of todo containers
        const todo_containers = {};
        sels.each(function(d) { todo_containers[d.id] = this.node });
        // on enter append divs
        sels.enter().append('div').attr('class', 'todo');
        // return containers for children
        return {
            todos: todo_containers,
            addButton: sel.select('#add-button').node
        };
    }
});
