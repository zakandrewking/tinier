/** A rewrite of tinier */

// -----------
// Basic types
// -----------

type Key = string | number
type Address = ReadonlyArray<Key>
interface CollectionObj<T> { readonly [key: string]: T }
interface CollectionAr<T> extends ReadonlyArray<T> {}
type Collection<T> = CollectionAr<T> | CollectionObj<T>

// ---------------
// Basic functions
// ---------------

// /**
//  * Function with no return value.
//  */
// function noop (): void {}

function constant <T>(val: T): () => T {
  return () => val
}

// function last <T>(array: T[]): T {
//   return array[array.length - 1]
// }

// export function tail <T>(array: T[]): [T[], T] {
//   return [ array.slice(0, -1), last(array) ]
// }

// export function head <T>(array: CollectionAr<T>): [T, CollectionAr<T>] {
//   return [ array[0], array.slice(1) ]
// }

// export function frompairs <t>(pairs: [string, t][]): collectionobj<t> {
//   return pairs.reduce((accum, [ key, val ]) => {
//     return { ...accum, [key]: val }
//   }, {})
// }

// /**
//  * Iterate over the keys and values of an object.
//  */
// export function mapValues <T>(
//   obj: CollectionObj<T>,
//   fn: (value: T, key: string) => T
// ): CollectionObj<T> {
//   const newObj = {}
//   for (let key in obj) {
//     newObj[key] = fn(obj[key], key)
//   }
//   return newObj
// }

/**
 * Check if the object is an array
 * @param {*} object - The object to test.
 * @return {Boolean}
 */
export function isArray<T>(object): object is ReadonlyArray<T> {
  return Array.isArray(object)
}

// -------------------------
// Component & run functions
// -------------------------

type State = any
type Init = () => State

interface Component {
  type: '@TINIER_COMPONENT'
  displayName: string,
  init: Init,
}

type DisplayName = string

interface ComponentOptions {
  displayName?: string,
  // signalNames: SignalNames,
  // signalSetup: () => void,
  // model:       Model,
  init?: Init,
  // reducers:     {},
  // methods:      {},
  // willMount:    noop,
  // didMount:     noop,
  // shouldUpdate: defaultShouldUpdate,
  // willUpdate:   noop,
  // didUpdate:    noop,
  // willUnmount:  noop,
  // render:       noop,
}

/**
 * Create a tinier component.
 */
export function createComponent (options: ComponentOptions = {}): Component {
  // Default attributes
  const defaults = {
    displayName:  '',
    // signalNames:  [],
    // signalSetup:  noop,
    // model:        {},
    init: constant({}),
    // reducers:     {},
    // methods:      {},
    // willMount:    noop,
    // didMount:     noop,
    // shouldUpdate: defaultShouldUpdate,
    // willUpdate:   noop,
    // didUpdate:    noop,
    // willUnmount:  noop,
    // render:       noop,
  }

  // Check inputs at runtime for JavaScript library. These assertions are a good
  // idea in all top-level API functions.
  for (let k in options) {
    if (!(k in defaults)) {
      console.warn('Unexpected argument ' + k)
    }
  }

  return { type: '@TINIER_COMPONENT', ...defaults, ...options }
}

interface ObjectOf {
  type: '@TINIER_OBJECT_OF'
  component: Component
}

/**
 * Create an object representing many instances of this component, for use in a
 * tinier model.
 */
export function objectOf (component: Component): ObjectOf {
  return { type: '@TINIER_OBJECT_OF', component }
}

interface ArrayOf {
  type: '@TINIER_ARRAY_OF'
  component: Component
}

/**
 * Create an array representing many instances of this component, for use in a
 * tinier model.
 */
export function arrayOf (component: Component): ArrayOf {
  return { type: '@TINIER_ARRAY_OF', component }
}

interface RunOptions {
  initialState?: State,
}

interface Instance {
  // setState,
  // setStateNoRender
  // getState
  // reducers
  // methods
  // signals
}

/**
 * Run a tinier component.
 */
export function run (
  component: Component,
  appEl: DOMElement,
  opts: RunOptions = {}
): Instance {

  // // Create variables that will store the state for the whole lifetime of the
  // // application. Similar to the redux model.
  // let stateTree = makeTree(null, false)
  // const topBinding = tagType(NODE, { data: appEl, children: null })
  // let bindingTree = makeTree(topBinding, true)
  // let signalTree = makeTree(null, true)

  const initialState = 'initialState' in opts
    ? opts.initialState
    : component.init()

  return {
    // setState, setStateNoRender, getState, reducers, methods, signals
  }
}

// ---------
// Rendering
// ---------

type AddressOrKey = Address | Key

interface Binding {
  type: '@TINIER_BINDING'
  address: Address
}

/**
 * Create a new Tinier binding.
 */
export function bind (addressOrKey: AddressOrKey): Binding {
  const address = isArray(addressOrKey) ? addressOrKey : [ addressOrKey ]
  return { type: '@TINIER_BINDING', address }
}

