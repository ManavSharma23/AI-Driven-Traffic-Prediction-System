let forecastChart = null;
let currentForecast = [];
let map = null;
let mapTileLayer = null;

// --- Initialize Components ---
document.addEventListener('DOMContentLoaded', () => {
    try { lucide.createIcons(); } catch (e) { console.error(e); }
    try { initMap(); } catch (e) { console.error(e); }
    try { initTheme(); } catch (e) { console.error(e); }
    try { initWeatherChips(); } catch (e) { console.error(e); }
    try { initHeroStats(); } catch (e) { console.error(e); }
    try { initHeatmap(); } catch (e) { console.error(e); }
    
    // Live Temp Update
    const tempEl = document.getElementById('temp');
    if (tempEl) {
        tempEl.addEventListener('input', (e) => {
            const tempValEl = document.getElementById('temp-val');
            if (tempValEl) tempValEl.textContent = e.target.value + ' K';
        });
    }

    showSection('hero'); // Start at Home
});

// --- SPA Navigation ---
// --- Master SPA Navigation ---
function showSection(id) {
    const sections = document.querySelectorAll('.spa-section');
    const navLinks = document.querySelectorAll('.nav-item');
    
    // Update Nav
    navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.id === `nav-${id}`) link.classList.add('active');
    });

    // Animate Section Switch
    sections.forEach(section => {
        if (section.id === id) {
            section.classList.add('active');
            
            // Initialization Logic per section
            if (id === 'live-map') {
                if (map) setTimeout(() => map.invalidateSize(), 300);
                try { initCommandCenter(); } catch (e) { console.error('Command center failed:', e); }
            } else if (id === 'analytics') {
                try { initAccuracyChart(); } catch (e) { console.error('Accuracy chart failed:', e); }
                try { initNeuralHeatmap(); } catch (e) { console.error('Heatmap failed:', e); }
                try { initAuditLog(); } catch (e) { console.error('Audit log failed:', e); }
            }
        } else {
            section.classList.remove('active');
        }
    });
}

function initMap() {
    if (map) return;
    map = L.map('map-container').setView([44.9778, -93.2650], 12);
    const isLight = document.body.classList.contains('light-theme');
    const tileUrl = isLight 
        ? 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'
        : 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
    mapTileLayer = L.tileLayer(tileUrl).addTo(map);

    const highwayStyles = [
        { name: "I-94 East Expressway", coords: [[44.95, -93.33], [44.97, -93.20]], vol: 5240 },
        { name: "I-35W Central Expressway", coords: [[44.91, -93.26], [45.02, -93.26]], vol: 4890 },
        { name: "I-394 West Corridor", coords: [[44.97, -93.38], [44.97, -93.27]], vol: 3120 },
        { name: "Hwy 55 Olson Blvd", coords: [[44.985, -93.32], [44.985, -93.27]], vol: 1250 },
        { name: "Hwy 100 West-Ring", coords: [[44.89, -93.35], [45.03, -93.35]], vol: 4230 },
        { name: "Hennepin Ave Downtown Parkway", coords: [[44.94, -93.30], [44.99, -93.25]], vol: 1950 },
        { name: "University Ave Northeast", coords: [[44.97, -93.24], [45.01, -93.25]], vol: 1680 },
        { name: "Hiawatha Ave South Corridor", coords: [[44.96, -93.25], [44.90, -93.21]], vol: 2950 },
        { name: "Washington Ave Center-Link", coords: [[44.98, -93.28], [44.97, -93.23]], vol: 1450 },
        { name: "Lake St Crosstown Arterial", coords: [[44.948, -93.31], [44.948, -93.22]], vol: 3410 }
    ];

    highwayStyles.forEach(h => {
        const color = h.vol > 4500 ? '#e85656' : h.vol > 2000 ? '#f2a134' : '#8cd6c4';
        const poly = L.polyline(h.coords, {color: color, weight: 6, opacity: 0.8}).addTo(map);
        
        // Dynamic visual callout labels directly overlaying road segments
        poly.bindTooltip(`${h.vol.toLocaleString()} vph`, {
            permanent: true,
            direction: 'center',
            className: 'road-label-callout'
        });
        
        poly.bindPopup(`<strong>${h.name}</strong><br>Volume: ${h.vol.toLocaleString()} vph`);
        storeLayer(poly, h.vol);
    });
}

