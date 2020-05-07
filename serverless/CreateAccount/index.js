const StellarSdk = require('stellar-sdk');
const TEST_ACCOUNT_SECRET = "SC6LVTP3QQSJKMHYCHUYV5RZ2Y3OTI3T5GG72KZ2ZX4SRSSVP3AGIWPL";

const validateEmail = (email) => {
    const re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(String(email).toLowerCase());
};

module.exports = async function (context, req) {

    context.log("CreateAccount endpoint called", req.body);

    if (req.body && req.body.publicKey && req.body.email) {
        const newAccountPublicKey = req.body.publicKey;
        const newEmail = req.body.email;
        if (validateEmail(newEmail)) {
            const server = new StellarSdk.Server('https://horizon-testnet.stellar.org');
            let exists = false;
            server.loadAccount(newAccountPublicKey).then((account)=>{
                context.res = {
                    status: 400,
                    body: "Failed to load account " + newAccountPublicKey
                };
            }).catch((e) => {});

            if (exists) {
                context.res = {
                    status: 400,
                    body: {
                        status: "Error"
                    }
                };
            } else {
                try {
                    const sourceAccountKeyPair = StellarSdk.Keypair.fromSecret(TEST_ACCOUNT_SECRET);
                    const account = await server.loadAccount(sourceAccountKeyPair.publicKey());
                    context.log(account);

                    const fee = await server.fetchBaseFee();

                    const transaction = new StellarSdk.TransactionBuilder(account, {
                        fee, networkPassphrase: StellarSdk.Networks.TESTNET
                    }).addOperation(StellarSdk.Operation.createAccount({
                        destination: newAccountPublicKey,
                        startingBalance: '1'
                    })).setTimeout(30).build();

                    transaction.sign(sourceAccountKeyPair);


                    const transactionResult = await server.submitTransaction(transaction);

                    context.bindings.accountsTable = [];

                    context.bindings.accountsTable.push({
                        PartitionKey: newEmail,
                        RowKey: newAccountPublicKey
                    });

                    context.res = {
                        // status: 200, /* Defaults to 200 */
                        body: {
                            status: "Succeeded",
                            transactionResult
                        }
                    };
                } catch(e) {
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