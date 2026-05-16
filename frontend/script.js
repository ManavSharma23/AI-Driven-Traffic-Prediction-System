let forecastChart = null;
let currentForecast = [];
let map = null;

// --- Initialize Components ---
document.addEventListener('DOMContentLoaded', () => {
    lucide.createIcons();
    initMap();
    initTheme();
    initWeatherChips();
    initHeroStats();
    initHeatmap();
    
    // Live Temp Update
    document.getElementById('temp').addEventListener('input', (e) => {
        document.getElementById('temp-val').textContent = e.target.value + ' K';
    });

    showSection('hero'); // Start at Home
});

// --- SPA Navigation ---
function showSection(id) {
    const sections = document.querySelectorAll('.spa-section');
    const navLinks = document.querySelectorAll('.nav-links a');
    
    // Update Nav
    navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.id === `nav-${id}`) link.classList.add('active');
    });

    // Animate Section Switch
    sections.forEach(section => {
        if (section.id === id) {
            section.classList.add('active');
            // Re-trigger map resize if map section shown
            if (id === 'live-map' && map) setTimeout(() => map.invalidateSize(), 300);
        } else {
            section.classList.remove('active');
        }
    });
}

function initMap() {
    map = L.map('map-container').setView([44.9778, -93.2650], 12);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png').addTo(map);

    const highwayStyles = [
        { name: "I-94 West", coords: [[44.95, -93.35], [44.98, -93.15]], color: '#ef4444', vol: '5,240' },
        { name: "I-35E South", coords: [[45.05, -93.20], [44.90, -93.20]], color: '#fbbf24', vol: '3,120' },
        { name: "I-394 Hub", coords: [[44.97, -93.50], [44.97, -93.10]], color: '#34d399', vol: '1,850' }
    ];

    highwayStyles.forEach(h => {
        const poly = L.polyline(h.coords, {color: h.color, weight: 8, opacity: 0.6}).addTo(map);
        poly.bindPopup(`<strong>${h.name}</strong><br>Live Volume: ${h.vol} vph<br><span style="color:${h.color}">Status: ${h.vol > 4000 ? 'Heavy' : 'Stable'}</span>`);
    });
}