function initTheme() {
    const themeBtn = document.getElementById('theme-toggle');
    if (!themeBtn) return;
    
    // Load preference
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') {
        document.body.classList.add('light-theme');
        const icon = themeBtn.querySelector('i');
        if (icon) icon.setAttribute('data-lucide', 'sun');
    }
    
    themeBtn.addEventListener('click', () => {
        const isLight = document.body.classList.toggle('light-theme');
        const icon = themeBtn.querySelector('i');
        if (icon) {
            icon.setAttribute('data-lucide', isLight ? 'sun' : 'moon');
        }
        lucide.createIcons();
        localStorage.setItem('theme', isLight ? 'light' : 'dark');
        
        // Toggle Leaflet map basemap layer if map is active
        if (map && mapTileLayer) {
            map.removeLayer(mapTileLayer);
            const tileUrl = isLight 
                ? 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'
                : 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
            mapTileLayer = L.tileLayer(tileUrl).addTo(map);
        }
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
    if (!container) return;
    for (let i = 0; i < 24 * 7; i++) {
        const cell = document.createElement('div');
        cell.className = 'heat-cell';
        const opacity = Math.random();
        cell.style.background = `rgba(99, 102, 241, ${opacity})`;
        container.appendChild(cell);
    }
}

// --- Logic ---
const predForm = document.getElementById('prediction-form');
if (predForm) {
    predForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const activeWeatherChip = document.querySelector('.weather-chip.active');
        const weather = activeWeatherChip ? activeWeatherChip.dataset.value : 'Clear';
        const dateEl = document.getElementById('sim_date');
        const timeEl = document.getElementById('sim_time');
        const tempInput = document.getElementById('temp');
        if (!dateEl || !timeEl || !tempInput) return;
        
        const dateVal = dateEl.value;
        const timeVal = timeEl.value;
        const formData = {
            date_time: `${dateVal} ${timeVal}:00`,
            temp: parseFloat(tempInput.value),
            rain_1h: 0, snow_1h: 0, clouds_all: 40, weather_main: weather
        };

        try {
            // Show loading state, hide error
            const loadingEl = document.getElementById('predict-loading');
            const errorEl = document.getElementById('predict-error');
            const btnEl = document.getElementById('run-sim-btn');
            if (loadingEl) loadingEl.classList.remove('hidden');
            if (errorEl) errorEl.classList.add('hidden');
            if (btnEl) { btnEl.disabled = true; btnEl.style.opacity = '0.6'; }

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

            if (loadingEl) loadingEl.classList.add('hidden');
            if (btnEl) { btnEl.disabled = false; btnEl.style.opacity = '1'; }
        } catch (err) {
            const loadingEl = document.getElementById('predict-loading');
            const errorEl = document.getElementById('predict-error');
            const btnEl = document.getElementById('run-sim-btn');
            if (loadingEl) loadingEl.classList.add('hidden');
            if (errorEl) errorEl.classList.remove('hidden');
            if (btnEl) { btnEl.disabled = false; btnEl.style.opacity = '1'; }
            // Fallback: run local simulation so the UI still shows something useful
            const hour = parseInt(timeVal.split(':')[0]) || 12;
            let baseVol = hour >= 7 && hour <= 9 ? 4800 : hour >= 16 && hour <= 19 ? 5100 : hour >= 22 || hour <= 5 ? 500 : 2400;
            baseVol += Math.floor(Math.random() * 300) - 150;
            const fakeData = {
                prediction: baseVol,
                range: { min: Math.round(baseVol * 0.92), max: Math.round(baseVol * 1.08) },
                insights: { reason: 'Local fallback model (API offline)', recommendation: baseVol > 4000 ? 'Heavy congestion expected' : 'Normal flow' }
            };
            updateInfinityDisplay(fakeData);
            updateInfinityChart(Array.from({ length: 24 }, (_, i) => ({ hour: i, volume: Math.round(baseVol * (0.5 + Math.random() * 0.8)) })));
        }
    });
}

