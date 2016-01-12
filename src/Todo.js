'use strict'

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
      return { type: MARK_COMPLETED, completed: data.completed, key: data.key }
    }
  },
  create: (localState, appState, el) => {
    const sel = d3.select(el)
    sel.append('span').attr('class', 'check')
    sel.append('span').attr('class', 'text')
    sel.append('div').attr('class', 'subtasks')
  },
  update: (localState, appState, el, actions, key) => {
    // TODO instead of passing in a key to be added below, pass in a function
    // call localAction to be called on the action,
    // e.g. localAction(actions[MY_ACTION])({ data })
    const sel = d3.select(el)
    sel.on('click', () => {
      actions[MARK_COMPLETED]({ completed: !localState.completed, key: key })
    })
    sel.select('.check').text(localState.completed ? '✓' : '✗')
    sel.select('.text').text(localState.text)
    const subtask_sel = sel.select('.subtasks')
    // bind data
    const sels = subtask_sel.selectAll('.subtask')
                            .data(localState.subtasks)
    // on enter append divs
    sels.enter().append('div').attr('class', 'subtask')
    sels.exit().remove()
    const bindings = []
    sels.each(function() { bindings.push(this) })
    return {
      subtasks: bindings
    }
  },
  destroy: (localState, appState, el) => {
    el.selectAll('.check,.text.subtasks').remove()
  }
})
