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
  const location = document.getElementById("location").value.trim();
  const resultDiv = document.getElementById("result");
  const iconContainer = document.getElementById("weather-icon");
  const spinner = document.getElementById("loading-spinner");
  const nextBtn = document.getElementById("next-playlist-btn");

  resultDiv.innerHTML = "";
  iconContainer.innerHTML = "";
  spinner.style.display = "block";
  nextBtn.style.display = "none";

  try {
    // ✅ Fetch weather from backend (SECURE)
    const res = await fetch(`/weather?q=${encodeURIComponent(location)}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    const { location: loc, weather, temp, countryCode, state, city } = data;
    const countryName = getCountryName(countryCode);
    const token = await getSpotifyToken();

    lastState = { location: loc, weather, temp, countryCode, state, city };

    setBackground(weather);

    const iconAnimation = getLottieAnimation(weather);
    lottie.loadAnimation({
      container: iconContainer,
      renderer: "svg",
      loop: true,
      autoplay: true,
      path: iconAnimation
    });

    const queries = [];
    const languages = getMusicLanguages(countryCode, state, city);

    mapWeatherToSearchTerm(weather).forEach(keyword => {
      languages.forEach(lang => {
        queries.push(`${keyword} ${lang}`);
      });
    });

    queries.push(`Top 50 ${countryName}`, "Top Global");

    playlistResults = [];
    for (const q of queries) {
      const results = await searchSpotifyPlaylists(q, token);
      playlistResults.push(...results);
    }

    playlistResults = [...new Map(
      playlistResults.filter(Boolean).map(p => [p.id, p])
    ).values()];

    currentPlaylistIndex = 0;
    renderPlaylist();

  } catch (err) {
    console.error("❌ Error:", err);
    resultDiv.innerHTML = `❌ ${err.message}`;
  } finally {
    spinner.style.display = "none";
  }
}

function renderPlaylist() {
  const resultDiv = document.getElementById("result");
  const infoDiv = document.getElementById("weather-info");
  const nextBtn = document.getElementById("next-playlist-btn");
  const { location, weather, temp, countryCode } = lastState;

  const fallbackId = fallbackPlaylists[countryCode] || fallbackPlaylists.default;
  const playlist = playlistResults[currentPlaylistIndex] || null;

  const embed = playlist
    ? `<iframe src="https://open.spotify.com/embed/playlist/${playlist.id}" loading="lazy"></iframe>`
    : `<iframe src="https://open.spotify.com/embed/playlist/${fallbackId}" loading="lazy"></iframe>`;

  infoDiv.innerHTML = `
    <h3>Weather in ${location}: ${weather} (${temp}°C)</h3>
    <h4>${playlist ? "Spotify Playlist:" : "Fallback Playlist"}</h4>
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
  const res = await fetch("/spotify-token");
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
  } catch {
    return [];
  }
}

function setBackground(weather) {
  const bg = {
    Clear: "images/clearsky.jpg",
    Rain: "images/rain.jpg",
    Clouds: "images/cloudy.jpg",
    Snow: "images/snow.jpg",
    Thunderstorm: "images/thunder.jpg",
    Drizzle: "images/drizzle.jpg",
    Mist: "images/mist.jpg"
  };
  document.body.style.backgroundImage = `url('${bg[weather] || "images/default.jpg"}')`;
}

function getLottieAnimation(weather) {
  const map = {
    Clear: "https://lottie.host/05e5bd18-f10e-4dd4-8f02-d04c186dd8d3/yvPvUL29EH.json",
    Rain: "https://lottie.host/4a3bb1fa-9e00-4e94-9700-1394ec3e1fc7/0YKmtdlyRv.json",
    Clouds: "https://lottie.host/290fcaf2-1de9-4974-a66c-30349126c9de/jmhDGoxZt2.json",
    Snow: "https://lottie.host/1cd5d7bc-3dc9-4269-b9b3-bd0c7686c964/6dDrpyLku6.json"
  };
  return map[weather] || map.Clear;
}

function getCountryName(code) {
  const map = { IN: "India", US: "USA", GB: "UK", DE: "Germany", FR: "France", PK: "Pakistan" };
  return map[code] || code;
}

function getMusicLanguages(code, state = "", city = "") {
  state = state.toLowerCase();
  city = city.toLowerCase();

  if (code === "IN") {
    if (state.includes("tamil")) return ["Tamil", "Hindi", "English"];
    if (state.includes("kerala")) return ["Malayalam", "Hindi", "English"];
    if (state.includes("karnataka")) return ["Kannada", "Hindi", "English"];
    return ["Hindi", "English"];
  }

  if (code === "PK") return ["Urdu", "English"];
  return ["English"];
}

function mapWeatherToSearchTerm(weather) {
  const map = {
    Clear: ["Happy", "Sunny"],
    Rain: ["Rainy", "Chill"],
    Clouds: ["Lo-Fi", "Calm"],
    Snow: ["Winter"],
    Thunderstorm: ["Energetic"],
    Mist: ["Calm"]
  };
  return map[weather] || ["Chill"];
}

document.getElementById("feedback-form").addEventListener("submit", async e => {
  e.preventDefault();

  const name = document.getElementById("name").value.trim();
  const message = document.getElementById("message").value.trim();
  const responseEl = document.getElementById("feedback-response");

  try {
    const res = await fetch("/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, message })
    });

    responseEl.innerText = res.ok
      ? "✅ Thanks for your feedback!"
      : "❌ Failed to submit feedback";

    if (res.ok) e.target.reset();
  } catch {
    responseEl.innerText = "❌ Something went wrong";
  }
});
