const httpFunction = require('./index');
const context = require('../testing/defaultContext');

it('should create account and have balance of 1 lumens', async () => {
    jest.setTimeout(30000);

    const request = {
        body: {
            email: "a@a.com"
        }
    };

    await httpFunction(context, request);
    expect(context.res.body.status).toEqual("Succeeded");
    expect(context.res.body.publicKey).toBeDefined();
});
