"""
Waste Classification Module
Supervised ML to classify waste into categories and analyze recycling potential.
Session 5: Waste Classification and Recycling Optimization.
"""

import numpy as np
import pandas as pd
from typing import List, Dict, Optional
from sklearn.ensemble import RandomForestClassifier
from sklearn.tree import DecisionTreeClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import confusion_matrix, classification_report, accuracy_score
from sklearn.preprocessing import LabelEncoder
import joblib
import os


WASTE_CATEGORIES = ["organic", "plastic", "paper", "metal", "glass", "other"]
RECYCLABLE = {"plastic", "paper", "metal", "glass"}
MODEL_DIR = os.path.join(os.path.dirname(__file__), "trained_models")


class WasteClassifier:
    """
    Classifies waste into categories using composition percentages from collections.
    Trains Random Forest and Decision Tree models, provides confusion matrix and
    recycling analytics.
    """

    def __init__(self):
        self.models = {}
        self.label_encoder = LabelEncoder()
        self.label_encoder.fit(WASTE_CATEGORIES)
        self.is_trained = False
        self._load_models()

    # ------------------------------------------------------------------ #
    #  Data preparation
    # ------------------------------------------------------------------ #

    @staticmethod
    def prepare_training_data(collections: List) -> pd.DataFrame:
        """
        Convert Collection ORM objects into a labelled DataFrame.
        The dominant waste type becomes the label.
        """
        rows = []
        for c in collections:
            composition = {
                "organic": c.organic_percent or 0,
                "plastic": c.plastic_percent or 0,
                "paper": c.paper_percent or 0,
                "metal": c.metal_percent or 0,
                "glass": c.glass_percent or 0,
                "other": c.other_percent or 0,
            }
            # Features: all percentages + weight
            row = {
                **composition,
                "weight_kg": c.waste_collected_kg or 0,
            }
            # Label: dominant category
            row["label"] = max(composition, key=composition.get)
            rows.append(row)

        return pd.DataFrame(rows)

    # ------------------------------------------------------------------ #
    #  Training
    # ------------------------------------------------------------------ #

    def train(self, collections: List) -> Dict:
        """
        Train both Random Forest and Decision Tree classifiers.

        Returns metrics for each model.
        """
        df = self.prepare_training_data(collections)
        if len(df) < 10:
            return {"error": "Need at least 10 collection records to train"}

        feature_cols = ["organic", "plastic", "paper", "metal", "glass", "other", "weight_kg"]
        X = df[feature_cols].values
        y = self.label_encoder.transform(df["label"].values)

        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.25, random_state=42, stratify=y
        )

        results = {}

        # Random Forest
        rf = RandomForestClassifier(n_estimators=100, random_state=42, max_depth=10)
        rf.fit(X_train, y_train)
        rf_pred = rf.predict(X_test)
        self.models["random_forest"] = rf

        results["random_forest"] = {
            "accuracy": round(float(accuracy_score(y_test, rf_pred)) * 100, 2),
            "feature_importance": {
                feature_cols[i]: round(float(rf.feature_importances_[i]), 4)
                for i in range(len(feature_cols))
            },
        }

        # Decision Tree
        dt = DecisionTreeClassifier(random_state=42, max_depth=8)
        dt.fit(X_train, y_train)
        dt_pred = dt.predict(X_test)
        self.models["decision_tree"] = dt

        results["decision_tree"] = {
            "accuracy": round(float(accuracy_score(y_test, dt_pred)) * 100, 2),
            "feature_importance": {
                feature_cols[i]: round(float(dt.feature_importances_[i]), 4)
                for i in range(len(feature_cols))
            },
        }

        self.is_trained = True
        self._save_models()

        # Store test data for confusion matrix
        self._last_y_test = y_test
        self._last_rf_pred = rf_pred
        self._last_dt_pred = dt_pred

        return {
            "status": "trained",
            "samples_total": len(df),
            "samples_train": len(X_train),
            "samples_test": len(X_test),
            "models": results,
        }

    # ------------------------------------------------------------------ #
    #  Prediction
    # ------------------------------------------------------------------ #

    def classify(self, sample: Dict, model_type: str = "random_forest") -> Dict:
        """
        Classify a waste sample given composition percentages.
        """
        if model_type not in self.models:
            return {"error": f"Model '{model_type}' not trained"}

        features = np.array([[
            sample.get("organic", 0),
            sample.get("plastic", 0),
            sample.get("paper", 0),
            sample.get("metal", 0),
            sample.get("glass", 0),
            sample.get("other", 0),
            sample.get("weight_kg", 0),
        ]])

        model = self.models[model_type]
        pred = model.predict(features)[0]
        proba = model.predict_proba(features)[0]

        category = self.label_encoder.inverse_transform([pred])[0]
        confidence = round(float(max(proba)) * 100, 2)

        return {
            "predicted_category": category,
            "confidence_percent": confidence,
            "is_recyclable": category in RECYCLABLE,
            "probabilities": {
                self.label_encoder.inverse_transform([i])[0]: round(float(p) * 100, 2)
                for i, p in enumerate(proba)
            },
        }

    # ------------------------------------------------------------------ #
    #  Confusion Matrix
    # ------------------------------------------------------------------ #

    def get_confusion_matrix(self, model_type: str = "random_forest") -> Dict:
        """
        Get confusion matrix from last training run.
        """
        if not self.is_trained:
            return {"error": "Model not trained yet"}

        y_test = self._last_y_test
        y_pred = self._last_rf_pred if model_type == "random_forest" else self._last_dt_pred

        cm = confusion_matrix(y_test, y_pred)
        labels = self.label_encoder.classes_.tolist()

        # Trim labels/cm to only classes present in test set
        present = sorted(set(y_test) | set(y_pred))
        labels_present = [labels[i] for i in present]

        return {
            "model_type": model_type,
            "labels": labels_present,
            "matrix": cm.tolist(),
            "report": classification_report(
                y_test, y_pred,
                target_names=labels,
                output_dict=True,
                zero_division=0,
            ),
        }

    # ------------------------------------------------------------------ #
    #  Recycling Analytics
    # ------------------------------------------------------------------ #

    @staticmethod
    def get_recycling_stats(collections: List) -> Dict:
        """
        Analyze recyclable vs non-recyclable waste across collections.
        Returns per-zone and overall recycling percentages.
        """
        if not collections:
            return {"error": "No collection data available"}

        zone_data = {}
        total_recyclable = 0
        total_weight = 0

        for c in collections:
            zone = "Unknown"
            if hasattr(c, "bin") and c.bin and hasattr(c.bin, "zone"):
                zone = c.bin.zone or "Unknown"

            if zone not in zone_data:
                zone_data[zone] = {
                    "total_kg": 0,
                    "organic_kg": 0,
                    "plastic_kg": 0,
                    "paper_kg": 0,
                    "metal_kg": 0,
                    "glass_kg": 0,
                    "other_kg": 0,
                    "recyclable_kg": 0,
                    "count": 0,
                }

            weight = c.waste_collected_kg or 0
            zd = zone_data[zone]
            zd["total_kg"] += weight
            zd["count"] += 1

            organic = weight * (c.organic_percent or 0) / 100
            plastic = weight * (c.plastic_percent or 0) / 100
            paper = weight * (c.paper_percent or 0) / 100
            metal = weight * (c.metal_percent or 0) / 100
            glass = weight * (c.glass_percent or 0) / 100
            other = weight * (c.other_percent or 0) / 100

            zd["organic_kg"] += organic
            zd["plastic_kg"] += plastic
            zd["paper_kg"] += paper
            zd["metal_kg"] += metal
            zd["glass_kg"] += glass
            zd["other_kg"] += other

            recyclable = plastic + paper + metal + glass
            zd["recyclable_kg"] += recyclable
            total_recyclable += recyclable
            total_weight += weight

        # Build zone summaries
        zones_summary = []
        for zone, zd in zone_data.items():
            recycle_pct = round((zd["recyclable_kg"] / zd["total_kg"] * 100), 2) if zd["total_kg"] > 0 else 0
            zones_summary.append({
                "zone": zone,
                "total_collected_kg": round(zd["total_kg"], 2),
                "recyclable_kg": round(zd["recyclable_kg"], 2),
                "recycling_percent": recycle_pct,
                "collections_count": zd["count"],
                "composition": {
                    "organic": round(zd["organic_kg"], 2),
                    "plastic": round(zd["plastic_kg"], 2),
                    "paper": round(zd["paper_kg"], 2),
                    "metal": round(zd["metal_kg"], 2),
                    "glass": round(zd["glass_kg"], 2),
                    "other": round(zd["other_kg"], 2),
                },
            })

        overall_pct = round((total_recyclable / total_weight * 100), 2) if total_weight > 0 else 0

        return {
            "overall_recycling_percent": overall_pct,
            "total_waste_collected_kg": round(total_weight, 2),
            "total_recyclable_kg": round(total_recyclable, 2),
            "zones": sorted(zones_summary, key=lambda x: x["recycling_percent"], reverse=True),
        }

    # ------------------------------------------------------------------ #
    #  Persistence
    # ------------------------------------------------------------------ #

    def _save_models(self):
        os.makedirs(MODEL_DIR, exist_ok=True)
        for name, model in self.models.items():
            path = os.path.join(MODEL_DIR, f"waste_classifier_{name}.pkl")
            joblib.dump(model, path)

    def _load_models(self):
        for name in ["random_forest", "decision_tree"]:
            path = os.path.join(MODEL_DIR, f"waste_classifier_{name}.pkl")
            if os.path.exists(path):
                self.models[name] = joblib.load(path)
                self.is_trained = True
