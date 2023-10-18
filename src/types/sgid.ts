export interface PublicOfficerData {
  email: string
  agencyName: string
  departmentName: string
  employmentTitle: string
}

export const isPublicOfficerData = (
  item: unknown
): item is PublicOfficerData => {
  const officerData = item as PublicOfficerData

  return (
    typeof officerData.email === "string" &&
    typeof officerData.agencyName === "string" &&
    typeof officerData.departmentName === "string" &&
    typeof officerData.employmentTitle === "string"
  )
}
