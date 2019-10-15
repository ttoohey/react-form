# react-form

Reduces boilerplate when using a GraphQL API with forms in React.

Helps with:

- populating a form from a GraphQL query
- having multiple form actions that post GraphQL mutations
- serializing data based on types defined in GraphQL schema
- updating the Apollo GraphQL client cache after mutations
- client-side form validation
- asynchronous and server-side form validation
- handling error states

Features:

- UI component library agnostic
- tries to be unopinionated about GraphQL schema conventions
- allows application developer to define how things work

Additional documentation can be found at [react-form-stories](https://github.com/ttoohey/react-form-stories)

# Usage

Install peer dependencies

```sh
npm install @ttoohey/react-form graphql-tag react @apollo/react-hooks react-use-validator
```

The `<Form>` component is used to wrap form fields. Field components can make
use of the Form context which help avoid repetitive props such as `value` and
`onChange`

```js
import React from "react";
import { Form, useFormData } from "@ttoohey/react-form";

function Input({ name, ...props }) {
  const [data, update] = useFormData();
  return (
    <input
      name={name}
      value={data[name]}
      onChange={({ target }) => update({ [name]: value })}
      {...props}
    />
  );
}

function MyForm({ onSubmit }) {
  return (
    <Form data={{ field1: "", field2: "" }} onSubmit={onSubmit}>
      <Input name="field1" />
      <Input name="field2" />
    </Form>
  );
}
```

GraphQL queries and mutations are handled

```js
const query = gql`
  query {
    foo {
      bar
      baz
    }
  }
`;
const mutation = gql`
  mutation($bar: String, $baz: String) {
    setFoo(bar: $bar, baz: $baz) {
      bar
      baz
    }
  }
`;
function MyForm({ onSubmit }) {
  return (
    <Form query={query} mutation={mutation}>
      <Input name="bar" />
      <Input name="baz" />
    </Form>
  );
}
```

# API

## `useForm(options: Object): Object`

A React hook that maintains state for the `<Form>` compoment. The
state is collected into a single object which is the return value of the hook,
and also passed to event handlers. All the attributes of the state object are
described below.

### `options` argument

#### `data` (optional, default: {})

Initial data to populate the `formData` result property

#### `rules` (optional, default: {})

A [validator-creator](https://github/ttoohey/validator-creator) rule collection
that describes the validation to be performed by the form

#### `query` (optional, default: null)

A GraphQL document that consists of a single query to be sent down to the server.

If provided it will be fetched and the resulting data will be used to populate
the `formData` result property

#### `queryVariables` (optional, default: null)

A map going from variable name to variable value, where the variables are used
within the GraphQL query.

#### `fetchPolicy` (optional, default: "network-only")

Controls how the Apollo client will use the cache. The default is "network-only"
so that forms will always request the most up to date data. See Apollo Docs
[Apollo Client API](https://www.apollographql.com/docs/react/api/apollo-client/#ApolloClient.query)
for other values.

#### `mutation` (optional, default: null)

A GraphQL document that contains a single mutation inside of it.

This is a short-hand for the `mutations` prop when the form has only one action.
It is the equivalent of setting `mutations` to `{ [submitAction]: mutation }`

#### `mutationVariables` (optional, default: null)

To be used when `mutation` is also set.

A function that returns an object that maps from the name of a variable as used
in the mutation GraphQL document to that variable's value.

The equivalent of setting `mutationsVariables` to `{ [submitAction]: mutationVariables }`

#### `mutations` (optional, default: {})

A mapping of action names to GraphQL mutation documents.

The form's actions are derived from this object.

#### `mutationsVariables` (optional, default: {})

A mapping of action names to functions that return variables for the
corresponding mutation. The functions may be asynchronous.

The function signature is:

```js
async function (formData: Object) : TVariables
```

#### `mutationsOptions` (options, default: {})

Options to pass through to the mutate function when a mutation is being
performed.

Allows passing `optimisticResponse` and `refetchQueries` through to mutations.

See https://www.apollographql.com/docs/react/api/react-hooks/#result-2

#### `submitAction` (optional, default: "submit")

Sets the name of the action to be used as the default action for the form.

#### `toFormData` (optional, default: data => data)

A callback to allow unserializing the GraphQL query response data to a suitable
structure for the application.

The callback signature is:

```js
function toFormData(data: Object, query: DocumentNode, name: String): Object
```

The callback's parameters are:

- `data` - the data returned in the GraphQL query response (equivalent to `queryData` in the return object)
- `query` - the GraphQL document used in the query
- `name` - the name of the first query selection node in the query document

The callback return value should be an object containing an attribute named with
the value of `name`. The `formData` return object will be set to the `name`
attribute's value.

#### `toMutationVariable` (optional, default: value => value)

A callback to allow serializing variable values for a GraphQL mutation.

The callback signature is:

```js
function toMutationVariable(value: any, type: String, name: String): any
```

The callback's parameters are:

- `value` - the variable's value to be serialized (as returned from `mutationsVariables`)
- `type` - the variable's type as defined by the GraphQL schema
- `name` - the variable's name as defined by the GraphQL schema

#### `cacheUpdates` (optional, default: {})

A function or object mapping mutation names (as defined in the GraphQL schema)
to functions that update the Apollo client cache when a mutation is performed.

See Apollo Docs [Apollo Client API](https://www.apollographql.com/docs/react/api/apollo-client/#ApolloClient.mutate)

#### `on{Action}` (optional)

For each action defined in the `mutations` option, this event handler will be
called when the mutation completes with a response.

It is safe to have side effects that unmount the `<Form>` component from this
event handler.

The signature of the event handler is:

```js
function (event: Event, fetchResult: FetchResult, state: Object): void
```

The parameters of the event handler are:

- `event` - the original event object passed to the action method
- `fetchResult` - the values returned by the Apollo client's `mutate` function
- `state` - the current state of the useForm() hook

#### `on{Action}Success` (optional)

For each action defined in the `mutations` option, this event handler will be
called when the mutation completes successfully. This event handler is called
before the corresponding `on{Action}`.

This handler should be used if there are asynchronous side effects to be done,
or the application needs to filter responses. Do not have side effects that
unmount the `<Form>` component. The `progress` value will not be
updated until the "Success" event handler completes.

The return value should be `null` if the action has been _consumed_, otherwise
the `fetchResult` parameter should be returned. Returning `null` will prevent the
`on{Action}` event handler from being called.

The signature of the event handler is:

```js
function (event: Event, fetchResult: FetchResult, state: Object): Promise<FetchResult>
```

The parameters of the event handler are:

- `event` - the original event object passed to the action method
- `fetchResult` - the values returned by the Apollo client's `mutate` function
- `state` - the current state of the useForm() hook

#### `on{Action}Error` (optional)

For each action defined in the `mutations` option, this event handler will be
called if the mutation is rejected with an error.

The return value should be `null` if the error has been _consumed_, otherwise
the `error` parameter should be returned. Returning `null` will prevent the
error from propagating to the `mutationErrors` property in the return object.

The signature of the event handler is:

```js
function (event: Event, error: Error, state: Object): Promise<Error>
```

The parameters of the event handler are:

- `event` - the original event object passed to the action method
- `error` - the Error object
- `state` - the current state of the useForm() hook

### return object

#### `formData`

An object mapping field names to field values.

#### `setFormData`

Sets the `formData` object.

```js
function setFormData(newFormData)
```

#### `updateFormData`

A convenience function to apply a change to `formData`.

```js
function updateFormData(change)
```

It is the equivalent of calling `setFormData({ ...formData, ...change })`.

#### `messages`

An object mapping field names to validator payloads.

#### `validate`

A function to perform a validation. See [react-use-validator](https://github.com/ttoohey/react-use-validator)

```js
function validate(change: Object, results?): Object
```

#### `actions`

An object mapping action names defined by the `mutations` option to a function
to perform the mutation.

Each action is an event handler function

```
function (event: Event): void
```

#### `progress`

An object mapping action names defined by the `mutations` option to a boolean
value that indicates whether the mutation is in progress.

#### `onSubmit`

A function that calls the default action if mutations have been set, or the
`on{submitAction}` event (if provided).

The `form` element's onsubmit event calls this to provide the default
event handler for the form.

#### `queryData`

The data returned by the GraphQL query.

#### `queryLoading`

A boolean value indicating whether the GraphQL query is in progress.

#### `queryError`

Set to an Error object if the GraphQL query is rejected with an error.

#### `mutationErrors`

An object mapping action names as defined by the `mutations` object to Error
objects. It is populated if a GraphQL mutation is rejected with an error.

#### `setMutationErrors`

Sets the `mutationErrors` object.

## `<Form>` component

A React component that provides a context for form fields containing the `useForm()`
state object as value.

### Props

All `useForm()` options are available as props, as well as:

#### `formProps` (optional)

An object contain props to be passed to the `<form>` component.

#### `renderLoading` (optional)

A function that returns a rendered React component. The Form component will
return this if `queryLoading` is true.

#### `renderError` (optional)

A function that returns a rendered React component. The Form component will
return this if `queryError` is set.

#### `children`

The `Form` component wraps children in a context that contains the `useForm()`
state object.

`children` may use the _render props_ technique. If `children` is a render props
function it will be passed the context object as an argument.

## `useFormContext()`

A React hook function that returns the context provided by the Form component.

```js
// eg
function MyField() {
  const { formData, messages } = useFormContext();
}
```

## `useFormData()`

A React hook function that returns the `formData` and `updateFormData`
properties of the Form context.

```js
// eg
function MyField() {
  const [data, update] = useFormData();
}
```

## `useFormValidation()`

A React hook function that returns the 'messages' and 'validate' properties of the
Form context.

```js
// eg
function MyField() {
  const [messages, validate] = useFormValidation();
}
```

## `<FormProvider>` Component

A React component that creates a context that sets default values for props
in the `<Form>` component.

```js
// eg
<FormProvider submitAction="save">
  <Form onSave={() => doSomething()}>...</Form>
</FormProvider>
```

All props of the `<Form>` component are available to `<FormProvider>`.

## `useFormProviderContext()`

A React hook that returns the context value set by the `<FormProvider>` component.

## `createValidatorErrorHandler(rule, payload, onValidate)`

A function that returns an `on{Action}Error` event handler that consumes validation errors.

### Arguments

#### `rule`

A validator rule.

#### `payload` (optional)

An object that maps a rule type to a validator payload, or a function that returns a
validator payload.

The function signature is:

```js
function (result: Object): any
```

The `result` argument is an object with shape `{ prop, type }` that describes the
field (prop) and rule (type) that has the validation error.

The return value is up to the application; it is additional information to extend
the result (typically a text message to display to the user).

#### `onValidate` (optional)

A callback function that is called after the result has been processed.

The function signature is:

```js
function onValidate(event: Event, messages: Object, error: Error): void
```

The function arguments are:

- `event` - the original Event object that caused the error
- `messages` - an object mapping field names to validator payloads
- `error` - the Error object that was handled
