import { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import '@solana/wallet-adapter-react-ui/styles.css';
import { BrowserRouter as Router } from 'react-router-dom';
import WalletConnectButton from './components/connectWallet';
import { useWallet } from '@solana/wallet-adapter-react';
// import { useWallet } from '@solana/wallet-adapter-react';

const wallets = [new SolflareWalletAdapter(), new PhantomWalletAdapter()];

interface Match {
  image_url: string;
  name: string;
  public_key: string;
  score: number;
  keras_contribution: number;
  quantum_contribution: number;
  final_prediction: number;
  match_scenario?: string;
  pq_signature?: string;
  token_balance?: string;
  bio?:string;
  // quantum_metadata?: {
  //   signature_valid?: boolean;
  //   timestamp?: string;
  //   // additional_info?: string;
  // };
}

interface Destination {
  name: string;
  kind: string;
  lat: number;
  lon: number;
}

function App() {
  const [name, setName] = useState('');
  const [traits, setTraits] = useState('');
  const [imageBase64, setImageBase64] = useState('');
  const [userId, setUserId] = useState('');
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(false);
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const { connected, publicKey } = useWallet();

  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  console.log('Wallet connected?', connected);
  console.log('Public Key:', publicKey ? publicKey.toBase58() : 'Not connected');
  useEffect(() => {
    if (publicKey) {
      setWalletAddress(publicKey.toBase58());
    } else {
      setWalletAddress(null);
    }
  }, [publicKey]);
  const fetchNearbyDestinations = async (): Promise<Destination[]> => {
    try {
      const geoResponse = await axios.get('https://ipgeolocation.abstractapi.com/v1/?api_key=4a3be91d576f4c68aef4223a52eaa8ae');
      const { latitude, longitude } = geoResponse.data;

      const overpassQuery = `
        [out:json];
        (
          node(around:2000,${latitude},${longitude})[amenity~"restaurant|cafe|bar"];
          node(around:2000,${latitude},${longitude})[tourism~"museum|gallery|attraction"];
          node(around:2000,${latitude},${longitude})[leisure=park];
        );
        out body;
      `;

      const overpassResponse = await axios.post(
        'https://overpass-api.de/api/interpreter',
        new URLSearchParams({ data: overpassQuery }),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
      );

      const extracted = overpassResponse.data.elements
        .filter((el: any) => el.tags?.name)
        .map((el: any) => ({
          name: el.tags.name,
          kind: el.tags.amenity || el.tags.tourism || el.tags.leisure || 'unknown',
          lat: el.lat,
          lon: el.lon,
        }));

      return extracted;
    } catch (error) {
      console.error('Geolocation or Overpass API failed:', error);
      return [];
    }
  };

  const registerUser = async () => {
    if (!name || !traits || !imageBase64) {
      // if (!walletAddress) {
      //   alert('Please connect your wallet first.');
      //   return;
      // }
      // alert('Please fill in all fields and upload an image.');
      // return;
    }

    const traitsArray = traits.trim();

    try {
      const nearby = await fetchNearbyDestinations();
      setDestinations(nearby);

      const response = await axios.post('https://7c67-2600-4040-15d1-f600-24ce-8055-707e-4390.ngrok-free.app', {
        jsonrpc: '2.0',
        method: 'register_user',
        params: {
          data: {
            name,
            traits: traitsArray,
            image_base64: imageBase64,
            nearby_places: nearby,
            wallet_address: walletAddress,

          },
        },
        id: 1,
      });

      if (response.data?.result?.user_id) {
        setUserId(response.data.result.user_id);
        console.log("✅ Registered userId:", response.data.result.user_id);
      } else {
        console.error('❌ Failed to register user:', response.data);
      }
    } catch (err) {
      console.error('❌ Error during registration:', err);
    }
  };

  const getMatches = async () => {
    if (!userId) {
      alert('Please register first.');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post('https://7c67-2600-4040-15d1-f600-24ce-8055-707e-4390.ngrok-free.app', {
        jsonrpc: '2.0',
        method: 'get_matches',
        params: { data: { user_id: userId } },
        id: 2,
      });

      if (response.data?.result?.matches) {
        setMatches(response.data.result.matches);
        console.log("🧬 Matches fetched.");
      } else {
        console.error('❌ No matches found:', response.data);
      }
    } catch (err) {
      console.error('❌ Error fetching matches:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Router>
      <ConnectionProvider endpoint="https://api.mainnet-beta.solana.com">
        <WalletProvider wallets={wallets} autoConnect>
          <WalletModalProvider>
            <div className="app-container">


              <div className="glass-card">
                <h1 className="app-title">ENTANGLIA 💫</h1>
                <p className="app-description">
                  Welcome to the ENTANGLIA MVP:<strong>Entanglia</strong> is a neural matchmaking engine powered by quantum entanglement, Deep Learning, and Solana. <br />
                  🧠 Upload your Age, an Image of yourself, connect your wallet, and get matched with others in real-time. <br />
                  🌐 No personal data stored — only encrypted signatures and emergent predictions.
                </p>
                <WalletConnectButton />
                <input className="input" placeholder="🧠 Enter Your Quantum Alias" value={name} onChange={(e) => setName(e.target.value)} />
                <input className="input" placeholder="🔢 Traits (comma-separated numbers)" value={traits} onChange={(e) => setTraits(e.target.value)} />

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

                {imageBase64 && <img src={imageBase64} alt="Selected" className="preview-img" />}

                <div className="btn-group">
                  <button className="btn" onClick={registerUser}>🚀 Register</button>
                  {userId && <button className="btn secondary" onClick={getMatches} disabled={loading}>🧬 Find Matches</button>}
                </div>

                {loading && <div className="loader-container"><div className="spinner"></div></div>}

                <div className="matches">
                  {destinations.length > 0 && (
                    <div className="destinations-card">
                      <h2>📍 Nearby Locations</h2>
                      <ul className="destinations-list">
                        {destinations.map((dest, idx) => (
                          <li key={idx}>
                            <span className="dest-name">{dest.name}</span>
                            <span className="dest-kind">({dest.kind})</span>
                            <span className="dest-coords">
                              {dest.lat.toFixed(2)}, {dest.lon.toFixed(2)}
                              <a
                                href={`https://www.google.com/maps?q=${dest.lat},${dest.lon}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="dest-name"
                              >
                                {dest.name}
                              </a>
                            </span>
                          </li>
                        ))}
                      </ul>

                    </div>
                  )}
                  {matches.map((match, idx) => (
                    <div key={idx} className="match-card">
                      <img
                        src={match.image_url}
                        alt={match.name}
                        className="match-img"
                      />

                      {/* Entanglia Balance: {match.token_balance}

                      {/* <h3>QUANTUM SAFE PUBLIC KEY: {match.public_key}</h3>
                      // Entanglia Balance: {match.token_balance}

                      {match.pq_signature && (
                        <p>🔐 Verified Signature: <code>{match.pq_signature}</code></p>
                      )} */}

                      <div className="match-info">
                        <p>User Information: {match.bio}</p>
                        <h3>{match.name}</h3>
                        <p>💖 Score: {match.score.toFixed(2)}</p>
                        <p>🤖 AI Contribution: {match.keras_contribution.toFixed(2)}</p>
                        <p>🧠 Quantum Contribution: {match.quantum_contribution.toFixed(2)}</p>
                        <p>🔮 Final Prediction: {match.final_prediction.toFixed(2)}</p>
                        {match.match_scenario && (
                          <p className="scenario-text">📝 {match.match_scenario}</p>
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
