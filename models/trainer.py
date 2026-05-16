import pandas as pd
import numpy as np
from sklearn.linear_model import LinearRegression
from sklearn.ensemble import RandomForestRegressor
from xgboost import XGBRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
import joblib
import os

def load_data():
    X_train = pd.read_csv('dataset/processed/X_train.csv')
    X_val = pd.read_csv('dataset/processed/X_val.csv')
    y_train = pd.read_csv('dataset/processed/y_train.csv').values.flatten()
    y_val = pd.read_csv('dataset/processed/y_val.csv').values.flatten()
    return X_train, X_val, y_train, y_val

def train_and_evaluate():
    X_train, X_val, y_train, y_val = load_data()
    
    models = {
        'LinearRegression': LinearRegression(),
        'RandomForest': RandomForestRegressor(n_estimators=100, random_state=42),
        'XGBoost': XGBRegressor(n_estimators=100, learning_rate=0.1, random_state=42)
    }
    
    best_mae = float('inf')
    best_model = None
    best_model_name = ""
    
    results = []
    
    for name, model in models.items():
        print(f"Training {name}...")
        model.fit(X_train, y_train)
        preds = model.predict(X_val)
        
        mae = mean_absolute_error(y_val, preds)
        rmse = np.sqrt(mean_squared_error(y_val, preds))
        r2 = r2_score(y_val, preds)
        
        print(f"{name} - MAE: {mae:.2f}, RMSE: {rmse:.2f}, R2: {r2:.2f}")
        results.append({'Model': name, 'MAE': mae, 'RMSE': rmse, 'R2': r2})
        
        if mae < best_mae:
            best_mae = mae
            best_model = model
            best_model_name = name
            
    print(f"\nBest Model: {best_model_name} with MAE: {best_mae:.2f}")
    
    # Save the best model
    joblib.dump(best_model, f'models/traffic_model.joblib')
    print(f"Saved best model to models/traffic_model.joblib")
    
    # Save results to a CSV in models/ for reference
    pd.DataFrame(results).to_csv('models/model_results.csv', index=False)

if __name__ == "__main__":
    train_and_evaluate()
