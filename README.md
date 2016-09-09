# tinier.js

A library for building tiny, reactive, functional components. Designed with
D3.js in mind.

# Documentation

## Usage

Tinier is available as a UMD module on unpkg:

- http://unpkg.com/tinier/dist/tinier.js
- http://unpkg.com/tinier/dist/tinier.min.js

And it is on NPM:

https://www.npmjs.com/package/tinier

## TinierDOM

Tinier can be used with [TinierDOM](https://github.com/zakandrewking/tinier-dom)
for React-style DOM definitions that use JSX.

## Components

Tinier components are created with the `createComponent` function.

```javascript
MyComponent = createComponent({
  displayName: 'MyComponent',
})
```

The `run` function binds a Tinier component to the DOM and renders it.

```javascript
var el = document.getElementById('my-container')
run(el, MyComponent)
```

## Lifecycle

Components render when one of the following conditions is met:

- A reducer is called on the component and changes the state of the component
- The binding for a component changes when the parent renders

To stop rendering, you can pass a function to the `shouldUpdate` option of
`createComponent`.

To force rendering (e.g. if a parent needs to be updated when the child
changes), Tinier includes a reducer called `forceRenderReducer` that can be
called an any time.

## API
