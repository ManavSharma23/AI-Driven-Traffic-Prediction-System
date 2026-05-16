document.getElementById('prediction-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const submitBtn = document.getElementById('submit-btn');
    const btnText = document.getElementById('btn-text');
    const loader = document.getElementById('loader');
    const resultContainer = document.getElementById('result-container');
    const predictionNumber = document.getElementById('prediction-number');

    // UI Feedback: Loading state
    btnText.style.display = 'none';
    loader.style.display = 'block';
    submitBtn.disabled = true;
    resultContainer.style.display = 'none';

    // Collect data from form
    const formData = {
        date_time: document.getElementById('date_time').value.replace('T', ' ') + ':00',
        temp: parseFloat(document.getElementById('temp').value),
        rain_1h: parseFloat(document.getElementById('rain_1h').value),
        snow_1h: parseFloat(document.getElementById('snow_1h').value),
        clouds_all: parseInt(document.getElementById('clouds_all').value),
        weather_main: document.getElementById('weather_main').value
    };

    try {
        // Call our FastAPI backend
        const response = await fetch('http://127.0.0.1:8000/predict', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        if (!response.ok) {
            throw new Error('Server returned an error. Make sure the backend is running!');
        }

        const data = await response.json();

        // Update UI with result
        predictionNumber.textContent = Math.round(data.prediction).toLocaleString();
        resultContainer.style.display = 'block';
        
        // Scroll to result smoothly
        resultContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    } catch (error) {
        alert('Error: ' + error.message);
    } finally {
        // Reset button state
        btnText.style.display = 'block';
        loader.style.display = 'none';
        submitBtn.disabled = false;
    }
});
