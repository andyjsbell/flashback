const httpFunction = require('./index');
const context = require('../testing/defaultContext');
const StellarSdk = require('stellar-sdk');

it('should create account and have balance of 1 lumens', async () => {
    jest.setTimeout(30000);
    const pair = StellarSdk.Keypair.random();

    const request = {
        body: {
            publicKey: pair.publicKey(),
            email: "a@a.com"
        }
    };

    console.log(`PK:${pair.publicKey()} Secret:${pair.secret()}`)

    await httpFunction(context, request);
    expect(context.res.body.status).toEqual("Succeeded");
    console.log(context.res.body.transactionResult._links.transaction.href);
});
