import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import List, Dict, Any
from sklearn.ensemble import RandomForestRegressor
from sklearn.cluster import KMeans
from firebase_admin import firestore

db = firestore.client()

class MLService:
    @staticmethod
    async def predict_demand(days_ahead: int = 7) -> Dict[str, Any]:
        orders_ref = db.collection('orders')
        docs = orders_ref.stream()
        
        orders = []
        for doc in docs:
            data = doc.to_dict()
            if 'createdAt' in data:
                orders.append(data)
        
        if not orders:
            return {'predictions': [], 'message': 'Insufficient data'}
        
        df = pd.DataFrame(orders)
        df['date'] = pd.to_datetime(df['createdAt']).dt.date
        daily = df.groupby('date').size().reset_index(name='orders')
        daily['date_ordinal'] = pd.to_datetime(daily['date']).map(datetime.toordinal)
        
        if len(daily) < 7:
            return {'predictions': [], 'message': 'Need at least 7 days of data'}
        
        X = daily[['date_ordinal']].values
        y = daily['orders'].values
        
        model = RandomForestRegressor(n_estimators=100, random_state=42)
        model.fit(X, y)
        
        predictions = []
        last_date = daily['date'].max()
        
        for i in range(1, days_ahead + 1):
            future_date = last_date + timedelta(days=i)
            future_ordinal = pd.to_datetime(future_date).toordinal()
            predicted = max(0, int(model.predict([[future_ordinal]])[0]))
            
            predictions.append({
                'date': future_date.strftime('%Y-%m-%d'),
                'predicted_orders': predicted,
                'confidence': 'high' if i <= 3 else 'medium'
            })
        
        return {
            'days_ahead': days_ahead,
            'predictions': predictions,
            'model': 'RandomForest',
            'trained_on': len(daily)
        }
    
    @staticmethod
    async def segment_customers() -> Dict[str, Any]:
        orders_ref = db.collection('orders')
        docs = orders_ref.stream()
        
        orders = [doc.to_dict() for doc in docs]
        if not orders:
            return {'segments': [], 'message': 'No customer data'}
        
        df = pd.DataFrame(orders)
        customer_stats = df.groupby('customerId').agg({
            'total': ['sum', 'mean', 'count'],
            'id': 'count'
        }).reset_index()
        
        customer_stats.columns = ['customerId', 'total_spent', 'avg_order_value', 'order_count', 'orders']
        
        if len(customer_stats) < 3:
            return {'segments': [], 'message': 'Need at least 3 customers'}
        
        features = customer_stats[['total_spent', 'avg_order_value', 'order_count']].fillna(0)
        kmeans = KMeans(n_clusters=3, random_state=42, n_init=10)
        customer_stats['segment'] = kmeans.fit_predict(features)
        
        segment_names = {
            0: 'Low Value',
            1: 'Medium Value',
            2: 'High Value'
        }
        
        segments = []
        for segment_id in sorted(customer_stats['segment'].unique()):
            segment_data = customer_stats[customer_stats['segment'] == segment_id]
            segments.append({
                'segment_id': int(segment_id),
                'segment_name': segment_names.get(segment_id, f'Segment {segment_id}'),
                'customer_count': len(segment_data),
                'avg_spent': round(segment_data['total_spent'].mean(), 2),
                'avg_orders': round(segment_data['order_count'].mean(), 1)
            })
        
        return {'segments': segments}
    
    @staticmethod
    async def detect_anomalies() -> Dict[str, Any]:
        orders_ref = db.collection('orders')
        docs = orders_ref.stream()
        
        orders = [doc.to_dict() for doc in docs]
        if not orders:
            return {'anomalies': [], 'message': 'No data'}
        
        df = pd.DataFrame(orders)
        
        if 'total' not in df.columns or len(df) < 10:
            return {'anomalies': [], 'message': 'Insufficient data'}
        
        mean = df['total'].mean()
        std = df['total'].std()
        threshold = mean + 3 * std
        
        anomalies = df[df['total'] > threshold].to_dict('records')
        
        return {
            'threshold': round(threshold, 2),
            'mean': round(mean, 2),
            'anomalies': anomalies[:10],
            'total_checked': len(df)
        }

ml_service = MLService()
