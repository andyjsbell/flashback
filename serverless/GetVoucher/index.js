const StellarSdk = require('stellar-sdk');
const { validateEmail } = require('../emails');

module.exports = async function (context, req) {

    context.log("GetVoucher endpoint called", req.body);

    if (req.query &&
        req.query.email) {

        const email = req.query.email;

        if (validateEmail(email)) {

            const vouchers = context.bindings.accountsTable.filter(row => {
                return (row.PartitionKey === email || row.RowKey === email);
            });

            context.res = {
                body: {
                    vouchers
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