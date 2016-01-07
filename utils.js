'use strict';

export function new_id(obj) {
    /** Return a key by incrementing the largest integer key in the object. */
    return Math.max.apply(null, Object.keys(obj).map(x => parseInt(x))) + 1;
}

export function to_array(obj) {
    /** Convert object of objects to array of objects, and add original keys
     with the 'id' attribute in the inner objects. */
    return Object.keys(obj).map(key => Object.assign({}, obj[key], { id: key }));
};
