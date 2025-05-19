import React from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

interface WalletConnectButtonProps {}

const WalletConnectButton: React.FC<WalletConnectButtonProps> = () => {
  const { connected, publicKey, disconnect } = useWallet();

  console.log('Wallet connected?', connected);
  console.log('Public Key:', publicKey ? publicKey.toBase58() : 'Not connected');

  return (
    <div className="wallet-connect" style={{ margin: '20px' }}>
      {!connected ? (
        <WalletMultiButton />
      ) : (
        <div>
          <p>Wallet connected: {publicKey?.toBase58()}</p>
          <button onClick={() => disconnect()}>Disconnect Wallet</button>
        </div>
      )}
    </div>
  );
};

export default WalletConnectButton;
