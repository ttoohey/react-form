import React from "react";

const FormContext = React.createContext();

export function useFormContext() {
  const context = React.useContext(FormContext);
  if (!context) {
    throw new Error(
      `Form compound components cannot be rendered outside the Form component`
    );
  }
  return context;
}

export function useFormData() {
  const { formData, updateFormData } = useFormContext();
  return [formData, updateFormData];
}

export function useFormValidation() {
  const { messages, validate } = useFormContext();
  return [messages, validate];
}

export default FormContext;
