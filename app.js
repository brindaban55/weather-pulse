/**
 * WeatherPulse • High Performance Open-Meteo Dashboard
 */

// Application State
const state = {
  currentCity: "Kolkata",
  currentCountry: "India",
  lat: 22.5626,
  lon: 88.363,
  unit: "C", // 'C' or 'F'
  chartMode: "temp", // 'temp' or 'precip'
  weatherData: null,
  hourlyChart: null,
  canvasAnimId: null,
};

// WMO Weather Code Dictionary
const WMO_CODES = {
  0: { label: "Clear Sky", icon: "sun", type: "clear" },
  1: { label: "Mainly Clear", icon: "sun-medium", type: "clear" },
  2: { label: "Partly Cloudy", icon: "cloud-sun", type: "cloudy" },
  3: { label: "Overcast", icon: "cloud", type: "cloudy" },
  45: { label: "Foggy", icon: "cloud-fog", type: "fog" },
  48: { label: "Depositing Rime Fog", icon: "cloud-fog", type: "fog" },
  51: { label: "Light Drizzle", icon: "cloud-drizzle", type: "rain" },
  53: { label: "Moderate Drizzle", icon: "cloud-drizzle", type: "rain" },
  55: { label: "Dense Drizzle", icon: "cloud-drizzle", type: "rain" },
  61: { label: "Slight Rain", icon: "cloud-rain", type: "rain" },
  63: { label: "Moderate Rain", icon: "cloud-rain", type: "rain" },
  65: { label: "Heavy Rain", icon: "cloud-rain-wind", type: "rain" },
  71: { label: "Slight Snow Fall", icon: "cloud-snow", type: "snow" },
  73: { label: "Moderate Snow Fall", icon: "cloud-snow", type: "snow" },
  75: { label: "Heavy Snow Fall", icon: "snowflake", type: "snow" },
  80: { label: "Slight Rain Showers", icon: "cloud-rain", type: "rain" },
  81: { label: "Moderate Rain Showers", icon: "cloud-rain", type: "rain" },
  82: { label: "Violent Rain Showers", icon: "cloud-lightning", type: "thunder" },
  95: { label: "Thunderstorm", icon: "cloud-lightning", type: "thunder" },
  96: { label: "Thunderstorm with Hail", icon: "cloud-lightning", type: "thunder" },
  99: { label: "Heavy Thunderstorm", icon: "zap", type: "thunder" },
};

function getWeatherMeta(code) {
  return WMO_CODES[code] || { label: "Moderate Weather", icon: "cloud-sun", type: "cloudy" };
}

// Temperature conversions
function formatTemp(tempC, unit = state.unit) {
  if (tempC === undefined || tempC === null) return "--";
  if (unit === "F") {
    return Math.round((tempC * 9) / 5 + 32);
  }
  return Math.round(tempC);
}

function formatSpeed(speedKmh, unit = state.unit) {
  if (speedKmh === undefined || speedKmh === null) return "--";
  if (unit === "F") {
    return (speedKmh * 0.621371).toFixed(1) + " mph";
  }
  return speedKmh.toFixed(1) + " km/h";
}

