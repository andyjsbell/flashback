const StellarSdk = require('stellar-sdk');
const { validateEmail } = require('../emails');

const validateXdr = (xdr) => {
    return true;
}

module.exports = async function (context, req) {

    context.log("CreateVoucher endpoint called", req.body);

    if (req.body &&
        req.body.to &&
        req.body.from &&
        req.body.xdr1 &&
        req.body.xdr2 &&
        req.body.escrow) {

        const toEmail = req.body.to;
        const fromEmail = req.body.from;
        const xdr1 = req.body.xdr1;
        const xdr2 = req.body.xdr2;
        const escrowAccount = req.body.escrow;

        if (validateEmail(toEmail) &&
            validateEmail(fromEmail) &&
            validateXdr(xdr1) &&
            validateXdr(xdr2)) {

            const toAccounts = context.bindings.accountsTable.filter(row => {
                return (row.PartitionKey === toEmail);
            });

            const fromAccounts = context.bindings.accountsTable.filter(row => {
                return (row.PartitionKey === fromEmail);
            });

            if (toAccounts.length > 0 && fromAccounts.length > 0) {

                context.bindings.outVouchersTable = [];

                context.bindings.outVouchersTable.push({
                    PartitionKey: fromEmail,
                    RowKey: toEmail,
                    xdr1,
                    xdr2,
                    escrowAccount
                });

                context.res = {
                    // status: 200, /* Defaults to 200 */
                    body: {
                        status: "Succeeded",
                        toEmail,
                        fromEmail,
                        xdr1,
                        xdr2,
                        escrowAccount
                    }
                };
            } else {
                context.log("invalid source or destination accounts");

                context.res = {
                    status: 400,
                    // status: 200, /* Defaults to 200 */
                    body: {
                        status: "Error",
                        message: "Invalid destination or source account"
                    }
                };
            }
        }
        else {
            context.log("check params");
            context.res = {
                status: 400,
                body: "Please pass emails and transactions"
            };
        }
    } else {
        context.log("check body");
        context.res = {
            status: 400,
            body: "Please pass a valid body"
        };
    }
};