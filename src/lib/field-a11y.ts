/** ARIA wiring for an input and its error message: spread onto the input, use `errorId` on the message. */
export function fieldA11y(id: string, error?: string | null) {
  const errorId = `${id}-error`;
  return {
    errorId,
    inputProps: {
      id,
      "aria-invalid": error ? true : undefined,
      "aria-describedby": error ? errorId : undefined,
    },
  };
}
