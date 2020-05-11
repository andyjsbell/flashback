const { validateEmail } = require('../emails');

// Grabs PKs for email, authentication to be added
module.exports = async function (context, req) {
    context.log('LoginAccount HTTP trigger function processed a request.');

    if (req.body && req.body.email) {
        const newEmail = req.body.email;
        if (validateEmail(newEmail)) {

            const accounts = context.bindings.accountsTable.filter(row => {
                return (row.PartitionKey === req.query.email);
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
                context.res = {
                    status: 400,
                    body: {
                        status: "Error",
                        message: "email not found"
                    }
                };
            }

        } else {
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