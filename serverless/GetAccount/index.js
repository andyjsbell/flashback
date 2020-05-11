const { validateEmail } = require('../emails');

// GET request with email as query which returns PKs
module.exports = async function (context, req) {
    context.log('GetAccount HTTP trigger function processed a request.');

    if (req.query && req.query.email) {

        if (validateEmail(req.query.email)) {

            const accounts = context.bindings.accountsTable.filter(row => {
                return (row.PartitionKey === req.query.email);
            });

            if (accounts.length > 0) {
                context.res = {
                    body: {
                        status: "Succeeded",
                        accounts
                    }
                };
            } else {
                context.res = {
                    status: 400,
                    body: {
                        status: "Error",
                        message: "email not found"
                    }
                };
            }
        }

    } else {
        context.res = {
            status: 400,
            body: "Please pass an email in the query string"
        };
    }
};