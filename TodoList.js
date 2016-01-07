import * as d3 from 'd3';
import { createClass, createReducer } from './red3';
import ADD_TODO from './actionTypes';
import { to_array, new_id } from './utils';

export const TodoList = createClass({
    reducer: createReducer({}, {
        ADD_TODO: (state, action) => {
            return Object.assign({}, state, {
                todos: Object.assign({}, state.todos, {
                    [new_id(state.todos)]: { text: action.text, completed: false }
                })
            });
        }
    }),
    create: (state, el) => {
        const sel = d3.select(el);
        // add title
        sel.append('span').text('Todos');
        sel.append('div').attr('id', 'todos');
    },
    update: (state, el) => {
        const todos_sel = d3.select(el).select('#todos');
        // bind data
        const sels = todos_sel.selectAll('.todo')
                  .data(to_array(state.todos), d => d.id);
        // on enter append divs
        sels.enter().append('div').attr('class', 'todo');
        // return containers for children
        return { todos: sels.each(function() { return this.node; }) };
    }
});
