from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import joblib
import pandas as pd
import numpy as np
from datetime import datetime
import os

app = FastAPI(title="Traffic Prediction API")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load models and encoders
MODEL_PATH = "models/traffic_model.joblib"
ENCODER_PATH = "models/weather_encoder.joblib"

# Load at startup
if not os.path.exists(MODEL_PATH) or not os.path.exists(ENCODER_PATH):
    # We use relative paths assuming the server starts from project root
    MODEL_PATH = "../models/traffic_model.joblib"
    ENCODER_PATH = "../models/weather_encoder.joblib"

try:
    model = joblib.load(MODEL_PATH)
    encoder = joblib.load(ENCODER_PATH)
except Exception as e:
    print(f"Error loading models: {e}")

class TrafficInput(BaseModel):
    date_time: str # "YYYY-MM-DD HH:MM:SS"
    temp: float
    rain_1h: float
    snow_1h: float
    clouds_all: int
    weather_main: str

@app.get("/")
def read_root():
    return {"message": "Traffic Prediction API is running", "status": "online"}

@app.post("/predict")
def predict_traffic(data: TrafficInput):
    try:
        # Parse date_time
        dt = datetime.strptime(data.date_time, "%Y-%m-%d %T" if "T" in data.date_time else "%Y-%m-%d %H:%M:%S")
        return generate_prediction_data(dt, data)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/forecast")
def get_forecast(data: TrafficInput):
    try:
        base_dt = datetime.strptime(data.date_time, "%Y-%m-%d %T" if "T" in data.date_time else "%Y-%m-%d %H:%M:%S")
        forecast = []
        for i in range(24):
            future_dt = base_dt.replace(hour=(base_dt.hour + i) % 24)
            # Simple assumption: weather stays same for forecast for now
            pred = generate_prediction_data(future_dt, data)
            forecast.append({
                "hour": future_dt.hour,
                "volume": pred["prediction"]
            })
        return {"forecast": forecast}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

def generate_prediction_data(dt, data):
    hour = dt.hour
    day = dt.day
    month = dt.month
    weekday = dt.weekday()
    is_weekend = 1 if weekday >= 5 else 0
    is_rush_hour = 1 if (7 <= hour <= 9) or (16 <= hour <= 18) else 0
    
    # Weather Icon Mapping
    icon_map = {
        "Clear": "sun",
        "Clouds": "cloud",
        "Rain": "cloud-rain",
        "Snow": "snowflake",
        "Thunderstorm": "zap",
        "Drizzle": "cloud-drizzle",
        "Mist": "align-justify"
    }
    
    try:
        weather_enc = encoder.transform([data.weather_main])[0]
    except:
        weather_enc = 0
        
    features = np.array([[data.temp, data.rain_1h, data.snow_1h, data.clouds_all, 
                          weather_enc, hour, day, month, weekday, is_weekend, is_rush_hour]])
    
    volume = int(model.predict(features)[0])
    
    # Confidence Interval (+/- 8%)
    lower = int(volume * 0.92)
    upper = int(volume * 1.08)
    
    recommendation = "Excellent" if volume < 1500 else "Good" if volume < 3500 else "Busy" if volume < 5000 else "Avoid"
    reason = "Late night or off-peak hours" if hour < 6 or hour > 20 else "Standard traffic flow"
    if is_rush_hour: reason = "Peak rush hour traffic"
    if data.rain_1h > 2.0: reason += " + Heavy rain impact"
    
    return {
        "prediction": volume,
        "range": {"min": lower, "max": upper},
        "units": "vehicles per hour",
        "timestamp": dt.strftime("%Y-%m-%d %H:%M:%S"),
        "weather_icon": icon_map.get(data.weather_main, "cloud"),
        "city_context": "Minneapolis-St. Paul Hub",
        "insights": {
            "cars": int(volume * 0.75),
            "trucks": int(volume * 0.20),
            "motorcycles": int(volume * 0.05),
            "recommendation": recommendation,
            "reason": reason
        }
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
