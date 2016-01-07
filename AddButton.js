import * as d3 from 'd3';
import { createClass, createReducer } from './red3';

const AddButton = createClass({
    reducer: createReducer({ text: '+' }, {})
});
