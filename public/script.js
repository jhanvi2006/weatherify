const apiKey = '1e9f94f422699eace18ec7b80a3ec3ba';

const fallbackPlaylists = {
  IN: "37i9dQZF1DXdPec7aLTmlC",
  US: "37i9dQZF1DXcBWIGoYBM5M",
  GB: "37i9dQZF1DWXRqgorJj26U",
  PK: "37i9dQZF1DWXT8uSSn6PRy",
  DE: "37i9dQZF1DWVu0D7Y8cYcs",
  FR: "37i9dQZF1DWVpqa2Yvsf0U",
  default: "37i9dQZF1DXcBWIGoYBM5M"
};

let playlistResults = [];
let currentPlaylistIndex = 0;
let lastState = { location: "", weather: "", temp: "", countryCode: "" };

async function getWeather() {
  const location = document.getElementById('location').value.trim();
  const resultDiv = document.getElementById('result');
  const iconContainer = document.getElementById("weather-icon");
  const spinner = document.getElementById("loading-spinner");
  const nextBtn = document.getElementById("next-playlist-btn");

  resultDiv.innerHTML = "";
  iconContainer.innerHTML = "";
  spinner.style.display = 'block';
  nextBtn.style.display = 'none';

  try {
    // 🔹 Step 1: Convert user input (city/state/country) to lat+lon
    const geoRes = await fetch(
      `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(location)}&limit=1&appid=${apiKey}`
    );
    const geoData = await geoRes.json();
    if (!geoData.length) throw new Error("Location not found");

    const { lat, lon, country, name, state } = geoData[0];

    // 🔹 Step 2: Fetch weather using lat+lon
    const res = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`
    );
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Weather API Error");

    const weather = data.weather[0].main;
    const temp = data.main.temp;
    const countryCode = data.sys.country;
    const countryName = getCountryName(countryCode);
    //const language = getMusicLanguage(countryCode, state, name);
    const token = await getSpotifyToken();

    // Save state for rendering
    lastState = { 
      location: `${name}${state ? ", " + state : ""}, ${country}`, 
      weather, 
      temp, 
      countryCode,
      state,
      city: name
    };

    setBackground(weather);

    const iconAnimation = getLottieAnimation(weather);
    lottie.loadAnimation({
      container: iconContainer,
      renderer: "svg",
      loop: true,
      autoplay: true,
      path: iconAnimation
    });

    // 🔹 Step 3: Build queries for Spotify
    const queries = [];
    const languages = getMusicLanguages(countryCode, state, name);

    mapWeatherToSearchTerm(weather).forEach(keyword => {
      languages.forEach(lang => {
        queries.push(`${keyword} ${lang}`);
      });
    });

// Also trending lists


    queries.push(`Top 50 ${countryName}`, "Top Global");

    // 🔹 Step 4: Fetch Spotify playlists
    playlistResults = [];
    for (const q of queries) {
      const results = await searchSpotifyPlaylists(q, token);
      playlistResults.push(...results);
    }

    playlistResults = [...new Map(playlistResults.filter(Boolean).map(p => [p.id, p])).values()];
    currentPlaylistIndex = 0;

    renderPlaylist();

  } catch (err) {
    console.error("❌ Error:", err);
    resultDiv.innerHTML = `❌ Error: ${err.message}`;
  } finally {
    spinner.style.display = 'none';
  }
}


function renderPlaylist() {
  const resultDiv = document.getElementById('result');
  const infoDiv = document.getElementById('weather-info');
  const nextBtn = document.getElementById("next-playlist-btn");
  const { location, weather, temp, countryCode } = lastState;

  const fallbackId = fallbackPlaylists[countryCode] || fallbackPlaylists.default;
  const playlist = playlistResults[currentPlaylistIndex] || null;

  const embed = playlist
    ? `<iframe src="https://open.spotify.com/embed/playlist/${playlist.id}" width="100%" height="380" frameborder="0" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy"></iframe>`
    : `<iframe src="https://open.spotify.com/embed/playlist/${fallbackId}" width="100%" height="380" frameborder="0" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy"></iframe>`;

  const header = playlist
    ? "Spotify Playlist:"
    : `Fallback Playlist (Top Songs in ${getCountryName(countryCode)})`;

  infoDiv.innerHTML = `
    <h3>Weather in ${location}: ${weather} (${temp}°C)</h3>
    <h4>${header}</h4>
  `;

  resultDiv.innerHTML = embed;

  nextBtn.style.display = playlistResults.length > 1 ? "inline-block" : "none";

  
document.getElementById("main-container").classList.remove("single-column");
document.getElementById("spotify-column").classList.add("visible");



}



function showNextPlaylist() {
  if (!playlistResults.length) return;
  currentPlaylistIndex = (currentPlaylistIndex + 1) % playlistResults.length;
  renderPlaylist();
}

async function getSpotifyToken() {
  const res = await fetch('/spotify-token');
  const data = await res.json();
  return data.access_token;
}

async function searchSpotifyPlaylists(query, token) {
  try {
    const res = await fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=playlist&limit=3`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const data = await res.json();
    return data.playlists?.items || [];
  } catch (err) {
    console.error("Spotify Search Error:", err);
    return [];
  }
}

function setBackground(weather) {
  const backgrounds = {
    Clear: 'images/clearsky.jpg',
    Sunny: 'images/clearsky.jpg',
    Rain: 'images/rain.jpg',
    Clouds: 'images/cloudy.jpg',
    Snow: 'images/snow.jpg',
    Thunderstorm: 'images/thunder.jpg',
    Drizzle: 'images/drizzle.jpg',
    Mist: 'images/mist.jpg'
  };
  document.body.style.backgroundImage = `url('${backgrounds[weather] || 'images/default.jpg'}')`;
}

function getLottieAnimation(weather) {
  const animations = {
    Clear: "https://lottie.host/05e5bd18-f10e-4dd4-8f02-d04c186dd8d3/yvPvUL29EH.json",
    Rain: "https://lottie.host/4a3bb1fa-9e00-4e94-9700-1394ec3e1fc7/0YKmtdlyRv.json",
    Clouds: "https://lottie.host/290fcaf2-1de9-4974-a66c-30349126c9de/jmhDGoxZt2.json",
    Snow: "https://lottie.host/1cd5d7bc-3dc9-4269-b9b3-bd0c7686c964/6dDrpyLku6.json",
    Thunderstorm: "https://lottie.host/05f93a8a-0ec2-4f75-9b2e-6e2b5db1dc70/EhO94FmjM9.json",
    Drizzle: "https://lottie.host/64d2a3c3-514d-41d7-bc80-e0f8f3cb35ef/lEnPh6PV5e.json",
    Mist: "https://lottie.host/b1545048-7b38-4fa1-8641-bc62377d793e/KyOxVzCrJl.json"
  };
  return animations[weather] || animations.Clear;
}

function getCountryName(code) {
  const countries = {
    IN: "India", US: "USA", GB: "UK", CA: "Canada",
    DE: "Germany", FR: "France", PK: "Pakistan"
  };
  return countries[code] || code;
}

function getMusicLanguages(code, state = "", city = "") {
  state = state.toLowerCase();
  city = city.toLowerCase();

  // 🔹 India regional + Hindi + English
  if (code === "IN") {
    if (state.includes("punjab") || city.includes("amritsar") || city.includes("ludhiana")) {
      return ["Punjabi", "Hindi", "English"];
    }
    if (state.includes("maharashtra") || city.includes("mumbai") || city.includes("pune")) {
      return ["Marathi", "Hindi", "English"];
    }
    if (state.includes("west bengal") || city.includes("kolkata")) {
      return ["Bengali", "Hindi", "English"];
    }
    if (state.includes("tamil nadu") || city.includes("chennai")) {
      return ["Tamil", "Hindi", "English"];
    }
    if (state.includes("kerala") || city.includes("kochi")) {
      return ["Malayalam", "Hindi", "English"];
    }
    if (state.includes("karnataka") || city.includes("bengaluru")) {
      return ["Kannada", "Hindi", "English"];
    }
    return ["Hindi", "English"];
  }

  // 🔹 Pakistan regional + Urdu + English
  if (code === "PK") {
    if (state.includes("punjab") || city.includes("lahore")) {
      return ["Punjabi", "Urdu", "English"];
    }
    if (city.includes("karachi") || state.includes("sindh")) {
      return ["Sindhi", "Urdu", "English"];
    }
    return ["Urdu", "English"];
  }

  // 🔹 Other countries (always include English too)
  const langMap = {
    US: ["English"],
    GB: ["English"],
    CA: ["English"],
    DE: ["German", "English"],
    FR: ["French", "English"],
    ES: ["Spanish", "English"],
    JP: ["Japanese", "English"],
    KR: ["K-Pop", "English"],
    BR: ["Brazilian", "English"],
    IT: ["Italian", "English"]
  };
  return langMap[code] || ["English"];
}



function mapWeatherToSearchTerm(weather) {
  const map = {
    Clear: ["Sunny", "Happy"],
    Rain: ["Rainy", "Monsoon"],
    Clouds: ["Cloudy", "Chill"],
    Snow: ["Snow", "Winter"],
    Thunderstorm: ["Storm", "Energetic"],
    Drizzle: ["Rain", "Soft"],
    Mist: ["Lo-Fi", "Calm"]
  };
  return map[weather] || ["Chill"];
}

document.addEventListener("DOMContentLoaded", () => {
  document.body.style.backgroundImage = "url('images/default.jpg')";
});
