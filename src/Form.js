import React from "react";
import useForm from "./useForm";
import FormContext from "./FormContext";
import { useFormProviderContext } from "./FormProvider";

function renderProps(component, ...args) {
  if (component instanceof Function) {
    return component(...args);
  }
  return component;
}

export default function Form({
  children,
  formProps,
  renderLoading,
  renderError,
  ...props
}) {
  const formProviderContext = useFormProviderContext();
  const context = useForm({ ...formProviderContext, ...props });
  if (context.queryLoading && renderLoading) {
    return renderLoading(context);
  }
  if (context.queryError && renderError) {
    return renderError(context);
  }
  return (
    <>
      <FormContext.Provider value={context}>
        <form onSubmit={context.onSubmit} {...formProps}>
          {renderProps(children, context)}
        </form>
      </FormContext.Provider>
    </>
  );
}
