const StellarSdk = require('stellar-sdk');
const { validateEmail } = require('../emails');

const TEST_ACCOUNT_SECRET = "SBMRMWK2ZAIRIMK7JPIPXKYIS57TKCV3BTYNWPCZWWNU6YLB4NJQFMDB";

module.exports = async function (context, req) {

    context.log("CreateAccount endpoint called", req.body);

    if (req.body && req.body.email) {
        const newEmail = req.body.email;
        if (validateEmail(newEmail)) {

            const accounts = context.bindings.accountsTable.filter(row => {
                return (row.PartitionKey === req.body.email);
            });

            if (accounts.length > 0) {
                let publicKeys = [];
                accounts.forEach(account => publicKeys.push(account.RowKey));
                context.res = {
                    body: {
                        status: "Succeeded",
                        publicKeys
                    }
                };
            } else {
                try {
                    const newAccountKeyPair = StellarSdk.Keypair.random();

                    context.bindings.outAccountsTable = [];

                    context.bindings.outAccountsTable.push({
                        PartitionKey: newEmail,
                        RowKey: newAccountKeyPair.publicKey(),
                        Secret: newAccountKeyPair.secret()
                    });

                    const sourceAccountKeyPair = StellarSdk.Keypair.fromSecret(TEST_ACCOUNT_SECRET);

                    context.res = {
                        // status: 200, /* Defaults to 200 */
                        body: {
                            status: "Succeeded",
                            publicKeys: [newAccountKeyPair.publicKey()],
                            servicePublicKey: sourceAccountKeyPair.publicKey()
                        }
                    };
                } catch (e) {
                    context.res = {
                        status: 400,
                        body: {
                            status: "Error"
                        }
                    };
                }
            }
        }
        else {
            context.res = {
                status: 400,
                body: "Please pass a valid email"
            };
        }
    } else {
        context.res = {
            status: 400,
            body: "Please pass a valid body"
        };
    }
};