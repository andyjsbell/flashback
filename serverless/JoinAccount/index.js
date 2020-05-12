const StellarSdk = require('stellar-sdk');
const { validateEmail } = require('../emails');

const TEST_ACCOUNT_SECRET = "SBMRMWK2ZAIRIMK7JPIPXKYIS57TKCV3BTYNWPCZWWNU6YLB4NJQFMDB";

module.exports = async function (context, req) {

    context.log("JoinAccount endpoint called", req.body);

    if (req.body && req.body.email) {
        const newEmail = req.body.email;
        if (validateEmail(newEmail)) {
            const server = new StellarSdk.Server('https://horizon-testnet.stellar.org');
            try {

                const sourceAccountKeyPair = StellarSdk.Keypair.fromSecret(TEST_ACCOUNT_SECRET);
                const serverAccount = await server.loadAccount(sourceAccountKeyPair.publicKey());

                const fee = await server.fetchBaseFee();
                const newAccountKeyPair = StellarSdk.Keypair.random();

                const transaction = new StellarSdk.TransactionBuilder(serverAccount, {
                    fee, networkPassphrase: StellarSdk.Networks.TESTNET
                }).addOperation(StellarSdk.Operation.createAccount({
                    destination: newAccountKeyPair.publicKey(),
                    startingBalance: '1'
                })).setTimeout(30).build();

                transaction.sign(sourceAccountKeyPair);

                await server.submitTransaction(transaction);

                context.bindings.accountsTable = [];

                const account = {
                    PartitionKey: newEmail,
                    RowKey: newAccountKeyPair.publicKey(),
                    Secret: newAccountKeyPair.secret()
                };

                context.bindings.accountsTable.push(account);

                context.res = {
                    // status: 200, /* Defaults to 200 */
                    body: {
                        status: "Succeeded",
                        account
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