// Note that JSX will pass null in when there are no attributes. In the
// resulting Element, this will be an empty object {}.
type ElementAttributes = { readonly [key: string]: string | number }
type ElementAttributesIn = ElementAttributes | null
type ElementChildren = Array<Binding | Element | string>
interface Element {
  type: '@TINIER_ELEMENT'
  tagName: string
  attributes: ElementAttributes
  children: ElementChildren
}

/**
 * Create a new TinierDOM element.
 */
export function createElement (
  tagName: string,
  attributesIn: ElementAttributesIn,
    ...children: ElementChildren
): Element {
  const attributes = attributesIn === null ? {} : attributesIn
  return { type: '@TINIER_ELEMENT', tagName, attributes, children }
}

export function render (
  container: DOMElement,
    ...tinierElementsAr: Array<Element | string>
): NestedBindings {

  // Check inputs at runtime for JavaScript library.
  if (!isDOMElement(container)) {
    throw new Error('First argument must be a DOM Element.')
  }

  // const tinierElements = flattenElementsAr(tinierElementsAr)

  // const first = get(tinierElements, 0)
  // if (isTinierBinding(first)) {
  //   if (tinierElements.length !== 1) {
  //     throw new Error('A binding cannot have siblings in TinierDOM. ' +
  //                     'At binding: [ ' + first.address.join(', ') + ' ].')
  //   }
  //   return objectForBindings([ addressToObj(first.address, container) ])
  // }

  // // get the children with IDs
  // const childrenWithKeys = Array.from(container.children).filter(c => c.id)
  // const elementsByID = keyBy(childrenWithKeys, 'id')

  // // render each element
  // const bindingsAr = tinierElements.map((tinierEl, i) => {
  //   // If an element if a binding, then there can only be one child.
  //   if (isUndefined(tinierEl)) {
  //     // cannot be undefined
  //     throw new Error('Children in Tinier Elements cannot be undefined.')
  //   } else if (isTinierElement(tinierEl)) {
  //     // container.childNodes is a live collection, so get the current node at
  //     // this index.
  //     const el = container.childNodes[i]
  //     // tinierEl is a TinierDOM element.
  //     if (tinierEl.attributes.id in elementsByID) {
  //       // el exist, then check for a matching node by ID
  //       const movedEl = elementsByID[tinierEl.attributes.id]
  //       if (el) {
  //         // if match and existing el, then replace the element
  //         container.replaceChild(movedEl, el)
  //       } else {
  //         // if match and el is undefined, then append the element
  //         container.appendChild(movedEl)
  //       }
  //       // then render children
  //       return render(movedEl, ...tinierEl.children)
  //     } else if (el) {
  //       // both defined, check type and id
  //       if (el.tagName && el.tagName.toLowerCase() ===
  //           tinierEl.tagName.toLowerCase()) {
  //         // matching tag, then update the node to match. Be aware that existing
  //         // nodes with IDs might get moved, so we should clone them?
  //         const elToUpdate = el.id ? el.cloneNode(true) : el
  //         updateDOMElement(elToUpdate, tinierEl)
  //         if (el.id) container.replaceChild(elToUpdate, el)
  //         return render(elToUpdate, ...tinierEl.children)
  //       } else {
  //         // not a matching tag, then replace the element with a new one
  //         const newEl = createDOMElement(tinierEl, container)
  //         container.replaceChild(newEl, el)
  //         return render(newEl, ...tinierEl.children)
  //       }
  //     } else {
  //       // no el and no ID match, then add a new Element or string node
  //       const newEl2 = createDOMElement(tinierEl, container)
  //       container.appendChild(newEl2)
  //       return render(newEl2, ...tinierEl.children)
  //     }
  //     // There should not be any bindings here
  //   } else if (isTinierBinding(tinierEl)) {
  //     throw new Error('A binding cannot have siblings in TinierDOM. ' +
  //                     'At binding: [ ' + tinierEl.address.join(', ') + ' ].')
  //   } else {
  //     const el = container.childNodes[i]
  //     const s = String(tinierEl)
  //     // This should be a text node.
  //     if (isText(el)) {
  //       // If already a text node, then set the text content.
  //       el.textContent = s
  //     } else if (el) {
  //       // If not a text node, then replace it.
  //       container.replaceChild(document.createTextNode(s), el)
  //     } else {
  //       // If no existing node, then add a new one.
  //       container.appendChild(document.createTextNode(s))
  //     }
  //     // No binding here.
  //     return null
  //   }
  // })

  // // remove extra nodes
  // // TODO This should not run if the child is a binding. Make a test for
  // // this. When else should it not run?
  // removeExtraNodes(container, tinierElements.length)

  // // bindings array to object
  // return objectForBindings(bindingsAr.filter(b => b !== null))
}

// ----------
// Export API
// ----------

export default {
  arrayOf, objectOf, createComponent, run, bind, createElement, render
}
