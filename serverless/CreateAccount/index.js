const StellarSdk = require('stellar-sdk');
const { validateEmail } = require('../emails');

const TEST_ACCOUNT_SECRET = "SBMRMWK2ZAIRIMK7JPIPXKYIS57TKCV3BTYNWPCZWWNU6YLB4NJQFMDB";

module.exports = async function (context, req) {

    context.log("CreateAccount endpoint called", req.body);

    if (req.body && req.body.email) {
        const newEmail = req.body.email;
        if (validateEmail(newEmail)) {
            const server = new StellarSdk.Server('https://horizon-testnet.stellar.org');
            try {

                const sourceAccountKeyPair = StellarSdk.Keypair.fromSecret(TEST_ACCOUNT_SECRET);
                const account = await server.loadAccount(sourceAccountKeyPair.publicKey());

                const fee = await server.fetchBaseFee();
                const newAccountKeyPair = StellarSdk.Keypair.random();

                const transaction = new StellarSdk.TransactionBuilder(account, {
                    fee, networkPassphrase: StellarSdk.Networks.TESTNET
                }).addOperation(StellarSdk.Operation.createAccount({
                    destination: newAccountKeyPair.publicKey(),
                    startingBalance: '1'
                })).setTimeout(30).build();

                transaction.sign(sourceAccountKeyPair);

                const transactionResult = await server.submitTransaction(transaction);

                context.bindings.accountsTable = [];

                context.bindings.accountsTable.push({
                    PartitionKey: newEmail,
                    RowKey: newAccountKeyPair.publicKey(),
                    Secret: newAccountKeyPair.secret()
                });

                context.res = {
                    // status: 200, /* Defaults to 200 */
                    body: {
                        status: "Succeeded",
                        transactionResult,
                        publicKey: newAccountKeyPair.publicKey()
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