// GET request with email as query which returns PKs
module.exports = async function (context, req) {
    context.log('GetHealth HTTP trigger function processed a request.');

    try {
        // Run test queries on backend
        const accounts = context.bindings.accountsTable !== null;
        const vouchers = context.bindings.vouchersTable !== null;
        context.res = {
            body: {
             accounts,
             vouchers,
             version: '0.0.1'
            }
        };
    } catch (e) {
        context.res = {
            body: {
                error: e
            }
        };
    }
};