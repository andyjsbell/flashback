
import StellarSdk from 'stellar-sdk';
import {createVoucher} from "./voucher";

it('should create voucher', async () => {
  jest.setTimeout(30000);
  const [escrowKeyPair, xdr_1, xdr_2] = await createVoucher('8000');
  console.log(escrowKeyPair.publicKey());
  console.log(escrowKeyPair.secret());
  console.log(xdr_1);
  console.log(xdr_2);
});
