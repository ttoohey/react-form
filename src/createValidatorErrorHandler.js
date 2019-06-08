import { ignoreValidatorError } from "react-use-validator";

export default function createValidatorErrorHandler(
  rule,
  payload = null,
  onValidate = (event, messages, error) => null
) {
  function withPayload(result) {
    if (payload instanceof Function) {
      return { ...result, payload: payload(result) || result.payload };
    } else {
      return { ...result, payload: payload[result.type] || result.payload };
    }
  }
  return async (event, error, { validate, formData }) => {
    try {
      const results = error.graphQLErrors
        .filter(error => error.extensions.code === "BAD_USER_INPUT")
        .map(error => error.extensions.exception.validator)
        .reduce((results, result) => [...results, ...result], [])
        .map(withPayload);
      if (results.length > 0) {
        return await validate(formData, [[rule, results]])
          .then(messages => onValidate(event, messages, error))
          .catch(ignoreValidatorError);
      } else {
        return error;
      }
    } catch {
      return error;
    }
  };
}
