import React from "react";
import gql from "graphql-tag";
import { useQuery, useMutation } from "@apollo/react-hooks";
import useValidator, { ignoreValidatorError } from "react-use-validator";
import { useFormProviderContext } from "./FormProvider";

const emptyQuery = gql`
  query {
    empty
  }
`;

function ucfirst(s) {
  return s.replace(/^./, s => s.toUpperCase());
}

function first(a) {
  return a.length ? a[0] : null;
}

function getOperationDefinition(query) {
  return first(query.definitions.filter(d => d.kind === "OperationDefinition"));
}

function getFieldSelection(definition) {
  if (!definition) {
    return null;
  }
  return first(
    definition.selectionSet.selections.filter(s => s.kind === "Field")
  );
}

function getVariableDefinitions(definition) {
  if (!definition) {
    return null;
  }
  return definition.variableDefinitions.filter(
    s => s.kind === "VariableDefinition"
  );
}

function getType(o) {
  if (!o) {
    return null;
  }
  if (o.kind === "NamedType") {
    return o.name.value;
  }
  return getType(o.type);
}

function getQuerySelectionKey(query) {
  const field = getFieldSelection(getOperationDefinition(query));
  const key = field.alias ? field.alias.value : field.name.value;
  if (!key) {
    throw new Error("Unable to determine form data from query structure");
  }
  return key;
}

function getMutationVariables(mutation, variables, transform) {
  const variableDefinitions = getVariableDefinitions(
    getOperationDefinition(mutation)
  );
  return variableDefinitions.reduce((accum, variableDefinition) => {
    const type = getType(variableDefinition);
    const name = variableDefinition.variable.name.value;
    const value = variables[name];
    return { ...accum, [name]: transform(value, type, name) };
  }, {});
}

function getMutationUpdate(mutation, updates) {
  const field = getFieldSelection(getOperationDefinition(mutation));
  const fieldName = field.name.value;
  return lookup(updates, fieldName);
}

function lookup(o, name) {
  return o instanceof Function ? o(name) : o[name];
}

export default function useForm() {
  const formProviderContext = useFormProviderContext();
  const {
    data = {},
    rules = {},
    query = null,
    queryVariables = null,
    fetchPolicy = "network-only",
    mutation = null,
    mutationVariables = null,
    mutations: mutationsProp = {},
    mutationsVariables: mutationsVariablesProp = {},
    mutationsOptions: mutationsOptionsProp = {},
    submitAction = "submit",
    toFormData = (data, query, selectionKey) => data,
    toMutationVariable = (value, type, name) => value,
    cacheUpdates = {},
    ...props
  } = { ...formProviderContext, ...arguments[0] };
  const [formData, setFormData] = React.useState(data);
  const [progress, setProgress] = React.useState({});
  const [mutationErrors, setMutationErrors] = React.useState({});
  const [messages, validate] = useValidator(rules);
  const {
    data: queryData,
    loading: queryLoading,
    error: queryError
  } = useQuery(query || emptyQuery, {
    variables: queryVariables,
    fetchPolicy,
    skip: !query
  });

  React.useEffect(() => {
    validate.reset();
    if (!query || !queryData) {
      return;
    }
    const key = getQuerySelectionKey(query);
    if (!Object.prototype.hasOwnProperty.call(queryData, key)) {
      return;
    }
    setFormData(toFormData(queryData, query, key)[key]);
  }, [query, queryData]);

  const [mutations, mutationsVariables] = React.useMemo(() => {
    if (mutation) {
      return [
        { [submitAction]: mutation },
        { [submitAction]: mutationVariables }
      ];
    } else {
      return [mutationsProp, mutationsVariablesProp];
    }
  }, [mutation, mutationVariables, mutationsProp, mutationsVariablesProp]);

  const mutate = Object.entries(mutations).reduce(
    (mutate, [name, mutation]) => ({
      ...mutate,
      [name]: useMutation(mutation)[0]
    }),
    {}
  );

  const actions = Object.entries(mutations).reduce(
    (actions, [name, mutation]) => ({
      ...actions,
      [name]: async event => {
        event.preventDefault();
        setProgress({ ...progress, [name]: true });
        setMutationErrors({});
        const variables = getMutationVariables(
          mutation,
          await lookup(mutationsVariables, name)(formData),
          toMutationVariable
        );
        const update = getMutationUpdate(mutation, cacheUpdates);
        const mutationOptions = lookup(mutationsOptionsProp, name);
        return mutate[name]({ ...mutationOptions, variables, update })
          .then(response =>
            trigger(name + "Success", [event, response, state], response)
          )
          .then(response => {
            setProgress({ ...progress, [name]: false });
            if (response) {
              return trigger(name, [event, response, state]);
            }
          })
          .catch(error => {
            setProgress({ ...progress, [name]: false });
            return trigger(name + "Error", [event, error, state], error);
          })
          .then(error => {
            if (error) {
              console.error(error);
              setMutationErrors({ [name]: error });
            }
          });
      }
    }),
    {}
  );

  function trigger(action, args, defaultReturn = null) {
    const handler = props[`on${ucfirst(action)}`];
    return handler instanceof Function ? handler(...args) : defaultReturn;
  }

  function updateFormData(change) {
    setFormData({ ...formData, ...change });
    return validate(change).catch(ignoreValidatorError);
  }

  function onSubmit(event) {
    if (actions[submitAction] instanceof Function) {
      return actions[submitAction](event, null, state);
    } else {
      event.preventDefault();
      return trigger(submitAction, [event, null, state]);
    }
  }

  const state = {
    formData,
    setFormData,
    updateFormData,
    messages,
    validate,
    actions,
    progress,
    onSubmit,
    queryData,
    queryLoading,
    queryError,
    mutationErrors,
    setMutationErrors
  };
  return state;
}
