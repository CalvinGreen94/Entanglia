import { useState } from 'react';
import axios from 'axios';
import './App.css'; // CSS styles
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import '@solana/wallet-adapter-react-ui/styles.css';
import { BrowserRouter as Router } from 'react-router-dom';
import WalletConnectButton from './components/connectWallet';
import { useWallet } from '@solana/wallet-adapter-react';

const wallets = [new SolflareWalletAdapter(), new PhantomWalletAdapter()];

interface Match {
  image_url: string;
  name: string;
  score: number;
  keras_contribution: number;
  quantum_contribution: number;
  final_prediction: number;
  match_scenario?: string;
}

function App() {
  const [name, setName] = useState('');
  const [traits, setTraits] = useState('');
  const [imageBase64, setImageBase64] = useState('');
  const [userId, setUserId] = useState('');
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(false);
  const { connected, publicKey} = useWallet();

  const registerUser = async () => {
    try {
      // Parse traits safely - convert to number array, filter out NaNs
      // const parsedTraits = traits
      //   .split(',')
      //   .map(str => parseFloat(str.trim()))
      //   .filter(num => !isNaN(num));
      
      console.log('Wallet connected?', connected);
      console.log('Public Key:', publicKey ? publicKey.toBase58() : 'Not connected');
      const response = await axios.post('http://0.0.0.0:8000/', {
        jsonrpc: '2.0',
        method: 'register_user',
        params: {
          data: {
            // wallet_address:{publicKey},
            name,
            traits: traits.split(',').map(str => parseFloat(str.trim())),
            image_base64: imageBase64,
          },
        },
        id: 1,
      });
      if (response.data?.result?.user_id) {
        setUserId(response.data.result.user_id);
        console.log("Registered userId:", response.data.result.user_id);
      } else {
        console.error('Failed to register user: invalid response', response.data);
      }
    } catch (error) {
      console.error('Error registering user:', error);
    }
  };

  const getMatches = async () => {
    if (!userId) {
      console.warn('No userId, cannot fetch matches');
      return;
    }
    setLoading(true);
    try {
      const response = await axios.post('http://0.0.0.0:8000/', {
        jsonrpc: '2.0',
        method: 'get_matches',
        params: { data: { user_id: userId } },
        id: 2,
      });

      if (response.data?.result?.matches) {
        setMatches(response.data.result.matches);
        console.log("Fetched matches for userId:", userId);
      } else {
        console.error('Failed to fetch matches: invalid response', response.data);
      }
    } catch (err) {
      console.error('Error fetching matches:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Router>
      <ConnectionProvider endpoint="https://api.mainnet-beta.solana.com">
        <WalletProvider
          wallets={wallets}
          autoConnect
          onError={(err) => console.error('Wallet error', err)}
        >
          <WalletModalProvider>
            <div className="app-container">
            <WalletConnectButton/>

              <div className="glass-card">
                <h1 className="app-title">ENTANGLIA 💫</h1>

                <input
                  className="input"
                  placeholder="🧠 Enter Your Quantum Alias"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />

                <input
                  className="input"
                  placeholder="🔢 Traits (comma-separated numbers)"
                  value={traits}
                  onChange={(e) => setTraits(e.target.value)}
                />

                <input
                  className="input-file"
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onloadend = () => setImageBase64(reader.result as string);
                      reader.readAsDataURL(file);
                    }
                  }}
                />

                {imageBase64 && (
                  <img src={imageBase64} alt="Selected" className="preview-img" />
                )}

                <div className="btn-group">
                  <button className="btn" onClick={registerUser}>
                    🚀 Register
                  </button>
                  {userId && (
                    <button className="btn secondary" onClick={getMatches} disabled={loading}>
                      🧬 Find Matches
                    </button>
                  )}
                </div>

                {loading && (
                  <div className="loader-container">
                    <div className="spinner"></div>
                  </div>
                )}

                <div className="matches">
                  {matches.map((match, idx) => (
                    <div key={idx} className="match-card">
                      <img src={match.image_url} alt={match.name} className="match-img" />
                      <div>
                        <h3>{match.name}</h3>
                        <p>💖 Score: {match.score.toFixed(2)}</p>
                        <p>💖 AI model Contribution: {match.keras_contribution.toFixed(2)}</p>
                        <p>💖 Quantum model Contribution: {match.quantum_contribution.toFixed(2)}</p>
                        <p>💖 Final Prediction: {match.final_prediction.toFixed(2)}</p>
                        {match.match_scenario && (
                          <div className="match-scenario">
                            <h4>Scenario:</h4>
                            <p>{match.match_scenario}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </WalletModalProvider>
        </WalletProvider>
      </ConnectionProvider>
    </Router>
  );
}

export default App;
