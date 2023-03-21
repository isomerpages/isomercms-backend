## Microservices

This folder contain the microservices that are needed for the functionality of the site launch process.

We do intend to move away from serverless soon in favour of Pullumi. In the interim, here are the prerequisites for deploying into the cloud.

1. Run `npm install -g serverless`

By the very nature of cloud development, everyone will have access to the same shared resource. If you seek to do develop in an isolated environment, please use:

`npm run deploy:dev -- --stage <identifiable-unique-name>`

After development, please clean up by using:

`npm run destroy:dev -- --stage <identifiable-unique-name>`
