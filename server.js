require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(bodyParser.json());

app.use(express.static('public'));

const axios = require('axios');

/* 🔐 Spotify Token Route */
app.get('/spotify-token', async (req, res) => {
  try {
    const auth = Buffer.from(
      `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
    ).toString('base64');

    const response = await axios.post(
      'https://accounts.spotify.com/api/token',
      'grant_type=client_credentials',
      {
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    res.json(response.data); // contains access_token
  } catch (error) {
    console.error('Spotify token error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to get Spotify token' });
  }
});



/* 🌦 Weather Proxy Route */
app.get('/weather', async (req, res) => {
  try {
    const location = req.query.q;
    if (!location) {
      return res.status(400).json({ error: 'Location is required' });
    }

    // Step 1: Geocoding
    const geoRes = await axios.get(
      'https://api.openweathermap.org/geo/1.0/direct',
      {
        params: {
          q: location,
          limit: 1,
          appid: process.env.OPENWEATHER_API_KEY
        }
      }
    );

    if (!geoRes.data.length) {
      return res.status(404).json({ error: 'Location not found' });
    }

    const { lat, lon, name, country, state } = geoRes.data[0];

    // Step 2: Weather data
    const weatherRes = await axios.get(
      'https://api.openweathermap.org/data/2.5/weather',
      {
        params: {
          lat,
          lon,
          units: 'metric',
          appid: process.env.OPENWEATHER_API_KEY
        }
      }
    );

    res.json({
      location: `${name}${state ? ', ' + state : ''}, ${country}`,
      weather: weatherRes.data.weather[0].main,
      temp: weatherRes.data.main.temp,
      countryCode: weatherRes.data.sys.country,
      city: name,
      state
    });

  } catch (err) {
    console.error('Weather API Error:', err.message);
    res.status(500).json({ error: 'Failed to fetch weather data' });
  }
});


// ✅ Replace with your MongoDB Atlas connection string
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log("✅ MongoDB connected!"))
  .catch(err => console.log("❌ MongoDB connection error:", err));

// Define schema for feedback
const feedbackSchema = new mongoose.Schema({
  name: String,
  email: String,
  message: String,
  createdAt: { type: Date, default: Date.now }
});

// Create model
const Feedback = mongoose.model('Feedback', feedbackSchema);

// Route to submit feedback
app.post('/feedback', async (req, res) => {
  try {
    const feedback = new Feedback(req.body);
    await feedback.save();
    res.status(201).send({ message: 'Feedback submitted successfully!' });
  } catch (err) {
    res.status(500).send({ error: 'Failed to submit feedback' });
  }
});

// Route to get all feedbacks
app.get('/feedbacks', async (req, res) => {
  try {
    const feedbacks = await Feedback.find().sort({ createdAt: -1 });
    res.json(feedbacks);
  } catch (err) {
    res.status(500).send({ error: 'Failed to fetch feedbacks' });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