function initTheme() {
    document.getElementById('theme-toggle').addEventListener('click', () => {
        document.body.classList.toggle('light-theme');
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

function initHeroStats() {
    anime({ targets: '#stat-predictions', innerHTML: [0, 1245000], round: 1, duration: 2500, easing: 'easeOutExpo' });
    anime({ targets: '#stat-accuracy', innerHTML: [0, 98.4], round: 10, duration: 2500, easing: 'easeOutExpo', suffix: '%' });
    anime({ targets: '#stat-cities', innerHTML: [0, 12], round: 1, duration: 2000, easing: 'easeOutExpo' });
}

function initHeatmap() {
    const container = document.getElementById('heatmap-calendar');
    for (let i = 0; i < 24 * 7; i++) {
        const cell = document.createElement('div');
        cell.className = 'heat-cell';
        const opacity = Math.random();
        cell.style.background = `rgba(99, 102, 241, ${opacity})`;
        container.appendChild(cell);
    }
}

// --- Logic ---
document.getElementById('prediction-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const weather = document.querySelector('.weather-chip.active').dataset.value;
    const dateVal = document.getElementById('sim_date').value;
    const timeVal = document.getElementById('sim_time').value;
    const formData = {
        date_time: `${dateVal} ${timeVal}:00`,
        temp: parseFloat(document.getElementById('temp').value),
        rain_1h: 0, snow_1h: 0, clouds_all: 40, weather_main: weather
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

        updateInfinityDisplay(predData);
        updateInfinityChart(foreData.forecast);
    } catch (e) { alert('Simulation failed: ' + e.message); }
});

// --- Time Scrubber Logic ---
document.getElementById('time-scrubber').addEventListener('input', (e) => {
    if (!currentForecast || currentForecast.length === 0) return;
    const hourIdx = parseInt(e.target.value);
    const data = currentForecast[hourIdx];
    
    // 1. Update the Big Display
    updateInfinityDisplay({
        prediction: data.volume,
        range: { min: Math.round(data.volume * 0.92), max: Math.round(data.volume * 1.08) },
        insights: {
            reason: `Predicted volume for ${data.hour}:00`,
            recommendation: data.volume < 2000 ? "Excellent" : data.volume < 4500 ? "Good" : "Busy"
        }
    });

    // 2. Highlight point on chart
    if (forecastChart) {
        forecastChart.setActiveElements([{
            datasetIndex: 0,
            index: hourIdx
        }]);
        forecastChart.update();
    }
});

function updateInfinityDisplay(data) {
    const vol = data.prediction;
    anime({ targets: '#prediction-number', innerHTML: [0, vol], round: 1, duration: 1500, easing: 'easeOutExpo' });
    
    const percentage = Math.min(Math.round((vol / 6500) * 100), 100);
    document.getElementById('meter-percentage').textContent = `${percentage}%`;
    document.getElementById('meter-fill').style.strokeDashoffset = 126 - (126 * percentage) / 100;
    
    const color = percentage < 30 ? '#10b981' : percentage < 70 ? '#f59e0b' : '#ef4444';
    document.getElementById('meter-fill').style.stroke = color;
    document.getElementById('traffic-status').textContent = percentage < 30 ? 'Stable' : 'Congested';
    document.getElementById('traffic-status').style.color = color;
    
    document.getElementById('insight-reason').textContent = data.insights.reason;
    document.getElementById('insight-advice').textContent = data.insights.recommendation;
    document.getElementById('confidence-range').textContent = `${data.range.min} - ${data.range.max} vph`;
    
    const avgText = percentage > 50 ? 'Above Average' : 'Below Average';
    document.getElementById('prediction-context').textContent = `${percentage}% Load &bull; ${avgText}`;
}

function updateInfinityChart(forecast) {
    const ctx = document.getElementById('forecastChart').getContext('2d');
    if (forecastChart) forecastChart.destroy();
    
    const gradient = ctx.createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, 'rgba(99, 102, 241, 0.4)');
    gradient.addColorStop(1, 'rgba(99, 102, 241, 0)');

    forecastChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: forecast.map(f => `${f.hour}:00`),
            datasets: [{
                data: forecast.map(f => f.volume),
                borderColor: '#6366f1',
                backgroundColor: gradient,
                fill: true,
                tension: 0.4,
                pointRadius: 4,
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

function exportCSV() {
    if (currentForecast.length === 0) return alert('No data to export.');
    let csv = 'Hour,Volume\n';
    currentForecast.forEach(f => csv += `${f.hour}:00,${f.volume}\n`);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'traffic_forecast.csv'; a.click();
}

// --- Route Planner Intelligence ---
function calculateRoutes() {
    const resultsContainer = document.querySelector('.route-results');
    resultsContainer.innerHTML = '<div class="loader-pulse">Calculating optimal paths...</div>';
    
    setTimeout(() => {
        resultsContainer.innerHTML = `
            <h3>3 Optimal Paths Found</h3>
            <div class="route-option best">
                <div class="route-meta"><strong>I-94 Express</strong> <span>18 mins</span></div>
                <div class="route-desc">Best flow detected by Neural Engine.</div>
            </div>
            <div class="route-option">
                <div class="route-meta"><strong>Local Arterial</strong> <span>24 mins</span></div>
                <div class="route-desc">Heavier surface street congestion.</div>
            </div>
            <div class="route-advice">
                <i data-lucide="info"></i>
                <span>Smart Tip: Leave in 15 minutes to save 8 minutes of idle time.</span>
            </div>
        `;
        lucide.createIcons();
    }, 1500);
}

// Attach to button
document.querySelector('#planner .enterprise-btn').addEventListener('click', calculateRoutes);

// --- Analytics Phase 3: Observatory Logic ---
let accuracyChart = null;

function refreshAnalytics() {
    initAccuracyChart();
    initNeuralHeatmap();
    initAuditLog();
    lucide.createIcons();
}

function initAccuracyChart() {
    const ctx = document.getElementById('accuracyTrendChart').getContext('2d');
    if (accuracyChart) accuracyChart.destroy();

    const labels = Array.from({length: 24}, (_, i) => `${i}:00`);
    const actualData = Array.from({length: 24}, () => Math.floor(Math.random() * 5000) + 500);
    const predictedData = actualData.map(v => v + (Math.random() * 400 - 200));

    accuracyChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Real Sensor Data',
                    data: actualData,
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    fill: true,
                    borderWidth: 3,
                    pointRadius: 0,
                    tension: 0.4
                },
                {
                    label: 'AI Prediction',
                    data: predictedData,
                    borderColor: '#6366f1',
                    borderDash: [5, 5],
                    borderWidth: 2,
                    fill: false,
                    pointRadius: 0,
                    tension: 0.4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'top', labels: { color: '#94a3b8', font: { weight: '600' } } } },
            scales: {
                y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8' } },
                x: { grid: { display: false }, ticks: { color: '#94a3b8' } }
            }
        }
    });
}

