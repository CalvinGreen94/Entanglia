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
import ChatWrapper from './components/ChatWrapper';

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
  token_balance?: number;
  bio?: string;
  chat_token?: string;
  user_id: string;
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
  const [bio, setBio] = useState('');
  const [imageBase64, setImageBase64] = useState('');
  const [userId, setUserId] = useState('');
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(false);
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const { connected, publicKey } = useWallet();
  const [chatToken, setChatToken] = useState('');
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [selectedDestination, setSelectedDestination] = useState('');
  const [selectedDateTime, setSelectedDateTime] = useState('');

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
    if (!walletAddress) {
      alert('Please connect your wallet to continue.');
      return;
    }
    if (!name || !traits || !imageBase64) {
      alert('Please fill in all fields and upload an image.');
      return;
    }

    const traitsArray = traits.trim();

    try {
      const nearby = await fetchNearbyDestinations();
      setDestinations(nearby);

      const response = await axios.post('http://192.168.1.174:8000', {
        jsonrpc: '2.0',
        method: 'register_user',
        params: {
          data: {
            name,
            traits: traitsArray,
            bio,
            image_base64: imageBase64,
            nearby_places: nearby,
            wallet_address: walletAddress,
            pq_signature: 'generated_signature_here'
          },
        },
        id: 1,
      });

      if (response.data?.result?.user_id) {
        setUserId(response.data.result.user_id);
        setChatToken(response.data.result.chat_token);
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
      const response = await axios.post('http://192.168.1.174:8000', {
        jsonrpc: '2.0',
        method: 'get_matches',
        params: { data: { user_id: userId } },
        id: 2,
      });

      if (response.data?.result?.matches) {
        setMatches(response.data.result.matches);
      } else {
        console.error('❌ No matches found:', response.data);
      }
    } catch (err) {
      console.error('❌ Error fetching matches:', err);
    } finally {
      setLoading(false);
    }
  };

  const sendEmoji = (emoji: string) => {
    if (!selectedMatch) return;
    console.log(`Sending ${emoji} to ${selectedMatch.name}`);
    // Future: trigger microtransaction of 0.001 SOL
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
                  Entanglia: The first matchmaking engine blending neural networks, quantum predictions & Solana. Find synergy, not swipes.
                </p>
                <WalletConnectButton />
                <input className="input" placeholder="🧠 Enter Your Quantum Alias" value={name} onChange={(e) => setName(e.target.value)} />
                <input className="input" placeholder="🔢 Describe Yourself (Traits)" value={traits} onChange={(e) => setTraits(e.target.value)} />
                <textarea className="input" placeholder="📝 Add a short bio" value={bio} onChange={(e) => setBio(e.target.value)} />

                <input className="input-file" type="file" accept="image/*" onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onloadend = () => setImageBase64(reader.result as string);
                    reader.readAsDataURL(file);
                  }
                }} />

                {imageBase64 && <img src={imageBase64} alt="Selected" className="preview-img" />}

                <div className="btn-group">
                  <button className="btn" onClick={registerUser}>🚀 Register</button>
                  {userId && (
                    <button className="btn secondary" onClick={getMatches} disabled={loading}>
                      🧬 Find Matches
                    </button>
                  )}
                </div>

                {loading && <div className="loader-container"><div className="spinner"></div></div>}

                <div className="matches">
                  {destinations.length > 0 && (
                    <div className="destinations-card">
                      <h2>📍 Nearby Locations</h2>
                      <select className="input" onChange={(e) => setSelectedDestination(e.target.value)}>
                        <option value="">Select a place</option>
                        {destinations.map((dest, idx) => (
                          <option key={idx} value={dest.name}>{dest.name} ({dest.kind})</option>
                        ))}
                      </select>
                      <input
                        type="datetime-local"
                        className="input"
                        value={selectedDateTime}
                        onChange={(e) => setSelectedDateTime(e.target.value)}
                      />
                    </div>
                  )}

                  {matches.map((match, idx) => (
                    <div key={idx} className="match-card" onClick={() => setSelectedMatch(match)} style={{ cursor: 'pointer' }}>
                      <img src={match.image_url} alt={match.name} className="match-img" />
                      <div className="match-info">
                        <h3>{match.name}</h3>
                        <p>{match.bio}</p>
                        <p>💖 Score: {match.score.toFixed(2)}</p>
                        <p>🤖 AI Contribution: {match.keras_contribution.toFixed(2)}</p>
                        <p>🧠 Quantum Contribution: {match.quantum_contribution.toFixed(2)}</p>
                        <p>🔮 Final Prediction: {match.final_prediction.toFixed(2)}</p>
                        <p>✨ Our matching system uses deep learning and probabilistic quantum models to uncover emergent synergy.</p>
                        {match.match_scenario && <p className="scenario-text">📝 {match.match_scenario}</p>}
                        {match.token_balance !== undefined && match.token_balance < 5 && <p className="warning">⚠️ Unlock full access by holding 5+ ENT tokens</p>}
                        <button onClick={() => sendEmoji("❤️")} className="emoji-btn">❤️ Send Reaction</button>

                        {selectedMatch && chatToken && selectedMatch.user_id === match.user_id && (
                          <div style={{ marginTop: '2rem' }}>
                            <h2>💬 Chat with {selectedMatch.name}</h2>
                            <ChatWrapper
                              currentUserId={userId}
                              currentUserToken={chatToken}
                              otherUserId={selectedMatch.user_id}
                            />
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
