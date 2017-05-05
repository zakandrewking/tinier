# Tinier

Tinier is a library for building tiny reactive components in
JavaScript. Designed with D3.js in mind.

# Development status

Tinier is Alpha software. It runs, but expect bugs and some changes to the API.

# Documentation

## Usage

Tinier is available as a UMD module on unpkg:

- http://unpkg.com/tinier/lib/tinier.js
- http://unpkg.com/tinier/lib/tinier.min.js

And it is on NPM:

https://www.npmjs.com/package/tinier

## Components

A Tinier component is a portable object that describes a piece of a user
interface. By nesting components, you can build up a user interface from smaller
pieces. Each component describes that data that will define the interface
(e.g. the text that appears on a button), the way to render that component, and
the way each component communicates with its children and parents (e.g. when a
button gets clicked).

You can create a new component with the `createComponent` function. It takes one
argument that is an object with keys and values for the various options that
define the components. The `displayName` is a description that will appear in
debugging menus:

```javascript
MyComponent = createComponent({
  displayName: 'MyComponent',
})
```

A simple component might render text in a new `div`. We use the `render`
function to describe this:

```javascript
MyComponent = createComponent({
  displayName: 'MyComponent',

  render: () => <div>Hello World</div>
})
```

If you are not using Babel, you can write the raw version like this:

```javascript
MyComponent = createComponent({
  displayName: 'MyComponent',

  render: function () { return createElement('div', {}, 'Hello World') }
})
```

The `run` function binds a Tinier component to the DOM and renders it.

```javascript
var el = document.getElementById('my-container')
run(MyComponent, el)
```

### TODO

- Initializing and using `state`
- Getting a reference to `el`
- Rendering an array of Tinier elements
- Bindings need to be surround by a tag.
- Return from render must be a Tinier element or array of Tinier elements and
  strings (or the return value from `tinier.render`)
- Calling `tinier.render` manually
- Trick to reference component in its own model
- ES5 and ES6 examples
- Using pure reducers in parent components; will not be overloaded, so pass in
  current state

## Lifecycle

Components render when one of the following conditions is met:

1. A new instance of a component is created.
2. The binding (`el`) for a component is different than the last time it
   rendered.
3. The `shouldUpdate` function returns `true`.

To decide whether a component renders when (1) and (2) are false, you can pass a
function to the `shouldUpdate` option of `createComponent`. The default
`shouldUpdate` function follows.  It updates when the state changed based on an
assumption of immutable state object (see the section on Reducers).

```javascript
function shouldUpdate ({ state, lastState }) {
  return state !== lastState
}
```

A stricter approach utilizes the Boolean argument `componentTriggeredUpdate`.
When `componentTriggeredUpdate` is `true`, that means the update was caused by a
reducer of the given component. The following stricter `shouldUpdate` function
calls for an update only if the given component was specifically responsible for
the update. If a child or parent changes state, this `shouldUpdate` function
returns `false`.

```javascript
function shouldUpdate ({ state, lastState, componentTriggeredUpdate }) {
  return componentTriggeredUpdate && state !== lastState
}
```

You can also use `shouldUpdate` to change the rendering behavior with mutable
state objects. For instance, you might check for changes in the values of
essential state attributes.

```javascript
const important_attributes = [ 'value', 'index' ]

function shouldUpdate ({ state, lastState }) {
  return important_attributes.reduce((accum, k) => {
    return accum || state[k] !== lastState[k]
  }, false)
}
```

## Arguments vs. Properties

Tinier generally follows the approach
[taken by React](https://facebook.github.io/react/docs/dom-elements.html) for
dealing with attributes and properties. All properties of a tag in JSX (or
tinier.createElement) are set as attributes with the exception of the following
that have special behavior.

### Boolean attributes

Tinier will convert boolean values to the correct string values required by
attributes. For example, the checked attribute can be set with:

```
<input checked=true />
```

### Autofocus

Instead of autofocus, make a callback with `didMount`:

```javascript
didMount: ({ el }) => {
  el.getElementsByClassName('new-todo')[0].focus()
},
```

```javascript
didMount: (args) => {
  args.el.getElementsByClassName('new-todo')[0].focus()
},
```

Or use the special `then` attribute like this if you want it to run every time
the component renders:

```javascript
<input then={ el => el.focus() } />
```

```javascript
createElement('input', { then: function (el) { el.focus() } })
```

- [MDN reference](https://developer.mozilla.org/en-US/docs/Web/HTML/Attributes)

## API

### `tinier.createComponent({ ...args })`

Arguments as `args` object:

- *displayName*: `String`, default '' - A display name for the component mainly
  used for debugging.
- *model*:
- *init*: (Object) => Object, Default
- *signalNames*: `[String]`, default `[]` - A list of signal names as strings.

### `tinier.run(component, element, options={})`

- *component*: A Tinier component.
- *element*: A DOM element that the component will be rendered in.
- *options*: An object that can include any of the following attributes:
  - *initialState*: Then initial state for the component.
  - *verbose*: (Boolean) If true, then print extra warning messages and log all
    state changes.

Returns an object containing the run API:

- *setState*:
- *setStateNoRender*:
- *getState*:
- *reducers*:
- *methods*:
- *signals*:
