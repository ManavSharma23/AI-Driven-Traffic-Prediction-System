let forecastChart = null;
let currentForecast = [];
let map = null;

// --- Initialize Components ---
document.addEventListener('DOMContentLoaded', () => {
    lucide.createIcons();
    initMap();
    initTheme();
    initWeatherChips();
    initAnimations();
    detectLocation();
});

function initMap() {
    // Centered on I-94 Minneapolis/St. Paul area
    map = L.map('map-container').setView([44.9778, -93.2650], 12);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap &copy; CARTO'
    }).addTo(map);

    // Mock Congestion Zones (Polylines)
    const routes = [
        [[44.95, -93.35], [44.98, -93.15], '#ef4444'], // Heavy
        [[45.05, -93.20], [44.90, -93.20], '#fbbf24'], // Moderate
        [[44.97, -93.50], [44.97, -93.10], '#34d399']  // Light
    ];

    routes.forEach(route => {
        L.polyline(route.slice(0, 2), {color: route[2], weight: 8, opacity: 0.6}).addTo(map);
    });
}

function initTheme() {
    const toggle = document.getElementById('theme-toggle');
    toggle.addEventListener('click', () => {
        document.body.classList.toggle('light-theme');
        const isDark = !document.body.classList.contains('light-theme');
        toggle.innerHTML = isDark ? '<i data-lucide="moon"></i>' : '<i data-lucide="sun"></i>';
        lucide.createIcons();
        
        // Update Map tiles if needed
        const layer = isDark ? 'dark_all' : 'rastertiles/voyager';
        map.eachLayer(l => { if (l._url) map.removeLayer(l); });
        L.tileLayer(`https://{s}.basemaps.cartocdn.com/${layer}/{z}/{x}/{y}{r}.png`).addTo(map);
    });
}

function initWeatherChips() {
    document.querySelectorAll('.weather-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            document.querySelectorAll('.weather-chip').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
        });
    });
}

function initAnimations() {
    anime({
        targets: '#total-predictions',
        innerHTML: [0, 1245000],
        round: 1,
        easing: 'easeOutExpo',
        duration: 3000
    });
}

function detectLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(pos => {
            document.getElementById('current-location').textContent = "Minneapolis, MN (Detected)";
        }, () => {
            document.getElementById('current-location').textContent = "Minneapolis (Default)";
        });
    }
}

// --- Main Prediction Logic ---
document.getElementById('prediction-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const submitBtn = document.getElementById('submit-btn');
    const loader = document.getElementById('loader');
    
    loader.style.display = 'block';
    submitBtn.disabled = true;

    const weather = document.querySelector('.weather-chip.active').dataset.value;
    const formData = {
        date_time: document.getElementById('date_time').value.replace('T', ' ') + ':00',
        temp: parseFloat(document.getElementById('temp').value),
        rain_1h: 0,
        snow_1h: 0,
        clouds_all: 40,
        weather_main: weather
    };

    try {
        const predRes = await fetch('http://127.0.0.1:8000/predict', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });
        const predData = await predRes.json();

        const foreRes = await fetch('http://127.0.0.1:8000/forecast', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });
        const foreData = await foreRes.json();
        currentForecast = foreData.forecast;

        updateDisplay(predData);
        updateChart(foreData.forecast);

    } catch (error) {
        alert('API Error: ' + error.message);
    } finally {
        loader.style.display = 'none';
        submitBtn.disabled = false;
    }
});

function updateDisplay(data) {
    const volume = data.prediction;
    
    // Animated Number Counter
    anime({
        targets: '#prediction-number',
        innerHTML: [0, volume],
        round: 1,
        easing: 'easeOutExpo',
        duration: 1500
    });

    const percentage = Math.min(Math.round((volume / 6500) * 100), 100);
    document.getElementById('meter-percentage').textContent = `${percentage}%`;
    
    const meterFill = document.getElementById('meter-fill');
    const dashOffset = 126 - (126 * percentage) / 100;
    meterFill.style.strokeDashoffset = dashOffset;
    
    const color = percentage < 30 ? '#10b981' : percentage < 70 ? '#f59e0b' : '#ef4444';
    meterFill.style.stroke = color;

    const statusBadge = document.getElementById('traffic-status');
    statusBadge.textContent = percentage < 30 ? 'Smooth' : percentage < 70 ? 'Moderate' : 'Congested';
    statusBadge.style.color = color;

    document.getElementById('insight-reason').textContent = data.insights.reason;
    document.getElementById('insight-advice').textContent = data.insights.recommendation;
    document.getElementById('confidence-range').textContent = `${data.range.min} - ${data.range.max} vph`;
}

// --- Time Scrubber Logic ---
document.getElementById('time-scrubber').addEventListener('input', (e) => {
    if (currentForecast.length === 0) return;
    const hourIdx = e.target.value;
    const data = currentForecast[hourIdx];
    
    // Quick update of display for scrubbed hour
    document.getElementById('prediction-number').textContent = data.volume.toLocaleString();
    const percentage = Math.min(Math.round((data.volume / 6500) * 100), 100);
    document.getElementById('meter-percentage').textContent = `${percentage}%`;
    document.getElementById('meter-fill').style.strokeDashoffset = 126 - (126 * percentage) / 100;
});

function updateChart(forecastData) {
    const ctx = document.getElementById('forecastChart').getContext('2d');
    if (forecastChart) forecastChart.destroy();

    forecastChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: forecastData.map(d => `${d.hour}:00`),
            datasets: [{
                data: forecastData.map(d => d.volume),
                borderColor: '#6366f1',
                backgroundColor: 'rgba(99, 102, 241, 0.1)',
                fill: true,
                tension: 0.4,
                pointRadius: 4,
                pointHoverRadius: 8,
                pointBackgroundColor: '#6366f1'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8' } },
                x: { grid: { display: false }, ticks: { color: '#94a3b8' } }
            }
        }
    });
}
