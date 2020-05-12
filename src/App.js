import React, {useState} from 'react';
import './App.css';
import StellarSdk from 'stellar-sdk';
import {validateEmail} from "../serverless/emails";
import {createVoucher} from "./voucher";

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

  const login = async () => {
    if (validateEmail(email)) {
      const response = await fetch(`${API_URL}/accounts/login`, {
        method: 'POST'
      });

      const body = await response.json();
      if (body.status === 'Succeeded') {
        setAccounts(body.accounts);
      } else {
        setError('Failed to login');
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
      const response = await fetch(`${API_URL}/accounts/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json;charset=utf-8'
        },
        body: JSON.stringify(email)
      });

      const body = await response.json();
      if (body.status === 'Succeeded') {
        setAccounts([body.account]);
      } else {
        setError('Failed to join');
      }
    } else {
      setError('invalid email');
    }
  };

  const send = async () => {
    if (validateEmail(destinationEmail) && parseInt(sendAmount) > 0) {
      const response = await fetch(`${API_URL}/accounts/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json;charset=utf-8'
        },
        body: JSON.stringify(destinationEmail)
      });

      const body = await response.json();
      if (body.status === 'Succeeded') {
        const publicKey = body.publicKey;
        // Default to send to first account
        const server = new StellarSdk.Server('https://horizon-testnet.stellar.org');
        const senderAccountKeyPair = StellarSdk.Keypair.fromSecret(accounts[0].Secret);

        try {
          // Will throw error if account doesn't exist
          server.loadAccount(publicKey)
          .then(destinationAccount => {
            // Send payment directly

            return server.loadAccount(senderAccountKeyPair.publicKey()).then(senderAccount => {

              server.fetchBaseFee().then(fee => {

                const transaction = new StellarSdk.TransactionBuilder(senderAccount, {
                  fee, networkPassphrase: StellarSdk.Networks.TESTNET
                })
                .addOperation(StellarSdk.Operation.payment({
                  destination: destinationAccount.publicKey(),
                  amount:sendAmount,
                  asset: StellarSdk.Asset.native()
                }));

                transaction.sign(senderAccountKeyPair);

                return server.submitTransaction(transaction)
                  .then(tx => {setMessage(tx)})
                  .catch(e=>setError(e));

              });
            });
          })
          .catch(err => {
             // This is an empty account, we can create a voucher for them to pick up
            createVoucher(sendAmount, senderAccountKeyPair, publicKey)
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
                  }).catch(err => setError(err));

                }).catch(err => setError(err));
              })
              .catch(e => setError(e));
          });

        } catch (e) {

        }
      } else {
        setError('Failed to join');
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
      <h3>Voucher: {voucher}</h3>
      <h3>email: {email}</h3>
      <h3>destination email: {destinationEmail}</h3>
      <h3>send amount: {sendAmount}</h3>

      <input type="text" name="email" value={email} onChange={(e) => setEmail(e.target.value)}/>
      <input type="text" name="destinationEmail" value={destinationEmail} onChange={(e) => setDestinationEmail(e.target.value)}/>
      <input type="text" name="sendAmount" value={sendAmount} onChange={(e) => setSendAmount(e.target.value)}/>

      <h3>Vouchers</h3>

      <button onClick={() => login()}>Login</button>
      <button onClick={() => join()}>Join</button>
      <button onClick={() => send()}>Send</button>
      <button onClick={() => getVouchers()}>Vouchers</button>

    </>
  );
}

export default App;
