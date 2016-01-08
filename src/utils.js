'use strict';

export function zipFillNull() {
    var args = [].slice.call(arguments);
    var longest = args.reduce((a, b) => a.length > b.length ? a : b, []);
    return longest.map(function(_,i){
        return args.map(function(array){return array[i]});
    });
}
