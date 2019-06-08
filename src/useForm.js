import React from "react";
import gql from "graphql-tag";
import { useQuery, useMutation } from "react-apollo-hooks";
import useValidator, { ignoreValidatorError } from "react-use-validator";

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

function lookup(o, name) {
  return o instanceof Function ? o(name) : o[name];
}

export default function useForm({
  data = {},
  rules = {},
  query = null,
  queryVariables = null,
  fetchPolicy = "network-only",
  mutation = null,
  mutationVariables = null,
  mutations: mutationsProp = {},
  mutationsVariables: mutationsVariablesProp = {},
  submitAction = "submit",
  toFormData = (data, query, selectionKey) => data,
  toMutationVariable = (value, type, name) => value,
  cacheUpdates = {},
  ...props
}) {
  function on(action, defaultReturn = null) {
    const handler = props[`on${ucfirst(action)}`];
    return handler instanceof Function ? handler : () => defaultReturn;
  }
  const [formData, setFormData] = React.useState(data);
  const [progress, setProgress] = React.useState({});
  const [mutationErrors, setMutationErrors] = React.useState({});
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
    if (!queryData.hasOwnProperty(key)) {
      return;
    }
    setFormData(toFormData(queryData, query, key)[key]);
  }, [query, queryData]);

  React.useEffect(() => {
    if (queryError) {
      console.error(queryError);
    }
  }, [queryError]);

  const mutationFns = Object.entries(mutations).reduce(
    (mutationFns, [name, mutation]) => ({
      ...mutationFns,
      [name]: useMutation(mutation)
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
        const mutationVariables = lookup(mutationsVariables, name)(formData);
        const variableDefinitions = getVariableDefinitions(
          getOperationDefinition(mutation)
        );
        const field = getFieldSelection(getOperationDefinition(mutation));
        const fieldName = field.name.value;
        const variables = variableDefinitions.reduce(
          (variables, variableDefinition) => {
            const inputType = getType(variableDefinition);
            const inputName = variableDefinition.variable.name.value;
            return {
              ...variables,
              [inputName]: toMutationVariable(
                mutationVariables[inputName],
                inputType,
                inputName
              )
            };
          },
          {}
        );
        try {
          const originalResponse = await mutationFns[name]({
            variables,
            update: lookup(cacheUpdates, fieldName)
          });
          const response = await on(name + "Success", originalResponse)(
            event,
            originalResponse,
            context
          );
          setProgress({ ...progress, [name]: false });
          if (response) {
            on(name)(event, response, context);
          }
        } catch (originalError) {
          setProgress({ ...progress, [name]: false });
          const error = await on(name + "Error", originalError)(
            event,
            originalError,
            context
          );
          if (error) {
            console.error(error);
            setMutationErrors({ [name]: error });
          }
        }
      }
    }),
    {}
  );

  async function updateFormData(change) {
    setFormData({ ...formData, ...change });
    await validate(change).catch(ignoreValidatorError);
  }

  function onSubmit(event) {
    if (actions[submitAction] instanceof Function) {
      actions[submitAction](event, null, context);
    } else {
      event.preventDefault();
      on(submitAction)(event, null, context);
    }
  }

  const context = {
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
  return context;
}
