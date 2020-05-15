import StellarSdk from 'stellar-sdk';
import BigNumber from 'bignumber.js';
let fee = 0;
const timeout = 5 * 60;

const createVoucher = async (transferAmount, sourceAccountKeyPair, destinationAccountPublicKey, servicePublicKey) => {

  // We are sending to destination account DEST_ACCOUNT, this is a new account which we create(PK would be returned from
  // central server, for this test we will use DEST_ACCOUNT
  // get method would be here to get the account based on email, if it returns that this is a newly created email
  // We would create a voucher, otherwise we would send payment directly.

  // We need an escrow account that we have no control of after the transaction of payment
  // Create escrow account

  try {
    const server = new StellarSdk.Server('https://horizon-testnet.stellar.org');
    fee = await server.fetchBaseFee();

    // Load our sender account
    const sourceAccount = await server.loadAccount(sourceAccountKeyPair.publicKey());

    // Create a key pair for the new escrow account
    const escrowAccountKeyPair = StellarSdk.Keypair.random();

    // Create transaction to create escrow account with balance of 1 XLM paid by sender account to create account plus
    // transfer amount

    // The whole things cost 0.0000600 XLM however it seems we need 1.6 to start this in the escrow... not sure...
    // but with this we transfer transferAmount XLM to destination. At XLM at 0.06 EUR that is 0.0000036 EUR voucher cost !!!

    const startingBalance = new BigNumber('1.5');
    const feeCost = new BigNumber('0.00001');
    const adjustTransferAmount = (new BigNumber(transferAmount).minus(startingBalance).plus(feeCost));
    // Check balance
    const currentBalance = sourceAccount.balances[0].balance;

    if (new BigNumber(currentBalance).minus(new BigNumber(transferAmount)).minus(feeCost).isLessThan(1)) {
      throw new Error('Insufficient balance');
    }

    const transaction = new StellarSdk.TransactionBuilder(sourceAccount, {
      fee, networkPassphrase: StellarSdk.Networks.TESTNET
    })
      // Create the escrow account with starting balance
      .addOperation(StellarSdk.Operation.createAccount({
      destination: escrowAccountKeyPair.publicKey(),
      startingBalance: startingBalance.toString()
    }))
      // Set source account as signer for the escrow account
      .addOperation(StellarSdk.Operation.setOptions({
      signer: {
        ed25519PublicKey: sourceAccountKeyPair.publicKey(),
        weight: 1
      }
    })).setTimeout(30).build();

    transaction.sign(sourceAccountKeyPair);
    const transactionResult = await server.submitTransaction(transaction);
    // Escrow created
    // Load escrow account to get latest sequence number
    const escrow_account = await server.loadAccount(escrowAccountKeyPair.publicKey());

    // Create pre-auth merge ops
    const [preAuthTx_1, preAuthTx_2] = createPreAuthTx(escrowAccountKeyPair, escrow_account.sequenceNumber(), destinationAccountPublicKey, sourceAccountKeyPair);

    // TODO we need to have these pre authorised transactions stored safe before we make the payment

    const transaction_2 = new StellarSdk.TransactionBuilder(sourceAccount, {
      fee, networkPassphrase: StellarSdk.Networks.TESTNET
    })
      // Pay the amount into escrow, we have created the account already
      .addOperation(StellarSdk.Operation.payment({
      destination: escrowAccountKeyPair.publicKey(),
      amount:adjustTransferAmount.toString(),
      asset: StellarSdk.Asset.native()
    }))
      // Add pre auth transaction to send to destination
      .addOperation(StellarSdk.Operation.setOptions({
      signer: {
        preAuthTx: preAuthTx_1.hash(),
        weight: 1
      },
      source: escrowAccountKeyPair.publicKey()
    }))
      // Add pre auth transaction to send back to sender
      .addOperation(StellarSdk.Operation.setOptions({
      signer: {
        preAuthTx: preAuthTx_2.hash(),
        weight: 1
      },
      masterWeight: 0,
      source: escrowAccountKeyPair.publicKey()
    }))
      // Set service as signer and set thresholds on account to 2, this allows service and sender to recover funds if needed
      // for example the XDR go missing we can recreate them or just refund the sender account
      .addOperation(StellarSdk.Operation.setOptions({
        signer: {
          ed25519PublicKey: servicePublicKey,
          weight: 1
        },
        highThreshold: 2,
        medThreshold: 2,
        lowThreshold: 2,
        source: escrowAccountKeyPair.publicKey()
      }))
      .setTimeout(30).build();

    transaction_2.sign(sourceAccountKeyPair);
    const transactionResult_2 = await server.submitTransaction(transaction_2);

    // We send funds to escrow account and create a pre auth transaction that is shared with the
    // destination to accept payment to avoid locked funds as this is a new account

    return [
      escrowAccountKeyPair,
      preAuthTx_1.toXDR(),
      preAuthTx_2.toXDR()
    ];

  } catch (e) {
    console.log(e);
  }

}

const createPreAuthTx = (keyPair, seqNo, destinationAccountPublicKey, sourceAccountKeyPair) => {
  // Create two merge transactions to be pre authourised
  const nextSeqNo = new BigNumber(seqNo);

  const now = Math.round(new Date().getTime() / 1000);

  const transaction_3 = new StellarSdk.TransactionBuilder(new StellarSdk.Account(keyPair.publicKey(), nextSeqNo.toString()), {
    fee,
    networkPassphrase: StellarSdk.Networks.TESTNET,
    timebounds: {
      minTime: 0,
      maxTime: now + timeout
    }
  }).addOperation(StellarSdk.Operation.accountMerge({
    destination: destinationAccountPublicKey
  })).build();

  const transaction_4 = new StellarSdk.TransactionBuilder(new StellarSdk.Account(keyPair.publicKey(), nextSeqNo.toString()), {
    fee,
    networkPassphrase: StellarSdk.Networks.TESTNET,
    timebounds: {
      minTime: now + timeout,
      maxTime: 0
    }
  }).addOperation(StellarSdk.Operation.accountMerge({
    destination: sourceAccountKeyPair.publicKey()
  })).build();

  return [
    transaction_3,
    transaction_4,
  ];
};

export {
  createVoucher
};