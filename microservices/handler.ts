// Handler file for serverless
/* eslint-disable */
// TODO: Fix directory alias issues with serverless typescript
export { generalDomainValidation } from "./site-launch/lambda-functions/general-domain-validation/index"
export { primaryDomainValidation } from "./site-launch/lambda-functions/primary-domain-validation/index"
export { successNotification } from "./site-launch/lambda-functions/success-notification/index"
export { failureNotification } from "./site-launch/lambda-functions/failure-notification/index"
export { stepFunctionsTrigger } from "./site-launch/lambda-functions/step-functions-trigger/index"
export { redirectionDomainValidation } from "./site-launch/lambda-functions/redirection-domain-validation/index"
