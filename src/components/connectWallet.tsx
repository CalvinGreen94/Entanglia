import React, { useState } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { PublicKey, Keypair } from '@solana/web3.js';
import '@solana/wallet-adapter-react-ui/styles.css';
import {  SystemProgram } from "@solana/web3.js";
import { createAssociatedTokenAccountInstruction, TOKEN_PROGRAM_ID, getAssociatedTokenAddress } from "@solana/spl-token";
import { TransactionMessage, VersionedTransaction } from '@solana/web3.js';
import {
  createInitializeMintInstruction,
  getMinimumBalanceForRentExemptMint,
  MINT_SIZE,
} from "@solana/spl-token";
import {  createMintToInstruction } from '@solana/spl-token';

interface CreateTokenParams {
  connection: any;
  sendTransaction: (transaction: VersionedTransaction, connection: any, options: { signers: [] }) => Promise<string>;
  publicKey: PublicKey;
  imageFile: File;
  name: string;
  symbol: string;
  description: string;
  twitter: string;
  telegram: string;
  website?: string;
}

export async function sendLocalCreateTx({
  connection,
  sendTransaction,
  publicKey,
  imageFile,
  name,
  symbol,
  description,
  twitter,
  telegram,
  website,
}: CreateTokenParams): Promise<string | null> {
  try {
    const mintKeypair = Keypair.generate();
    const mint = mintKeypair.publicKey;

    // STEP 1: Create Mint Account on-chain
    const lamports = await getMinimumBalanceForRentExemptMint(connection);

    const createMintAccountIx = SystemProgram.createAccount({
      fromPubkey: publicKey,
      newAccountPubkey: mint,
      space: MINT_SIZE,
      lamports,
      programId: TOKEN_PROGRAM_ID,
    });

    const initMintIx = createInitializeMintInstruction(
      mint,
      9, // decimals
      publicKey, // mint authority
      publicKey // freeze authority
    );

    // STEP 2: Create the ATA
    const ata = await getAssociatedTokenAddress(mint, publicKey);
    const ataIx = createAssociatedTokenAccountInstruction(
      publicKey, // payer
      ata,
      publicKey, // owner
      mint
    );
    const mintAmount = 1_000_000_000; // This will mint 1 token (because of 9 decimals)
    // STEP 3: Send transaction to create mint + initialize + create ATA
    const mintToIx = createMintToInstruction(
      mint, // Mint address
      ata, // Destination (your ATA)
      publicKey, // Authority who is allowed to mint
      mintAmount, // Amount to mint (adjust for decimals)
    );


    const blockhash = (await connection.getLatestBlockhash()).blockhash;
    const messageV0 = new TransactionMessage({
      payerKey: publicKey,
      recentBlockhash: blockhash,
      instructions: [createMintAccountIx, initMintIx, ataIx],
    }).compileToV0Message();

    const tx = new VersionedTransaction(messageV0);
    tx.sign([mintKeypair]); // Mint account must sign

    const sig = await sendTransaction(tx, connection, { signers: [] });
    console.log("✅ Mint & ATA Created: https://solscan.io/tx/" + sig);
    // Add this instruction into your first transaction (preferred) or send it in a new one:
    const messageWithMint = new TransactionMessage({
      payerKey: publicKey,
      recentBlockhash: blockhash,
      instructions: [
        createMintAccountIx,
        initMintIx,
        ataIx,
        mintToIx, // Mint tokens
      ],
    }).compileToV0Message();

    const txWithMint = new VersionedTransaction(messageWithMint);
    txWithMint.sign([mintKeypair]); // Mint account must sign

    const signatureWithMint = await sendTransaction(txWithMint, connection, { signers: [] });
    console.log("✅ Minted tokens! Check: https://solscan.io/tx/" + signatureWithMint);
    // STEP 4: Upload Metadata (no changes)
    const formData = new FormData();
    formData.append('file', imageFile);
    formData.append('name', name);
    formData.append('symbol', symbol);
    formData.append('description', description);
    formData.append('twitter', twitter);
    formData.append('telegram', telegram);
    formData.append('website', website || `https://solscan.io/account/${mint.toBase58()}`);
    formData.append('showName', 'true');

    const metadataResponse = await fetch('http://localhost:3001/api/ipfs', { method: 'POST', body: formData });
    const metadataResponseJSON = await metadataResponse.json();

    // STEP 5: Mint the token (no changes)
    const createResponse = await fetch('http://localhost:3001/api/trade-local', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        publicKey: publicKey.toBase58(),
        action: 'create',
        tokenMetadata: {
          name: metadataResponseJSON.metadata.name,
          symbol: metadataResponseJSON.metadata.symbol,
          uri: metadataResponseJSON.metadataUri,
        },
        mint: mint.toBase58(),
        denominatedInSol: 'true',
        amount: 0.2,
        slippage: 2,
        priorityFee: 0.0005,
        pool: 'auto',
      }),
    });

    if (!createResponse.ok) throw new Error(`Mint failed: ${createResponse.statusText}`);

    const createTxBytes = new Uint8Array(await createResponse.arrayBuffer());
    const createTx = VersionedTransaction.deserialize(createTxBytes);
    createTx.sign([mintKeypair]);

    const createSig = await sendTransaction(createTx, connection, { signers: [] });
    console.log('✅ Minted Token: https://solscan.io/tx/' + createSig);

    // STEP 6: Sell 10% (no changes)
    const sellResponse = await fetch(`https://pumpportal.fun/api/trade-local`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        publicKey: publicKey.toBase58(),
        action: 'sell',
        mint: mint.toBase58(),
        denominatedInSol: 'false',
        amount: '10%',
        slippage: 2,
        priorityFee: 0.000005,
        pool: 'auto',
      }),
    });

    if (!sellResponse.ok) throw new Error(`Sell failed: ${sellResponse.statusText}`);

    const sellTxBytes = new Uint8Array(await sellResponse.arrayBuffer());
    const sellTx = VersionedTransaction.deserialize(sellTxBytes);
    const sellSig = await sendTransaction(sellTx, connection, { signers: [] });

    console.log('✅ Sold Tokens: https://solscan.io/tx/' + sellSig);

    await fetch('http://localhost:3001/api/save-mint', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mint: mint.toBase58() }),
    });

    return mint.toBase58();
  } catch (error) {
    console.error('❌ Token creation failed:', error);
    return null;
  }
}