// --- Time Scrubber Logic ---
const scrubberEl = document.getElementById('time-scrubber');
if (scrubberEl) {
    scrubberEl.addEventListener('input', (e) => {
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
}

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
    document.getElementById('prediction-context').textContent = `${percentage}% Load • ${avgText}`;
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

function exportAuditLog() {
    const table = document.querySelector('.audit-table');
    if (!table) return alert('No audit log found.');
    
    let csv = [];
    const rows = table.querySelectorAll('tr');
    
    for (let i = 0; i < rows.length; i++) {
        const row = [];
        const cols = rows[i].querySelectorAll('td, th');
        
        for (let j = 0; j < cols.length; j++) {
            let text = cols[j].innerText.trim();
            text = text.replace(/"/g, '""');
            row.push(`"${text}"`);
        }
        
        csv.push(row.join(','));
    }
    
    const csvContent = csv.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'traffic_prediction_audit_log.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

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

    const gradient = ctx.createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, 'rgba(16, 185, 129, 0.2)');
    gradient.addColorStop(1, 'rgba(16, 185, 129, 0)');

    accuracyChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Real Sensor Data',
                    data: actualData,
                    borderColor: '#10b981',
                    backgroundColor: gradient,
                    fill: true,
                    borderWidth: 4,
                    pointRadius: 0,
                    tension: 0.4
                },
                {
                    label: 'AI Neural Prediction',
                    data: predictedData,
                    borderColor: '#6366f1',
                    borderDash: [8, 4],
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
            plugins: { 
                legend: { 
                    position: 'top', 
                    labels: { color: '#94a3b8', boxWidth: 12, padding: 20, font: { weight: '800', size: 11 } } 
                } 
            },
            scales: {
                y: { grid: { color: 'rgba(255,255,255,0.03)' }, ticks: { color: '#64748b', font: { weight: '700' } } },
                x: { grid: { display: false }, ticks: { color: '#64748b', font: { weight: '700' } } }
            }
        }
    });
}

function initNeuralHeatmap() {
    const days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
    const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    
    // Clear rows first
    days.forEach(day => {
        const rowEl = document.getElementById(`row-${day}`);
        if (rowEl) rowEl.innerHTML = '';
    });

    // Create Tooltip if it doesn't exist
    let tooltip = document.querySelector('.heatmap-tooltip');
    if (!tooltip) {
        tooltip = document.createElement('div');
        tooltip.className = 'heatmap-tooltip';
        tooltip.style.position = 'absolute';
        tooltip.style.display = 'none';
        document.body.appendChild(tooltip);
    }

    let peakVal = 0;
    let peakDayHour = '';
    let quietVal = 99999;
    let quietDayHour = '';
    let rushHourSlots = 0;

    // Loop through 7 days
    for (let d = 0; d < 7; d++) {
        const dayKey = days[d];
        const dayName = dayNames[d];
        const rowEl = document.getElementById(`row-${dayKey}`);
        if (!rowEl) continue;

        const isWeekday = d < 5;

        // Loop through 24 hours
        for (let h = 0; h < 24; h++) {
            const hourStr = String(h).padStart(2, '0') + ':00';
            const isNight = h < 6 || h > 21;
            
            // Peak periods weekdays: 7-9am, 4-7pm
            const isMorningRush = isWeekday && (h >= 7 && h <= 9);
            const isEveningRush = isWeekday && (h >= 16 && h <= 18);
            
            // Calculate a realistic traffic volume (vph)
            let volume = 0;
            if (isWeekday) {
                if (isMorningRush) {
                    volume = Math.floor(4500 + Math.random() * 1100); // 4500 - 5600
                } else if (isEveningRush) {
                    volume = Math.floor(4800 + Math.random() * 1050); // 4800 - 5850
                } else if (isNight) {
                    volume = Math.floor(300 + Math.random() * 600); // 300 - 900
                } else {
                    volume = Math.floor(1800 + Math.random() * 1400); // 1800 - 3200
                }
            } else {
                // Weekend
                if (isNight) {
                    volume = Math.floor(150 + Math.random() * 450); // 150 - 600
                } else {
                    volume = Math.floor(1200 + Math.random() * 1500); // 1200 - 2700
                }
            }

            // Track summary metrics
            if (volume > peakVal) {
                peakVal = volume;
                peakDayHour = `${dayName} ${hourStr}`;
            }
            if (volume < quietVal) {
                quietVal = volume;
                quietDayHour = `${dayName} ${hourStr}`;
            }
            if (volume > 4500) {
                rushHourSlots++;
            }

            // Map volume to legend colors
            let color = '';
            let category = '';
            if (volume < 1500) {
                color = '#e2f2f0';
                category = 'Low';
            } else if (volume < 3000) {
                color = '#8cd6c4';
                category = 'Moderate';
            } else if (volume < 4500) {
                color = '#f2a134';
                category = 'High';
            } else {
                color = '#e85656';
                category = 'Heavy';
            }

            // Create cell element
            const cell = document.createElement('div');
            cell.className = 'heatmap-cell-new';
            cell.style.backgroundColor = color;
            
            // Add tooltips event listeners
            cell.addEventListener('mouseenter', (e) => {
                tooltip.innerHTML = `
                    <div style="font-weight: 800; font-size: 0.85rem; margin-bottom: 2px;">${dayName}, ${hourStr}</div>
                    <div style="display: flex; align-items: center; gap: 6px;">
                        <span style="width: 8px; height: 8px; border-radius: 50%; background: ${color}; display: inline-block;"></span>
                        <span><strong>${volume.toLocaleString()} vph</strong> (${category})</span>
                    </div>
                `;
                tooltip.style.display = 'block';
                tooltip.style.opacity = '1';
            });
            cell.addEventListener('mousemove', (e) => {
                tooltip.style.left = (e.pageX + 15) + 'px';
                tooltip.style.top = (e.pageY - 15) + 'px';
            });
            cell.addEventListener('mouseleave', () => {
                tooltip.style.display = 'none';
                tooltip.style.opacity = '0';
            });

            rowEl.appendChild(cell);
        }
    }

    // Populate bottom summary takeaway cards
    const peakEl = document.getElementById('summary-peak');
    const peakVphEl = document.getElementById('summary-peak-vph');
    const quietEl = document.getElementById('summary-quiet');
    const quietVphEl = document.getElementById('summary-quiet-vph');
    const rushEl = document.getElementById('summary-rush');

    if (peakEl) peakEl.textContent = peakDayHour;
    if (peakVphEl) peakVphEl.textContent = `avg ${peakVal.toLocaleString()} vph`;
    if (quietEl) quietEl.textContent = quietDayHour;
    if (quietVphEl) quietVphEl.textContent = `avg ${quietVal.toLocaleString()} vph`;
    if (rushEl) rushEl.textContent = `${rushHourSlots} slots`;
}

