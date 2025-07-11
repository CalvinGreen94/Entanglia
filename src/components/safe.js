import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import multer from 'multer';
import FormData from 'form-data';
import { promises as fs } from 'fs';
import path from 'path';
const app = express();
const upload = multer();
const JSON_FILE = path.resolve('C:\\Users\\peace\\desktop\\hope_chain\\Entanglia_swap.json');

app.use(cors());
app.use(express.json());



async function saveMintedToken(mintAddress) {
    try {
      let data = [];
      try {
        const jsonData = await fs.readFile(JSON_FILE, 'utf8');
        data = JSON.parse(jsonData);
      } catch (err) {
        console.log('No existing file found, creating a new one.');
      }
  
      data.push({
        mint: mintAddress,
        timestamp: new Date().toISOString(),
      });
  
      await fs.writeFile(JSON_FILE, JSON.stringify(data, null, 2));
      console.log(`Saved mint address ${mintAddress}`);
    } catch (error) {
      console.error('Error saving mint address:', error);
    }
  }
  
  app.post('/api/save-mint', async (req, res) => {
    const { mint } = req.body;
  
    if (!mint) return res.status(400).json({ error: 'No mint address provided' });
  
    await saveMintedToken(mint);
  
    res.json({ status: 'success', mint });
  });


app.post('/api/trade-local', async (req, res) => {
    try {
      const response = await fetch('https://pumpportal.fun/api/trade-local', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req.body),
      });
  
      if (!response.ok) {
        const text = await response.text();
        return res.status(response.status).send(text);
      }
  
      const buffer = await response.arrayBuffer();
      res.set('Content-Type', 'application/octet-stream');
      res.send(Buffer.from(buffer));
    } catch (error) {
      console.error('Proxy error:', error);
      res.status(500).json({ error: 'Proxy error' });
    }
  });
  
// Proxy /api/ipfs POST (multipart/form-data)
app.post('/api/ipfs', upload.single('file'), async (req, res) => {
  try {
    const { file, body } = req;

    // Create form-data to forward
    const formData = new FormData();

    // Append file
    formData.append('file', file.buffer, file.originalname);

    // Append all other fields from req.body
    for (const key in body) {
      formData.append(key, body[key]);
    }

    // Forward to pump.fun api
    const response = await fetch('https://pump.fun/api/ipfs', {
      method: 'POST',
      headers: formData.getHeaders(),  // Important to set correct headers
      body: formData,
    });

    if (!response.ok) {
      const text = await response.text();
      return res.status(response.status).send(text);
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Proxy error:', error);
    res.status(500).json({ error: 'Proxy error' });
  }
});

app.listen(3001, () => console.log('Proxy running on port 3001'));
