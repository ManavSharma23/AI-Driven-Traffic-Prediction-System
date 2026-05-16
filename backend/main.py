from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import joblib
import pandas as pd
import numpy as np
from datetime import datetime
import os

app = FastAPI(title="Traffic Prediction API")

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
        
        # Feature Engineering (Same as Phase 2)
        hour = dt.hour
        day = dt.day
        month = dt.month
        weekday = dt.weekday()
        is_weekend = 1 if weekday >= 5 else 0
        is_rush_hour = 1 if (7 <= hour <= 9) or (16 <= hour <= 18) else 0
        
        # Encode weather_main
        try:
            weather_enc = encoder.transform([data.weather_main])[0]
        except:
            weather_enc = 0 # Default fallback
            
        # Prepare feature array
        # Order must match training: ['temp', 'rain_1h', 'snow_1h', 'clouds_all', 'weather_main_enc', 'hour', 'day', 'month', 'weekday', 'is_weekend', 'is_rush_hour']
        features = np.array([[
            data.temp,
            data.rain_1h,
            data.snow_1h,
            data.clouds_all,
            weather_enc,
            hour,
            day,
            month,
            weekday,
            is_weekend,
            is_rush_hour
        ]])
        
        # Predict
        prediction = model.predict(features)[0]
        
        return {
            "prediction": round(float(prediction), 2),
            "units": "vehicles per hour",
            "timestamp": data.date_time
        }
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
