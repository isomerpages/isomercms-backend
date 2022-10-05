// Handler file for serverless
// TODO: Fix directory alias issues with serverless typescript
export { hello } from "./microservices/site-launch/lambda-functions/hello"
export { hithere } from "./microservices/site-launch/lambda-functions/hithere"
export { generalDomainValidation } from "./microservices/site-launch/lambda-functions/general-domain-validation"
export { primaryDomainValidation } from "./microservices/site-launch/lambda-functions/primary-domain-validation"