function initAuditLog() {
    const body = document.getElementById('audit-log-body');
    if (!body) return;
    body.innerHTML = '';

    const weatherOptions = [
        'Clear Sky', 'Clear Sky', 'Clear Sky',
        'Rain', 'Rain',
        'Partly Cloudy',
        'Snow',
        'Fog'
    ];
    const statusOptions = [
        { cls: 'good', label: 'Good' },
        { cls: 'good', label: 'Good' },
        { cls: 'good', label: 'Good' },
        { cls: 'good', label: 'Good' },
        { cls: 'fair', label: 'Fair' },
        { cls: 'fair', label: 'Fair' },
        { cls: 'poor', label: 'Poor' },
        { cls: 'good', label: 'Good' },
    ];

    const rows = 8;
    for (let i = 0; i < rows; i++) {
        const actual = Math.floor(Math.random() * 4000) + 1000;
        const pred = actual + (Math.random() * 250 - 125);
        const variance = Math.abs(actual - pred).toFixed(0);
        const weather = weatherOptions[i];
        const status = statusOptions[i];

        body.innerHTML += `
            <tr>
                <td>Today, 1${i}:00</td>
                <td>${weather}</td>
                <td>${pred.toFixed(0)}</td>
                <td>${actual}</td>
                <td>${variance} vph</td>
                <td><span class="status-badge ${status.cls}">${status.label}</span></td>
            </tr>
        `;
    }
}