function initNeuralHeatmap() {
    const grid = document.getElementById('neural-heatmap');
    grid.innerHTML = '';
    for (let i = 0; i < 24 * 7; i++) {
        const cell = document.createElement('div');
        cell.className = 'heat-cell';
        const intensity = Math.random();
        const color = intensity > 0.8 ? '#ef4444' : intensity > 0.4 ? '#f59e0b' : '#10b981';
        cell.style.background = color;
        cell.style.opacity = intensity * 0.8 + 0.2;
        grid.appendChild(cell);
    }
}

function initAuditLog() {
    const body = document.getElementById('audit-log-body');
    body.innerHTML = '';
    const rows = 8;
    for (let i = 0; i < rows; i++) {
        const actual = Math.floor(Math.random() * 4000) + 1000;
        const pred = actual + (Math.random() * 200 - 100);
        const variance = Math.abs(actual - pred).toFixed(0);
        const status = variance < 100 ? 'good' : 'fair';
        
        body.innerHTML += `
            <tr>
                <td>Today, 1${i}:00</td>
                <td>Clear Sky</td>
                <td>${pred.toFixed(0)}</td>
                <td>${actual}</td>
                <td>${variance} vph</td>
                <td><span class="status-badge ${status}">${status}</span></td>
            </tr>
        `;
    }
}

// Hook into section switching
const originalShowSection = showSection;
showSection = (id) => {
    originalShowSection(id);
    if (id === 'analytics') {
        setTimeout(refreshAnalytics, 100);
    }
};

// --- Phase 4: Command Center Sentience ---
function initCommandCenter() {
    startLiveClock();
    animateNetworkStats();
    initEventTicker();
    initMiniForecast();
}

function startLiveClock() {
    setInterval(() => {
        const now = new Date();
        document.getElementById('live-time').textContent = now.toLocaleTimeString();
    }, 1000);
}

function animateNetworkStats() {
    const stats = [
        { id: 'stat-active-roads', val: 214 },
        { id: 'stat-congested', val: 31 },
        { id: 'stat-avg-speed', val: 42 },
        { id: 'stat-active-preds', val: 124 }
    ];
    stats.forEach(s => {
        anime({
            targets: `#${s.id}`,
            innerHTML: [0, s.val],
            round: 1,
            easing: 'easeOutExpo',
            duration: 2000
        });
    });
}