const WalletConnectButton: React.FC = () => {
  const { connection } = useConnection();
  const { connected, publicKey, disconnect, sendTransaction } = useWallet();

  const [tokenName, setTokenName] = useState('');
  const [tokenSymbol, setTokenSymbol] = useState('');
  const [tokenDescription, setTokenDescription] = useState('');
  const [tokenTwitter, setTokenTwitter] = useState('');
  const [tokenTelegram, setTokenTelegram] = useState('');
  const [tokenWebsite, setTokenWebsite] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);

  const handleCreate = async () => {
    if (!imageFile || !publicKey) {
      alert('Please select an image and connect your wallet');
      return;
    }

    const mintAddress = await sendLocalCreateTx({
      connection,
      sendTransaction,
      publicKey,
      imageFile,
      name: tokenName,
      symbol: tokenSymbol,
      description: tokenDescription,
      twitter: tokenTwitter,
      telegram: tokenTelegram,
      website: tokenWebsite,
    });

    console.log('Minted Token Address:', mintAddress);
  };

  return (
    <div className="wallet-connect" style={{ margin: '20px' }}>
      <WalletMultiButton />

      {connected ? (
        <div className="token-card">
          <h2>Mint Your Token</h2>

          <input className="input" placeholder="Token Name" value={tokenName} onChange={(e) => setTokenName(e.target.value)} />
          <input className="input" placeholder="Token Symbol" value={tokenSymbol} onChange={(e) => setTokenSymbol(e.target.value)} />
          <textarea className="input" placeholder="Token Description" value={tokenDescription} onChange={(e) => setTokenDescription(e.target.value)} />
          <input className="input" placeholder="Twitter" value={tokenTwitter} onChange={(e) => setTokenTwitter(e.target.value)} />
          <input className="input" placeholder="Telegram" value={tokenTelegram} onChange={(e) => setTokenTelegram(e.target.value)} />
          <input className="input" placeholder="Website (optional)" value={tokenWebsite} onChange={(e) => setTokenWebsite(e.target.value)} />

          <input className="input-file" type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] || null)} />

          <button className="btn" onClick={handleCreate}>🪙 Mint Token</button>

          <button className="btn" onClick={() => disconnect()}>Disconnect Wallet</button>
        </div>
      ) : (
        <p>Please connect your wallet to mint a token.</p>
      )}
    </div>
  );
};

export default WalletConnectButton;
