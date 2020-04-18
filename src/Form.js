import React from "react";
import useForm from "./useForm";
import FormContext from "./FormContext";

function renderProps(component, ...args) {
  if (component instanceof Function) {
    return component(...args);
  }
  return component;
}

function FormContextProvider({
  children,
  formProps,
  renderLoading,
  renderError,
  state,
  ...props
}) {
  if (state.queryLoading && renderLoading) {
    return renderLoading(state);
  }
  if (state.queryError && renderError) {
    return renderError(state);
  }
  return (
    <>
      <FormContext.Provider value={state}>
        <form onSubmit={state.onSubmit} {...formProps}>
          {renderProps(children, state)}
        </form>
      </FormContext.Provider>
    </>
  );
}

function FormHook(props) {
  const state = useForm(props);
  return <FormContextProvider {...props} state={state} />;
}

export default function Form(props) {
  if (props.state) {
    return <FormContextProvider {...props} />;
  } else {
    return <FormHook {...props} />;
  }
}
