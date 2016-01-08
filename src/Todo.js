'use strict';

import * as d3 from 'd3'
import { createClass, createReducer } from './tinier'
import { CHANGE_TASK_TEXT, MARK_COMPLETED, ADD_SUBTASK } from './actionTypes'

export const empty_todo = {
    text: '',
    completed: false,
    subtasks: []
}

export const Todo = createClass({
    reducer: createReducer(empty_todo, {
        [CHANGE_TASK_TEXT]: (state, action) => {
            return {...state, text: action.text}
        },
        [MARK_COMPLETED]: (state, action) => {
            return {...state, completed: action.completed}
        },
        [ADD_SUBTASK]: (state, action) => {
            return {...state, subtasks: [...state.subtasks, action.text]}
        },
    }),
    actionCreators: {
        [MARK_COMPLETED]: data => {
            return { type: MARK_COMPLETED, completed: data.completed }
        }
    },
    create: (localState, appState, el, actions) => {
        const sel = d3.select(el)
        sel.on('click', () => {
            actions[MARK_COMPLETED]({ completed: !state.completed })
        })
        sel.append('span').attr('class', 'check')
        sel.append('span').attr('class', 'text')
    },
    update: (localState, appState, el) => {
        const sel = d3.select(el);
        sel.select('.check').text(state.completed ? '✓' : '✗');
        sel.select('.text').text(state.text);
        const subtask_sel = sel.select('.subtasks');
        // bind data
        const sels = subtask_sel.selectAll('.subtask')
                                .data(localState.subtasks);
        return {
            subtasks: sels.each(function() { return this.node; })
        };
    }
})
