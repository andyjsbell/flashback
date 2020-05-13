import React, {useState} from 'react';
import './App.css';
import StellarSdk from 'stellar-sdk';
import {createVoucher} from "./voucher";
import BigNumber from 'bignumber.js';

const validateEmail = (email) => {
  const re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  return re.test(String(email).toLowerCase());
};

const API_URL = 'http://localhost:7071/api';

function App() {
  const [accounts, setAccounts] = useState([]);
  const [email, setEmail] = useState('');
  const [destinationEmail, setDestinationEmail] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [sendAmount, setSendAmount] = useState(0);
  const [voucher, setVoucher] = useState('');
  const [vouchers, setVouchers] = useState([]);
  const [balance, setBalance] = useState('');

  const login = async () => {
    if (validateEmail(email)) {
      const response = await fetch(`${API_URL}/accounts/login`, {
        method: 'POST',
        body: JSON.stringify({
          email
        })
      });

      const body = await response.json();

      if (body.status === 'Succeeded') {
        setMessage('Logged in');
        setAccounts(body.accounts);
        const server = new StellarSdk.Server('https://horizon-testnet.stellar.org');

        server.loadAccount(body.accounts[0].RowKey).then(account => {
          // Get balance
          setBalance(account.balances[0].balance);
        });

      } else {
        setError('Failed to login:' + body.message);
      }
    } else {
      setError('invalid email');
    }
  };

  const logout = async () => {
    setMessage('logout? We do not do this yet');
  };

  const join = async () => {
    if (validateEmail(email)) {

      setMessage('Joining with ' + email);

      const response = await fetch(`${API_URL}/accounts/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json;charset=utf-8'
        },
        body: JSON.stringify({
          email
        })
      });

      const body = await response.json();
      if (body.status === 'Succeeded') {
        setMessage('Account created')
        setAccounts([body.account]);
      } else {
        setError('Failed to join');
      }
    } else {
      setError('invalid email');
    }
  };

  const send = async () => {
    const toSend = new BigNumber(sendAmount);
    setError('');

    if (validateEmail(destinationEmail)) {
      if (!toSend.isNaN() && toSend.toNumber() > 0) {
        const response = await fetch(`${API_URL}/accounts/create`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json;charset=utf-8'
          },
          body: JSON.stringify({
            email: destinationEmail
          })
        });

        const body = await response.json();
        if (body.status === 'Succeeded') {
          const destinationPublicKey = body.publicKeys[0];
          // Default to send from first account
          const server = new StellarSdk.Server('https://horizon-testnet.stellar.org');
          const senderAccountKeyPair = StellarSdk.Keypair.fromSecret(accounts[0].Secret);

          try {

            // Will throw error if account doesn't exist
            server.loadAccount(destinationPublicKey)
            .then(destinationAccount => {
              // Send payment directly

              server.loadAccount(senderAccountKeyPair.publicKey()).then(senderAccount => {

                const currentBalance = senderAccount.balances[0].balance;
                setBalance(currentBalance);

                server.fetchBaseFee().then(fee => {

                  const feeInXLM = new BigNumber(fee).times("0.0000001");

                  const remainingBalance = new BigNumber(currentBalance).minus(toSend).minus(feeInXLM);

                  if (remainingBalance.isLessThan(1)) {

                    console.log(remainingBalance.toString());
                    setError('insufficient balance, you need more than 1 XLM left in your account after transfer')

                  } else {

                    const transaction = new StellarSdk.TransactionBuilder(senderAccount, {
                      fee, networkPassphrase: StellarSdk.Networks.TESTNET
                    })
                      .addOperation(StellarSdk.Operation.payment({
                        destination: destinationPublicKey,
                        amount: sendAmount,
                        asset: StellarSdk.Asset.native()
                      })).setTimeout(30).build();

                    transaction.sign(senderAccountKeyPair);

                    return server.submitTransaction(transaction)
                      .then(tx => {
                        console.log(tx)

                        setMessage('Transaction succeeded');

                        server.loadAccount(senderAccountKeyPair.publicKey()).then(senderAccount => {

                          setBalance(senderAccount.balances[0].balance);

                        }).catch(e => setError(JSON.stringify(e)));

                      })
                      .catch(e => setError(JSON.stringify(e)));
                  }
                });
              });
            })
            .catch(err => {
               // This is an empty account, we can create a voucher for them to pick up
              createVoucher(sendAmount, senderAccountKeyPair, destinationPublicKey)
                .then(([escrowKeyPair, xdr1, xdr2]) => {

                  setVoucher(`escrow ${escrowKeyPair.publicKey()} xdr1 ${xdr1} xdr2 ${xdr2}`);

                  fetch(`${API_URL}/vouchers/create`, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json;charset=utf-8'
                    },
                    body: JSON.stringify({
                      to: destinationEmail,
                      from: email,
                      xdr1,
                      xdr2,
                      escrowAccount: escrowKeyPair.publicKey()
                    })
                  }).then(response => {
                    return response.json().then(body => {
                      if (body.status === 'Succeeded') {
                        setMessage('Voucher created and posted');
                      } else {
                        setError('Failed to post voucher');
                      }
                    }).catch(err => setError(JSON.stringify(err)));

                  }).catch(err => setError(JSON.stringify(err)));
                })
                .catch(e => setError(JSON.stringify(e)));
            });

          } catch (e) {

          }
        } else {
          setError('Failed to join');
        }
      } else {
        setError('Invalid amount');
      }
    } else {
      setError('invalid email');
    }
  };

  const getVouchers = async () => {
    if (validateEmail(email)) {
      const response = await fetch(`${API_URL}/vouchers?email=${email}`);

      const body = await response.json();
      if (body.status === 'Succeeded') {
        setVouchers(body.vouchers);
      } else {
        setError('Failed to get vouchers');
      }
    } else {
      setError('invalid email');
    }
  };

  return (
    <>
      <h3>Message: {message}</h3>
      <h3>Error: {error}</h3>
      <h3>Account[0]: {accounts[0] ? accounts[0].RowKey : null}</h3>
      <h3>Balance: {balance?balance : 0} XLM</h3>
      <h3>Voucher: {voucher}</h3>
      <h3>email: {email}</h3>
      <h3>destination email: {destinationEmail}</h3>
      <h3>send amount: {sendAmount}</h3>
      <hr/>

      Email: <input type="text" name="email" value={email} onChange={(e) => setEmail(e.target.value)}/><br/>
      Destination Email: <input type="text" name="destinationEmail" value={destinationEmail} onChange={(e) => setDestinationEmail(e.target.value)}/><br/>
      Send Amount: <input type="text" name="sendAmount" value={sendAmount} onChange={(e) => setSendAmount(e.target.value)}/><br/>

      <h3>Vouchers</h3>

      <hr/>
      <button onClick={() => login()}>Login</button>
      <button onClick={() => join()}>Join</button>
      <button onClick={() => send()}>Send</button>
      <button onClick={() => getVouchers()}>Vouchers</button>

    </>
  );
}

export default App;
