import { FormField } from "@opengovsg/formsg-sdk/dist/types"

// eslint-disable-next-line import/prefer-default-export
export function getField(
  responses: FormField[],
  name: string
): string | undefined {
  const response = responses.find(({ question }) => question === name)

  return response?.answer?.trim()
}

function trimAllStrings(
  responseArray: string[] | string[][]
): string[] | string[][] {
  if (!Array.isArray(responseArray)) {
    // defensively return if responseArray is not an array
    return responseArray
  }

  responseArray.map((item) => {
    if (Array.isArray(item)) {
      return trimAllStrings(item)
    }
    if (typeof item === "string") {
      return item.trim()
    }
    return item
  })
  return responseArray
}

export function getFieldsFromTable(
  responses: FormField[],
  name: string
): string[] | string[][] | undefined {
  const response = responses.find(({ question }) => question === name)
  let answers = response?.answerArray
  if (answers) {
    answers = trimAllStrings(answers)
  }
  return answers
}
