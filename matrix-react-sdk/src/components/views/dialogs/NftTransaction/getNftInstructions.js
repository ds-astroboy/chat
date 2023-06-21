import { Token, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { PublicKey } from '@solana/web3.js';
import { findAssociatedTokenAccountPublicKey } from './associatedAccounts';
// import { connection } from './connection';
// import { sendTxUsingExternalSignature } from './externalWallet';
import { getOrCreateAssociatedAccount } from './getOrCreateAssociatedAccount';

export const getNftInstructions = async (
    owner,
    dest,
    token,
    amount,
    payer,
    connection
) => {
    const ownerPub = new PublicKey(owner);
    const tokenPub = new PublicKey(token);
    const destPub = new PublicKey(dest);

    const [tokenAssociatedAddress, ix2] = await getOrCreateAssociatedAccount(
        destPub,
        tokenPub,
        payer.toString(),
        connection
    )

    //ASSUMING THAT BOTH OWNER AND DESTINATION HAS AN ACCOUNT ASSOCIATED
    //Finding Associated Account of owner
    const assOwnerAccount = await findAssociatedTokenAccountPublicKey(ownerPub, tokenPub);

    // //Finding the Asscociated Account of destination
    const assDestAccount = await findAssociatedTokenAccountPublicKey(destPub, tokenPub);

    if (tokenAssociatedAddress) tokenAssociatedAddress !== assDestAccount && console.log(false);

    const ix = Token.createTransferInstruction(
        TOKEN_PROGRAM_ID, //PROGRAM_ID
        assOwnerAccount, //Associated Owner Account
        assDestAccount, //Associated Destination Account
        ownerPub, //Owner
        [], //multisigners
        amount //Amount
    );
    if(ix2) {
        return [ix2, ix]
    }
    else return [ix];
}