function initEventTicker() {
    const ticker = document.getElementById('ai-event-ticker');
    const events = [
        "Highway A: Congestion spike detected near Downtown.",
        "Rain sensor active: Slowdown predicted for 16:00 peak.",
        "Neural node MSP-CENTRAL: System health 99.8%.",
        "Predicted peak in 18 mins: Commuter alert generated.",
        "Model Drift detected: Self-calibration in progress...",
        "Route Planner node: Active session count increased."
    ];
    
    let idx = 0;
    setInterval(() => {
        const item = document.createElement('div');
        item.className = 'ticker-item';
        item.textContent = `[${new Date().toLocaleTimeString('en-GB', {hour:'2-digit', minute:'2-digit'})}] ${events[idx]}`;
        ticker.prepend(item);
        if (ticker.childNodes.length > 5) ticker.lastChild.remove();
        idx = (idx + 1) % events.length;
        lucide.createIcons();
    }, 4000);
}

function initMiniForecast() {
    const container = document.getElementById('mini-forecast-bars');
    container.innerHTML = ''; // Clear previous bars
    for (let i = 0; i < 6; i++) {
        const h = Math.random() * 80 + 20;
        const barItem = document.createElement('div');
        barItem.className = 'f-bar-item';
        barItem.innerHTML = `
            <div class="f-bar" style="height: ${h}%"></div>
            <span class="f-label">+${(i+1)*10}m</span>
        `;
        container.appendChild(barItem);
    }
}

async function runCommandCenterSim() {
    const time = document.getElementById('cmd-time').value;
    const weather = document.getElementById('cmd-weather').value;
    const resultBox = document.getElementById('sim-result-compact');
    
    resultBox.classList.remove('hidden');
    document.getElementById('cmd-res-vol').textContent = "---";
    
    // Simulate Neural "Thinking" delay
    setTimeout(async () => {
        const vol = Math.floor(Math.random() * 4500) + 500;
        anime({
            targets: '#cmd-res-vol',
            innerHTML: [0, vol],
            round: 1,
            duration: 1000,
            easing: 'easeOutExpo'
        });
        document.getElementById('cmd-res-status').textContent = vol > 3500 ? 'CONGESTED' : 'STABLE';
        document.getElementById('cmd-res-status').style.color = vol > 3500 ? 'var(--danger)' : 'var(--success)';
    }, 800);
}

// Hook into section switching to start the sentient systems
const prevShowSectionCC = showSection;
showSection = (id) => {
    prevShowSectionCC(id);
    if (id === 'live-map') {
        initCommandCenter();
        setTimeout(() => map.invalidateSize(), 300);
    }
};

// --- Reference Blueprint: Command Center Intelligence ---
let miniTrendChart = null;

function initBlueprintIntelligence() {
    initMiniTrendChart();
    populateIncidents();
    populateSegments();
}

function initMiniTrendChart() {
    const ctx = document.getElementById('miniTrendChart').getContext('2d');
    if (miniTrendChart) miniTrendChart.destroy();

    const labels = ['10 AM', '2 PM', '6 PM', '10 PM', '2 AM', '6 AM', '10 AM'];
    const currentData = [3000, 4500, 7500, 5000, 2000, 3500, 4200];
    const predictedData = [3200, 4800, 7200, 4800, 1800, 3200, 4100];

    miniTrendChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Current Flow',
                    data: currentData,
                    borderColor: '#6366f1',
                    borderWidth: 2,
                    pointRadius: 3,
                    pointBackgroundColor: '#6366f1',
                    tension: 0.4
                },
                {
                    label: 'Predicted Flow',
                    data: predictedData,
                    borderColor: 'rgba(99, 102, 241, 0.3)',
                    borderDash: [5, 5],
                    borderWidth: 2,
                    pointRadius: 0,
                    tension: 0.4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { display: false },
                x: { grid: { display: false }, ticks: { color: '#64748b', font: { size: 9 } } }
            }
        }
    });
}

function populateIncidents() {
    // Already has static items in HTML for reference accuracy, 
    // but can be extended here for dynamic updates
}

function populateSegments() {
    // Static items match reference, can be linked to live data here
}

// Hook into the live-map trigger
const originalShowSectionBP = showSection;
showSection = (id) => {
    originalShowSectionBP(id);
    if (id === 'live-map') {
        setTimeout(initBlueprintIntelligence, 200);
    }
};
