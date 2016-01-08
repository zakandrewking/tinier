'use strict';

import * as d3 from 'd3';
import { createClass, createReducer } from './red3';
import { ADD_TODO } from './actionTypes';
import { toArray, newId } from './utils';
import { empty_todo } from './Todo';

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
        // return bindings
        return {
            'todos': sel.append('div').attr('id', 'todos').node, 
            'addButton': sel.append('div').attr('id', 'add-button').node
        }
    },
    update: (localState, appState, el) => {
        const todos_sel = d3.select(el).select('#todos');
        // bind data
        const sels = todos_sel.selectAll('.todo')
                              .data(toArray(localState.todos), d => d.id);
        // on enter append divs
        sels.enter().append('div').attr('class', 'todo');
        // return containers for children
        return { todos: sels.each(function() { return this.node }) };
    }
});
