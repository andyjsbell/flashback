const httpFunction = require('./index');
const context = require('../testing/defaultContext');

it('should get account ', async () => {
  jest.setTimeout(30000);

  const request = {
    query: {
      email: "a@a.com"
    }
  };

  const account = {
    PartitionKey: 'a@a.com',
    RowKey: 'abc',
    Secret: 'mysecret'
  };

  context.bindings.accountsTable.push(account);

  await httpFunction(context, request);
  expect(context.res.body.status).toEqual("Succeeded");
  expect(context.res.body.publicKeys.length).toEqual(1);
});
