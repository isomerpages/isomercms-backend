import { FormField } from "@opengovsg/formsg-sdk/dist/types"

// eslint-disable-next-line import/prefer-default-export
export function getField(
  responses: FormField[],
  name: string
): string | undefined {
  const response = responses.find(({ question }) => question === name)

  return response?.answer
}
