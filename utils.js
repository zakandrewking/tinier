'use strict';

export function newId(obj) {
    /** Return a key by incrementing the largest integer key in the object. */
    // map(parseInt) does not work
    return Math.max.apply(null, Object.keys(obj).map(x => parseInt(x))) + 1;
}

export function toArray(obj) {
    /** Convert object of objects to array of objects, and add original keys
     with the 'id' attribute in the inner objects. */
    return Object.keys(obj).map(key => ({...obj[key], id: key }));
};