// Fetch Forecast Data from Open-Meteo
async function fetchWeatherData(lat, lon) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,rain,showers,snowfall,weather_code,cloud_cover,surface_pressure,wind_speed_10m,wind_direction_10m,wind_gusts_10m,uv_index&hourly=temperature_2m,relative_humidity_2m,precipitation_probability,precipitation,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max,precipitation_sum,precipitation_probability_max&timezone=auto`;

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error("Failed to fetch weather data");
    const data = await response.json();
    state.weatherData = data;
    renderDashboard(data);
  } catch (error) {
    console.error("Error fetching weather:", error);
    alert("Could not load weather data for this location. Please try again.");
  }
}

// Render Dashboard Elements
function renderDashboard(data) {
  const current = data.current;
  const daily = data.daily;
  const hourly = data.hourly;
  const meta = getWeatherMeta(current.weather_code);

  // Update Hero
  document.getElementById("locationName").textContent = state.currentCity;
  document.getElementById("countryText").textContent = state.currentCountry;
  
  const now = new Date();
  document.getElementById("localTimeText").textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  
  document.getElementById("conditionText").textContent = meta.label;
  document.getElementById("conditionIconWrapper").innerHTML = `<i data-lucide="${meta.icon}"></i>`;
  
  document.getElementById("currentTemp").textContent = formatTemp(current.temperature_2m);
  document.getElementById("displayUnit").textContent = `°${state.unit}`;
  document.getElementById("apparentTemp").textContent = `${formatTemp(current.apparent_temperature)}°`;
  
  document.getElementById("todayMaxTemp").textContent = `${formatTemp(daily.temperature_2m_max[0])}°`;
  document.getElementById("todayMinTemp").textContent = `${formatTemp(daily.temperature_2m_min[0])}°`;

  // Sun cycle
  if (daily.sunrise && daily.sunrise[0]) {
    const sunriseDate = new Date(daily.sunrise[0]);
    const sunsetDate = new Date(daily.sunset[0]);
    document.getElementById("sunriseTime").textContent = sunriseDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    document.getElementById("sunsetTime").textContent = sunsetDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const totalDayTime = sunsetDate - sunriseDate;
    const elapsed = now - sunriseDate;
    let progress = Math.max(0, Math.min(100, (elapsed / totalDayTime) * 100));
    document.getElementById("sunTrackFill").style.width = `${progress}%`;
    document.getElementById("sunMarker").style.left = `${progress}%`;
  }

  // Metrics
  document.getElementById("windSpeed").innerHTML = `${formatSpeed(current.wind_speed_10m)} <small>${state.unit === 'F' ? 'mph' : 'km/h'}</small>`;
  document.getElementById("compassNeedle").style.transform = `rotate(${current.wind_direction_10m}deg)`;
  document.getElementById("windDirText").textContent = `Direction: ${current.wind_direction_10m}° (${getCardinalDirection(current.wind_direction_10m)})`;

  document.getElementById("humidityVal").innerHTML = `${current.relative_humidity_2m}<small>%</small>`;
  document.getElementById("humidityProgress").style.width = `${current.relative_humidity_2m}%`;
  document.getElementById("dewPointText").textContent = current.relative_humidity_2m > 70 ? "Humid & Sticky" : current.relative_humidity_2m < 30 ? "Dry Air" : "Comfortable Humidity";

  const uv = current.uv_index !== undefined ? current.uv_index : daily.uv_index_max[0];
  document.getElementById("uvIndexVal").innerHTML = `${uv.toFixed(1)} <small>/ 12</small>`;
  const uvPercent = Math.min(100, (uv / 11) * 100);
  document.getElementById("uvIndicator").style.left = `${uvPercent}%`;
  const uvBadge = document.getElementById("uvRiskLevel");
  if (uv <= 2) {
    uvBadge.textContent = "Low Risk";
    uvBadge.style.color = "#34d399";
    uvBadge.style.background = "rgba(16, 185, 129, 0.2)";
  } else if (uv <= 5) {
    uvBadge.textContent = "Moderate";
    uvBadge.style.color = "#fbbf24";
    uvBadge.style.background = "rgba(251, 191, 36, 0.2)";
  } else if (uv <= 7) {
    uvBadge.textContent = "High Risk";
    uvBadge.style.color = "#f97316";
    uvBadge.style.background = "rgba(249, 115, 22, 0.2)";
  } else {
    uvBadge.textContent = "Very High/Extreme";
    uvBadge.style.color = "#f43f5e";
    uvBadge.style.background = "rgba(244, 63, 94, 0.2)";
  }

  document.getElementById("pressureVal").innerHTML = `${Math.round(current.surface_pressure)} <small>hPa</small>`;
  document.getElementById("precipVal").innerHTML = `${current.precipitation.toFixed(1)} <small>mm</small>`;
  const rainProb = hourly.precipitation_probability[0] || 0;
  document.getElementById("precipChanceText").textContent = `Chance of rain: ${rainProb}%`;

  document.getElementById("cloudCoverVal").innerHTML = `${current.cloud_cover}<small>%</small>`;
  document.getElementById("cloudProgress").style.width = `${current.cloud_cover}%`;
  document.getElementById("cloudStatusText").textContent = current.cloud_cover < 20 ? "Clear Skies" : current.cloud_cover < 70 ? "Partly Cloudy" : "Overcast Skies";

  // Hourly Slider (next 24 hours)
  renderHourlySlider(hourly);

  // Hourly Chart
  renderHourlyChart(hourly);

  // 7-Day Forecast
  render7DayForecast(daily);

  // Smart Weather Insight
  renderWeatherAdvice(current, daily);

  // Start Canvas Particle Simulation
  initWeatherCanvas(meta.type);

  // Refresh Lucide Icons
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

function getCardinalDirection(angle) {
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return directions[Math.round(angle / 45) % 8];
}

// Hourly Slider
function renderHourlySlider(hourly) {
  const container = document.getElementById("hourlySlider");
  container.innerHTML = "";

  const count = Math.min(24, hourly.time.length);
  for (let i = 0; i < count; i++) {
    const timeDate = new Date(hourly.time[i]);
    const hourLabel = i === 0 ? "Now" : timeDate.toLocaleTimeString([], { hour: 'numeric' });
    const temp = formatTemp(hourly.temperature_2m[i]);
    const precipProb = hourly.precipitation_probability[i] || 0;
    const meta = getWeatherMeta(hourly.weather_code[i]);

    const card = document.createElement("div");
    card.className = `hourly-card ${i === 0 ? 'active-hour' : ''}`;
    card.innerHTML = `
      <span class="hourly-time">${hourLabel}</span>
      <div class="hourly-icon"><i data-lucide="${meta.icon}"></i></div>
      <span class="hourly-temp">${temp}°</span>
      <span class="hourly-precip"><i data-lucide="droplet" style="width:10px;height:10px"></i> ${precipProb}%</span>
    `;
    container.appendChild(card);
  }
}

// Chart.js Timeline Chart
function renderHourlyChart(hourly) {
  const ctx = document.getElementById("hourlyChart").getContext("2d");
  const count = 24;
  const labels = hourly.time.slice(0, count).map((t, idx) => {
    if (idx === 0) return "Now";
    const d = new Date(t);
    return d.toLocaleTimeString([], { hour: 'numeric' });
  });

  const tempData = hourly.temperature_2m.slice(0, count).map(t => formatTemp(t));
  const precipData = hourly.precipitation_probability.slice(0, count);

  if (state.hourlyChart) {
    state.hourlyChart.destroy();
  }

  const isTemp = state.chartMode === "temp";

  const gradient = ctx.createLinearGradient(0, 0, 0, 180);
  if (isTemp) {
    gradient.addColorStop(0, 'rgba(56, 189, 248, 0.45)');
    gradient.addColorStop(1, 'rgba(56, 189, 248, 0.0)');
  } else {
    gradient.addColorStop(0, 'rgba(99, 102, 241, 0.45)');
    gradient.addColorStop(1, 'rgba(99, 102, 241, 0.0)');
  }

  state.hourlyChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: isTemp ? `Temperature (°${state.unit})` : 'Precipitation Chance (%)',
        data: isTemp ? tempData : precipData,
        borderColor: isTemp ? '#38bdf8' : '#818cf8',
        backgroundColor: gradient,
        fill: true,
        tension: 0.4,
        borderWidth: 2.5,
        pointBackgroundColor: isTemp ? '#38bdf8' : '#818cf8',
        pointHoverRadius: 6,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(15, 23, 42, 0.9)',
          titleColor: '#fff',
          bodyColor: '#38bdf8',
          borderColor: 'rgba(56, 189, 248, 0.3)',
          borderWidth: 1,
          padding: 10,
          callbacks: {
            label: (ctx) => `${ctx.dataset.label}: ${ctx.parsed.y}${isTemp ? '°' : '%'}`
          }
        }
      },
      scales: {
        x: {
          grid: { color: 'rgba(255, 255, 255, 0.04)' },
          ticks: { color: '#64748b', font: { family: 'Plus Jakarta Sans', size: 10 } }
        },
        y: {
          grid: { color: 'rgba(255, 255, 255, 0.04)' },
          ticks: { color: '#64748b', font: { family: 'Plus Jakarta Sans', size: 10 } }
        }
      }
    }
  });
}

// 7-Day Forecast Rows
function render7DayForecast(daily) {
  const container = document.getElementById("forecast7DayList");
  container.innerHTML = "";

  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  for (let i = 0; i < daily.time.length; i++) {
    const d = new Date(daily.time[i]);
    const dayName = i === 0 ? "Today" : days[d.getDay()];
    const meta = getWeatherMeta(daily.weather_code[i]);
    const minT = formatTemp(daily.temperature_2m_min[i]);
    const maxT = formatTemp(daily.temperature_2m_max[i]);

    const row = document.createElement("div");
    row.className = "daily-row";
    row.innerHTML = `
      <div class="daily-day">${dayName}</div>
      <div class="daily-weather-info">
        <i data-lucide="${meta.icon}"></i>
        <span>${meta.label}</span>
      </div>
      <div class="daily-temps">
        <span class="daily-low">${minT}°</span>
        <div class="daily-bar-wrap">
          <div class="daily-bar-fill" style="width: 100%;"></div>
        </div>
        <span class="daily-high">${maxT}°</span>
      </div>
    `;
    container.appendChild(row);
  }
}

// Weather Advice generator
function renderWeatherAdvice(current, daily) {
  const container = document.getElementById("weatherTipContent");
  const temp = current.temperature_2m;
  const isRaining = current.precipitation > 0;
  const uv = daily.uv_index_max[0];
  const wind = current.wind_speed_10m;

  let tips = [];
  if (isRaining) {
    tips.push("🌧️ Wet conditions detected: Grab an umbrella or waterproof jacket before heading out.");
  } else if (temp > 30) {
    tips.push("☀️ Hot weather alert: Stay hydrated, drink water regularly, and avoid prolonged direct sun exposure.");
  } else if (temp < 10) {
    tips.push("🧣 Chilly temperatures: Layer up with warm clothing or a thermal jacket.");
  } else {
    tips.push("🌤️ Pleasant ambient conditions: Great weather for outdoor walks and recreational activities.");
  }

  if (uv >= 6) {
    tips.push("🛡️ High UV Index: Apply SPF 30+ sunscreen and consider wearing sunglasses.");
  }
  if (wind > 35) {
    tips.push("💨 Gusty winds: Exercise caution with light outdoor items and driving.");
  }

  container.innerHTML = `<ul>${tips.map(t => `<li>${t}</li>`).join('')}</ul>`;
}

// Canvas Ambient Particle System (Rain, Sun, Snow, Fog)
function initWeatherCanvas(weatherType) {
  const canvas = document.getElementById("weatherCanvas");
  const ctx = canvas.getContext("2d");

  if (state.canvasAnimId) {
    cancelAnimationFrame(state.canvasAnimId);
  }

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();
  window.onresize = resize;

  const particles = [];
  const count = weatherType === "rain" || weatherType === "thunder" ? 80 : weatherType === "snow" ? 60 : 35;

  for (let i = 0; i < count; i++) {
    particles.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      len: Math.random() * 20 + 10,
      speed: Math.random() * 5 + 3,
      size: Math.random() * 3 + 1,
      opacity: Math.random() * 0.4 + 0.1,
      angle: Math.random() * 0.2 - 0.1,
    });
  }

  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (weatherType === "rain" || weatherType === "thunder") {
      ctx.strokeStyle = "rgba(56, 189, 248, 0.3)";
      ctx.lineWidth = 1.5;
      particles.forEach(p => {
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x + p.angle * 10, p.y + p.len);
        ctx.stroke();

        p.y += p.speed * 2.2;
        p.x += p.angle * 2;
        if (p.y > canvas.height) {
          p.y = -20;
          p.x = Math.random() * canvas.width;
        }
      });
    } else if (weatherType === "snow") {
      ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
      particles.forEach(p => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();

        p.y += p.speed * 0.5;
        p.x += Math.sin(p.y * 0.01) * 0.8;
        if (p.y > canvas.height) {
          p.y = -10;
          p.x = Math.random() * canvas.width;
        }
      });
    } else {
      // Clear/Cloudy Warm Ambient Glow particles
      particles.forEach(p => {
        ctx.fillStyle = `rgba(56, 189, 248, ${p.opacity * 0.3})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 2, 0, Math.PI * 2);
        ctx.fill();

        p.y -= p.speed * 0.2;
        if (p.y < -20) {
          p.y = canvas.height + 20;
          p.x = Math.random() * canvas.width;
        }
      });
    }

    state.canvasAnimId = requestAnimationFrame(animate);
  }

  animate();
}

