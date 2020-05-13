const StellarSdk = require('stellar-sdk');
const { validateEmail } = require('../emails');

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

                    context.res = {
                        // status: 200, /* Defaults to 200 */
                        body: {
                            status: "Succeeded",
                            publicKeys: [newAccountKeyPair.publicKey()]
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