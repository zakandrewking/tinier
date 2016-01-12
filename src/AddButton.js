import * as d3 from 'd3';
import { createClass, createReducer } from './tinier';
import { ADD_TODO } from './actionTypes';

export const emptyAddButton = {};

export const AddButton = createClass({
  create: (localState, appState, el, actions) => {
    d3.select(el).append('span').text('+')
      .on('click', actions[ADD_TODO]);
  }
});