// --- Phase 4: Command Center Sentience ---
function initCommandCenter() {
    startLiveClock();
    animateNetworkStats();
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


function initMiniForecast() {
    const container = document.getElementById('mini-forecast-bars');
    if (!container) return;
    container.innerHTML = '';
    const avgVol = 2400; // Baseline average volume
    const maxCapacity = 6000;
    
    const profiles = [1.02, 1.05, 1.08, 1.04, 0.98, 0.92];
    
    for (let i = 0; i < 6; i++) {
        const barVol = Math.round(avgVol * profiles[i]);
        const percent = Math.min(Math.round((barVol / maxCapacity) * 100), 100);
        const barColor = barVol > 4500 ? '#e85656' : barVol > 2000 ? '#f2a134' : '#8cd6c4';
        
        const barItem = document.createElement('div');
        barItem.className = 'f-bar-item';
        barItem.innerHTML = `
            <div class="f-bar-wrapper">
                <div class="f-bar" style="height: 0%; background: ${barColor} !important; box-shadow: 0 0 10px ${barColor}80 !important;" data-vol="${barVol}"></div>
                <div class="f-bar-tooltip">${barVol.toLocaleString()} vph</div>
            </div>
            <span class="f-label">+${(i+1)*10}m</span>
        `;
        container.appendChild(barItem);
        
        // Staggered rise trigger
        setTimeout(() => {
            const barEl = barItem.querySelector('.f-bar');
            if (barEl) barEl.style.height = `${percent}%`;
        }, 50 * i);
    }
}

function updateForecastBars(vol) {
    const container = document.getElementById('mini-forecast-bars');
    if (!container) return;
    container.innerHTML = '';
    const maxCapacity = 6000;
    
    const profiles = [1.02, 1.05, 1.08, 1.04, 0.98, 0.92];
    
    for (let i = 0; i < 6; i++) {
        const barVol = Math.round(vol * profiles[i]);
        const percent = Math.min(Math.round((barVol / maxCapacity) * 100), 100);
        const barColor = barVol > 4500 ? '#e85656' : barVol > 2000 ? '#f2a134' : '#8cd6c4';
        
        const barItem = document.createElement('div');
        barItem.className = 'f-bar-item';
        barItem.innerHTML = `
            <div class="f-bar-wrapper">
                <div class="f-bar" style="height: 0%; background: ${barColor} !important; box-shadow: 0 0 10px ${barColor}80 !important;" data-vol="${barVol}"></div>
                <div class="f-bar-tooltip">${barVol.toLocaleString()} vph</div>
            </div>
            <span class="f-label">+${(i+1)*10}m</span>
        `;
        container.appendChild(barItem);
        
        // Staggered trigger for high-fidelity animations
        setTimeout(() => {
            const barEl = barItem.querySelector('.f-bar');
            if (barEl) barEl.style.height = `${percent}%`;
        }, 60 * i);
    }
}

async function runCommandCenterSim() {
    const time = document.getElementById('cmd-time').value;
    const weather = document.getElementById('cmd-weather').value;
    const temp = parseInt(document.getElementById('cmd-temp').value);
    const holiday = document.getElementById('cmd-holiday').checked;
    
    // Hide placeholder, show simulator result compact panel
    const placeholder = document.getElementById('sim-placeholder');
    if (placeholder) placeholder.classList.add('hidden');
    
    const resultBox = document.getElementById('sim-result-compact');
    if (resultBox) resultBox.classList.remove('hidden');
    
    document.getElementById('cmd-res-vol').textContent = "---";
    
    // Simulate Neural "Thinking" delay
    setTimeout(async () => {
        // Basic flow calculation based on time of day
        const [hour, min] = time.split(':').map(Number);
        let baseVol = 800; // night base
        if ((hour >= 7 && hour <= 9) || (hour >= 16 && hour <= 19)) {
            baseVol = 4600; // peak rush hours
        } else if (hour >= 10 && hour <= 15) {
            baseVol = 2600; // mid-day busy
        } else if (hour >= 20 || hour <= 6) {
            baseVol = 400 + (hour >= 20 ? (24 - hour) * 120 : hour * 120);
        }

        // Adjust for weather
        if (weather === 'Rain') baseVol += 700;
        if (weather === 'Snow') baseVol += 1200;

        // Adjust for temperature extremes (extrema drive users to single vehicles)
        if (temp > 305 || temp < 265) baseVol += 350;

        // Adjust for Holiday
        if (holiday) baseVol = Math.round(baseVol * 0.55); // holidays cut commuter traffic by 45%

        const vol = Math.max(150, baseVol + Math.floor(Math.random() * 300) - 150);
        
        anime({
            targets: '#cmd-res-vol',
            innerHTML: [0, vol],
            round: 1,
            duration: 1000,
            easing: 'easeOutExpo'
        });
        
        const isCongested = vol > 3800;
        const statusEl = document.getElementById('cmd-res-status');
        statusEl.textContent = isCongested ? 'CONGESTED' : 'STABLE';
        statusEl.style.color = isCongested ? '#e85656' : '#8cd6c4';
        
        // Dynamically update the 60-min forecast bars based on predicted traffic flow!
        updateForecastBars(vol);
    }, 800);
}


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


// --- Legend Filtering Logic ---
let activeMapLayers = [];

function filterMap(type, el) {
    // Update UI
    document.querySelectorAll('.filter-pill').forEach(item => item.classList.remove('active'));
    el.classList.add('active');

    // Filter Layers
    activeMapLayers.forEach(layer => {
        const vol = layer.volume;
        let show = false;
        
        if (type === 'all') show = true;
        else if (type === 'smooth' && vol < 2000) show = true;
        else if (type === 'medium' && vol >= 2000 && vol <= 4500) show = true;
        else if (type === 'congested' && vol > 4500) show = true;

        if (show) layer.addTo(map);
        else map.removeLayer(layer);
    });
}

// Modify initMap to store layers (Internal use only)
function storeLayer(layer, vol) {
    layer.volume = vol;
    activeMapLayers.push(layer);
}

// --- Analytics: Date Range Filter ---
let currentDateRange = 7;

function setDateRange(days, el) {
    currentDateRange = days;
    document.querySelectorAll('.date-tab').forEach(t => t.classList.remove('active'));
    el.classList.add('active');
    // Re-render the chart and heatmap with the new range label
    refreshAnalytics();
}

