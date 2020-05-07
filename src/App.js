import React, {useState} from 'react';
import logo from './logo.svg';
import './App.css';
import StellarSdk from 'stellar-sdk';

function App() {
  const [publicKey, setPublicKey] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const createAccount = async () => {

      if (!email)
        return;

      const pair = StellarSdk.Keypair.random();
      setPublicKey(pair.publicKey());
      setSecretKey(pair.secret());

      const newAccount = {
        email,
        publicKey: pair.publicKey()
      };

      const response = await fetch('http://localhost:7071/api/accounts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json;charset=utf-8'
        },
        body: JSON.stringify(newAccount)
      });

      const body = await response.json();

      if (body.status === "Succeeded") {
        setMessage('Account created');
      } else {
        setError(body.message);
      }
  };

  return (
    <>
        <h3>{message}</h3>
        <h3>{error}</h3>
        <h3>Public key: {publicKey}</h3>
        <h3>Secret key: {secretKey}</h3>
        <input type="text" name="email" value={email} onChange={(e) => setEmail(e.target.value)}/>
        <button onClick={() => createAccount()}>Create Account</button>
    </>
  );
}

export default App;
