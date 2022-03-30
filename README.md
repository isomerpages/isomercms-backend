## E2E Tests

To run the E2E tests successfully, you will need to define the following environment variables:

```
export E2E_TEST_REPO="e2e-test-repo"
export E2E_TEST_SECRET="blahblahblah" // this should match the value of CYPRESS_COOKIE_VALUE on
// the frontend
export E2E_TEST_GH_TOKEN="" // this can be your own personal GH access token, or  the token from our
// specialized E2E test user
```

### Release

Run the following on the release branch to tag and push changes automatically:

```
npm run release --isomer_update=<versionType>
```

where versionType corresponds to npm version types. This only works on non-Windows platforms, for Windows, modify the release script to use %npm_config_update% instead of $npm_config_update.

### Running migrations on a remote database in a private subnet of a VPC

The following steps are needed before you can run migrations on a remote database in a private subnet of an AWS VPC.

First, you will need to ensure that your current device IP address is whitelisted to use the EC2 instance.

- Log into the AWS console and navigate to the EC2 Dashboard.
- Navigate to the Security Groups tab by looking at the Network & Security section in the left pane and clicking on the Security Groups tab.
- Look for the security group titled `cms-bastion-<ENVIRONMENT>`, where `<ENVIRONMENT>` is either staging or production. Click on the security group and then the Inbound rules tab.
- If you see your IP address in the Inbound rules whitelist, you are done with this step.
- If your IP address does not exist in the Inbound rules whitelist, click on the Edit inbound rules button.
- Click on the Add rule button. Select SSH as the Type, and select My IP as the Source. Give a meaningful description for the security rule, e.g. WeWork City House. Click on Save rules to complete this step.

Next, you will require the correct environment variables and credentials.

- Go into the 1PW Isomer - Admin vault and search for the `.ssh/.env.<staging | production>` file.
- Create a folder named .ssh in the root directory and place the `.env` files there.
- Search for the corresponding credentials `isomercms-<staging | production>-bastion.pem`
- Put these credentials into the .ssh folder also.

Finally, simply run the following command: `npm run db:migrate:<staging | production>`.

What happens under the hood is described below:
You need to set up a local port-forwarding service that forwards traffic from a specific local port, e.g. 5433, to the database via the bastion host (remember: the bastion host resides in the public subnet of the VPC and thus can be contactable from your computer).

- Open a terminal window and run the following command: `ssh -L 5433:<DB_HOST>:5432 <SSH_USER>@<SSH_HOST> -i <PATH_TO_SSH_HOST_PEM_FILE>`
- The `DB_HOST`, `SSH_USER`, `SSH_HOST`, and `PEM_FILE` values can be found in the `CMS <ENVIRONMENT> Database` file in the `Isomer - Admin` 1Password vault.
- The `PEM_FILE` (the actual file) can be found in the `Isomer - Admin` 1Password vault as well. Download the file and save it to your computer. and update the file value for `PATH_TO_SSH_HOST_PEM_FILE`.

Finally, we want to run the migration script.

- Modify the `DB_URI` in the `.env` file so that Sequelize connects to the local port-forwarding service at port 5433: `postgres://<DB_USER>:<DB_PASS>@127.0.0.1:5433/<DB_NAME>`
- Open another terminal window.
- Run `source .env`
- Run `npx sequelize-cli db:migrate`
