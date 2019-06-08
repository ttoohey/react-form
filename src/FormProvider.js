import React from "react";
const Context = React.createContext();

export function useFormProviderContext() {
  return React.useContext(Context);
}

export default function FormProvider({ children, ...props }) {
  return <Context.Provider value={props}>{children}</Context.Provider>;
}
