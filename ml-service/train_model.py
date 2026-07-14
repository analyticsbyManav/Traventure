"""
train_model.py

Trains and evaluates models for trip cost prediction, saves the best one.

Run: python train_model.py
Outputs:
  - model/trip_cost_model.joblib   (trained pipeline: preprocessing + regressor)
  - model/feature_importance.png
  - model/predicted_vs_actual.png
  - Printed evaluation metrics (R2, MAE, RMSE) for your project report
"""

import joblib
import numpy as np
import pandas as pd
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder

NUMERIC_FEATURES = [
    "city_cost_index", "num_days", "group_size", "avg_place_rating", "num_places",
    "pct_history", "pct_culture", "pct_nature", "pct_food", "pct_nightlife", "pct_shopping",
]
CATEGORICAL_FEATURES = ["budget_tier", "season"]
TARGET = "total_cost_inr"


def build_preprocessor():
    return ColumnTransformer(
        transformers=[
            ("num", "passthrough", NUMERIC_FEATURES),
            ("cat", OneHotEncoder(handle_unknown="ignore"), CATEGORICAL_FEATURES),
        ]
    )


def evaluate(name, model, X_test, y_test):
    preds = model.predict(X_test)
    mae = mean_absolute_error(y_test, preds)
    rmse = np.sqrt(mean_squared_error(y_test, preds))
    r2 = r2_score(y_test, preds)
    print(f"\n{name}")
    print(f"  R^2  : {r2:.4f}")
    print(f"  MAE  : Rs {mae:,.0f}")
    print(f"  RMSE : Rs {rmse:,.0f}")
    return {"name": name, "r2": r2, "mae": mae, "rmse": rmse, "preds": preds}


def main():
    df = pd.read_csv("data/trip_cost_dataset.csv")
    X = df[NUMERIC_FEATURES + CATEGORICAL_FEATURES]
    y = df[TARGET]

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    candidates = {
        "Linear Regression": LinearRegression(),
        "Random Forest": RandomForestRegressor(n_estimators=200, max_depth=12, random_state=42, n_jobs=-1),
        "Gradient Boosting": GradientBoostingRegressor(n_estimators=200, max_depth=3, learning_rate=0.1, random_state=42),
    }

    results = []
    fitted_pipelines = {}

    for name, model in candidates.items():
        pipe = Pipeline([("preprocess", build_preprocessor()), ("model", model)])
        pipe.fit(X_train, y_train)
        fitted_pipelines[name] = pipe
        results.append(evaluate(name, pipe, X_test, y_test))

    best = max(results, key=lambda r: r["r2"])
    best_pipeline = fitted_pipelines[best["name"]]
    print(f"\nBest model: {best['name']} (R^2 = {best['r2']:.4f}) -> saving.")

    joblib.dump(
        {
            "pipeline": best_pipeline,
            "numeric_features": NUMERIC_FEATURES,
            "categorical_features": CATEGORICAL_FEATURES,
            "metrics": {k: best[k] for k in ("r2", "mae", "rmse")},
            "model_name": best["name"],
        },
        "model/trip_cost_model.joblib",
    )

    # Predicted vs Actual plot
    plt.figure(figsize=(6, 6))
    plt.scatter(y_test, best["preds"], alpha=0.25, s=10, color="#2E5C8A")
    lims = [0, max(y_test.max(), best["preds"].max())]
    plt.plot(lims, lims, "r--", linewidth=1)
    plt.xlabel("Actual cost (INR)")
    plt.ylabel("Predicted cost (INR)")
    plt.title(f"Predicted vs Actual — {best['name']} (R2={best['r2']:.3f})")
    plt.tight_layout()
    plt.savefig("model/predicted_vs_actual.png", dpi=130)
    plt.close()

    # Feature importance (only for tree-based models)
    model_step = best_pipeline.named_steps["model"]
    if hasattr(model_step, "feature_importances_"):
        ohe = best_pipeline.named_steps["preprocess"].named_transformers_["cat"]
        cat_names = list(ohe.get_feature_names_out(CATEGORICAL_FEATURES))
        all_names = NUMERIC_FEATURES + cat_names
        importances = model_step.feature_importances_
        order = np.argsort(importances)[::-1]

        plt.figure(figsize=(8, 6))
        plt.barh(
            [all_names[i] for i in order][::-1],
            [importances[i] for i in order][::-1],
            color="#2E5C8A",
        )
        plt.xlabel("Importance")
        plt.title(f"Feature Importance — {best['name']}")
        plt.tight_layout()
        plt.savefig("model/feature_importance.png", dpi=130)
        plt.close()

    print("\nSaved model/trip_cost_model.joblib")
    print("Saved model/predicted_vs_actual.png")
    if hasattr(model_step, "feature_importances_"):
        print("Saved model/feature_importance.png")


if __name__ == "__main__":
    main()
