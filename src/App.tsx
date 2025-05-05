import { useState } from 'react';
import axios from 'axios';
import './App.css'; // Make sure this is present

function App() {
  const [name, setName] = useState('');
  const [traits, setTraits] = useState('');
  const [imageBase64, setImageBase64] = useState('');
  const [userId, setUserId] = useState('');
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const registerUser = async () => {
    const response = await axios.post('https://a338-2600-4040-16df-2100-8dce-9d06-7183-7cb4.ngrok-free.app/', {
      jsonrpc: '2.0',
      method: 'register_user',
      params: {
        data: {
          name,
          traits: traits.split(',').map(str => parseFloat(str.trim())),
          image_base64: imageBase64,
        },
      },
      id: 1,
    });
    setUserId(response.data.result.user_id);
    console.log("Registered userId:", response.data.result.user_id);
  };

  const getMatches = async () => {
    setLoading(true);
    try {
      const response = await axios.post('https://a338-2600-4040-16df-2100-8dce-9d06-7183-7cb4.ngrok-free.app/', {
        jsonrpc: '2.0',
        method: 'get_matches',
        params: { data: { user_id: userId } },
        id: 2,
      });
      setMatches(response.data.result.matches);
      console.log("Fetching matches for userId:", userId);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-container">
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
            <button className="btn secondary" onClick={getMatches}>
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
  );
}

export default App;
