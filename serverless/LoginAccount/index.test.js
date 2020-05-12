const httpFunction = require('./index');
const context = require('../testing/defaultContext');

it('should get account ', async () => {

  const request = {
    body: {
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
  expect(context.res.body.accounts.length).toEqual(1);
});