// City Search Geocoding Autocomplete
let searchDebounceTimer = null;
const searchInput = document.getElementById("citySearchInput");
const searchDropdown = document.getElementById("searchResultsDropdown");
const clearBtn = document.getElementById("clearSearchBtn");

searchInput.addEventListener("input", (e) => {
  const query = e.target.value.trim();
  if (query.length > 0) {
    clearBtn.classList.remove("hidden");
  } else {
    clearBtn.classList.add("hidden");
    searchDropdown.classList.add("hidden");
    return;
  }

  clearTimeout(searchDebounceTimer);
  searchDebounceTimer = setTimeout(async () => {
    if (query.length < 2) return;
    try {
      const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=5&language=en&format=json`);
      const geoData = await res.json();
      if (geoData.results && geoData.results.length > 0) {
        searchDropdown.innerHTML = geoData.results.map(r => `
          <div class="search-item" data-city="${r.name}" data-country="${r.country || ''}" data-lat="${r.latitude}" data-lon="${r.longitude}">
            <strong>${r.name}</strong>
            <span>${r.admin1 ? r.admin1 + ', ' : ''}${r.country || ''}</span>
          </div>
        `).join('');
        searchDropdown.classList.remove("hidden");
      } else {
        searchDropdown.innerHTML = `<div style="padding:12px;color:#94a3b8;font-size:0.85rem;">No locations found for "${query}"</div>`;
        searchDropdown.classList.remove("hidden");
      }
    } catch (err) {
      console.error("Geocoding search error:", err);
    }
  }, 300);
});

clearBtn.addEventListener("click", () => {
  searchInput.value = "";
  clearBtn.classList.add("hidden");
  searchDropdown.classList.add("hidden");
});

searchDropdown.addEventListener("click", (e) => {
  const item = e.target.closest(".search-item");
  if (!item) return;
  const city = item.dataset.city;
  const country = item.dataset.country;
  const lat = parseFloat(item.dataset.lat);
  const lon = parseFloat(item.dataset.lon);

  state.currentCity = city;
  state.currentCountry = country;
  state.lat = lat;
  state.lon = lon;

  searchDropdown.classList.add("hidden");
  searchInput.value = "";
  clearBtn.classList.add("hidden");

  fetchWeatherData(lat, lon);
});

// Quick City Chips
document.querySelectorAll(".chip").forEach(chip => {
  chip.addEventListener("click", () => {
    document.querySelectorAll(".chip").forEach(c => c.classList.remove("active"));
    chip.classList.add("active");
    state.currentCity = chip.dataset.city;
    state.currentCountry = chip.dataset.country;
    state.lat = parseFloat(chip.dataset.lat);
    state.lon = parseFloat(chip.dataset.lon);
    fetchWeatherData(state.lat, state.lon);
  });
});

// Geolocation button
document.getElementById("geoLocateBtn").addEventListener("click", () => {
  if (!navigator.geolocation) {
    alert("Geolocation is not supported by your browser");
    return;
  }
  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      const lat = pos.coords.latitude;
      const lon = pos.coords.longitude;
      state.lat = lat;
      state.lon = lon;
      state.currentCity = "Your Location";
      state.currentCountry = "GPS Verified";
      fetchWeatherData(lat, lon);
    },
    (err) => {
      alert("Unable to retrieve location: " + err.message);
    }
  );
});

// Unit switchers (°C / °F)
document.getElementById("unitC").addEventListener("click", () => {
  if (state.unit === "C") return;
  state.unit = "C";
  document.getElementById("unitC").classList.add("active");
  document.getElementById("unitF").classList.remove("active");
  if (state.weatherData) renderDashboard(state.weatherData);
});

document.getElementById("unitF").addEventListener("click", () => {
  if (state.unit === "F") return;
  state.unit = "F";
  document.getElementById("unitF").classList.add("active");
  document.getElementById("unitC").classList.remove("active");
  if (state.weatherData) renderDashboard(state.weatherData);
});

// Chart Tabs
document.getElementById("viewTempChartBtn").addEventListener("click", () => {
  state.chartMode = "temp";
  document.getElementById("viewTempChartBtn").classList.add("active");
  document.getElementById("viewPrecipChartBtn").classList.remove("active");
  if (state.weatherData) renderHourlyChart(state.weatherData.hourly);
});

document.getElementById("viewPrecipChartBtn").addEventListener("click", () => {
  state.chartMode = "precip";
  document.getElementById("viewPrecipChartBtn").classList.add("active");
  document.getElementById("viewTempChartBtn").classList.remove("active");
  if (state.weatherData) renderHourlyChart(state.weatherData.hourly);
});

// ==========================================================================
// Doppler Radar Scanner Animation (Live 250km Dual-Pol Simulation)
// ==========================================================================
function initDopplerRadar() {
  const canvas = document.getElementById("dopplerRadarCanvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const size = canvas.width;
  const center = size / 2;
  const radius = center - 6;

  let sweepAngle = 0;

  // Generate simulated precipitation blips
  const blips = [
    { angle: 0.8, dist: 0.45, intensity: "rgba(52, 211, 153, 0.8)", size: 10 },
    { angle: 0.95, dist: 0.52, intensity: "rgba(251, 191, 36, 0.9)", size: 14 },
    { angle: 1.1, dist: 0.48, intensity: "rgba(239, 68, 68, 0.85)", size: 8 },
    { angle: 2.4, dist: 0.65, intensity: "rgba(56, 189, 248, 0.8)", size: 12 },
    { angle: 2.6, dist: 0.72, intensity: "rgba(52, 211, 153, 0.75)", size: 16 },
    { angle: 4.2, dist: 0.35, intensity: "rgba(56, 189, 248, 0.85)", size: 11 },
    { angle: 5.1, dist: 0.58, intensity: "rgba(251, 191, 36, 0.8)", size: 13 }
  ];

  function renderRadar() {
    ctx.clearRect(0, 0, size, size);

    // 1. Concentric Range Rings (50km, 100km, 150km, 200km)
    ctx.strokeStyle = "rgba(56, 189, 248, 0.22)";
    ctx.lineWidth = 1;
    for (let r = 1; r <= 4; r++) {
      ctx.beginPath();
      ctx.arc(center, center, (radius / 4) * r, 0, Math.PI * 2);
      ctx.stroke();
    }

    // 2. Azimuth Crosshairs
    ctx.beginPath();
    ctx.moveTo(center, center - radius);
    ctx.lineTo(center, center + radius);
    ctx.moveTo(center - radius, center);
    ctx.lineTo(center + radius, center);
    ctx.stroke();

    // 3. Fading Sector Trail behind Sweep Beam
    const trailSegments = 24;
    const trailSpan = 0.55; // radians
    for (let i = 0; i < trailSegments; i++) {
      const alpha = (1 - i / trailSegments) * 0.18;
      const startA = sweepAngle - (trailSpan / trailSegments) * (i + 1);
      const endA = sweepAngle - (trailSpan / trailSegments) * i;

      ctx.beginPath();
      ctx.moveTo(center, center);
      ctx.arc(center, center, radius, startA, endA);
      ctx.closePath();
      ctx.fillStyle = `rgba(56, 189, 248, ${alpha})`;
      ctx.fill();
    }

    // 4. Draw Weather Echo Blips (Light up when swept over)
    blips.forEach(b => {
      const bx = center + Math.cos(b.angle) * (radius * b.dist);
      const by = center + Math.sin(b.angle) * (radius * b.dist);

      let diff = (sweepAngle - b.angle) % (Math.PI * 2);
      if (diff < 0) diff += Math.PI * 2;

      let brightness = 0.2;
      if (diff < 0.4) {
        brightness = 1.0 - (diff / 0.4) * 0.7; // bright flash when swept
      }

      ctx.beginPath();
      ctx.arc(bx, by, b.size * 0.5, 0, Math.PI * 2);
      ctx.fillStyle = b.intensity;
      ctx.globalAlpha = brightness;
      ctx.shadowBlur = brightness > 0.5 ? 12 : 2;
      ctx.shadowColor = b.intensity;
      ctx.fill();
      ctx.globalAlpha = 1.0;
      ctx.shadowBlur = 0;
    });

    // 5. Sweep Beam Line
    ctx.beginPath();
    ctx.moveTo(center, center);
    ctx.lineTo(center + Math.cos(sweepAngle) * radius, center + Math.sin(sweepAngle) * radius);
    ctx.strokeStyle = "rgba(186, 230, 253, 0.95)";
    ctx.lineWidth = 1.8;
    ctx.stroke();

    // 6. Center Origin Node
    ctx.beginPath();
    ctx.arc(center, center, 3, 0, Math.PI * 2);
    ctx.fillStyle = "#38bdf8";
    ctx.fill();

    sweepAngle = (sweepAngle + 0.028) % (Math.PI * 2);
    requestAnimationFrame(renderRadar);
  }
  renderRadar();
}

// ==========================================================================
// Ambient Atmospheric Audio Synthesizer (Web Audio API)
// ==========================================================================
let audioContext = null;
let soundPlaying = false;
let noiseNode = null;
let filterNode = null;
let gainNode = null;

function toggleAtmosphereAudio() {
  const soundBtn = document.getElementById("weatherSoundToggle");
  const soundIcon = document.getElementById("soundIcon");
  const soundText = document.getElementById("soundText");

  if (!soundPlaying) {
    try {
      if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (audioContext.state === "suspended") {
        audioContext.resume();
      }

      // Generate 5-second procedural white noise buffer for gentle atmosphere
      const bufferSize = audioContext.sampleRate * 4;
      const noiseBuffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }

      noiseNode = audioContext.createBufferSource();
      noiseNode.buffer = noiseBuffer;
      noiseNode.loop = true;

      // Gentle bandpass filter (simulates soft wind / light rain sound)
      filterNode = audioContext.createBiquadFilter();
      filterNode.type = "bandpass";
      filterNode.frequency.value = 650;
      filterNode.Q.value = 1.2;

      gainNode = audioContext.createGain();
      gainNode.gain.setValueAtTime(0.001, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.04, audioContext.currentTime + 1.5);

      noiseNode.connect(filterNode);
      filterNode.connect(gainNode);
      gainNode.connect(audioContext.destination);

      noiseNode.start(0);
      soundPlaying = true;
      soundBtn.classList.add("active");
      soundIcon.setAttribute("data-lucide", "volume-2");
      soundText.textContent = "Playing";
    } catch (err) {
      console.warn("Audio initiation error:", err);
    }
  } else {
    if (gainNode && audioContext) {
      gainNode.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.8);
      setTimeout(() => {
        if (noiseNode) {
          noiseNode.stop();
          noiseNode.disconnect();
        }
        soundPlaying = false;
        soundBtn.classList.remove("active");
        soundIcon.setAttribute("data-lucide", "volume-x");
        soundText.textContent = "Audio";
        if (window.lucide) lucide.createIcons();
      }, 800);
    }
  }
  if (window.lucide) lucide.createIcons();
}

// Click outside dropdown to close
document.addEventListener("click", (e) => {
  if (!searchInput.contains(e.target) && !searchDropdown.contains(e.target)) {
    searchDropdown.classList.add("hidden");
  }
});

// Initial boot
document.addEventListener("DOMContentLoaded", () => {
  fetchWeatherData(state.lat, state.lon);
  initDopplerRadar();

  const soundBtn = document.getElementById("weatherSoundToggle");
  if (soundBtn) {
    soundBtn.addEventListener("click", toggleAtmosphereAudio);
  }
});
