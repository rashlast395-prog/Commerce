import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import List, Dict, Any
from firebase_admin import firestore

db = firestore.client()

class AnalyticsService:
    @staticmethod
    async def get_daily_analytics(date: datetime = None) -> Dict[str, Any]:
        if not date:
            date = datetime.now()
        
        start = date.replace(hour=0, minute=0, second=0, microsecond=0)
        end = start + timedelta(days=1)
        
        orders_ref = db.collection('orders')
        query = orders_ref.where('createdAt', '>=', start).where('createdAt', '<', end)
        docs = query.stream()
        
        orders = [doc.to_dict() for doc in docs]
        df = pd.DataFrame(orders) if orders else pd.DataFrame()
        
        total_orders = len(orders)
        total_revenue = df['total'].sum() if not df.empty else 0
        avg_order_value = total_revenue / total_orders if total_orders > 0 else 0
        unique_customers = df['customerId'].nunique() if not df.empty else 0
        
        status_counts = df['status'].value_counts().to_dict() if not df.empty else {}
        
        return {
            'date': date.strftime('%Y-%m-%d'),
            'total_orders': total_orders,
            'total_revenue': round(total_revenue, 2),
            'avg_order_value': round(avg_order_value, 2),
            'unique_customers': unique_customers,
            'status_breakdown': status_counts,
            'top_items': AnalyticsService._get_top_items(df),
            'hourly_breakdown': AnalyticsService._get_hourly_breakdown(df)
        }
    
    @staticmethod
    async def get_weekly_analytics() -> Dict[str, Any]:
        end = datetime.now()
        start = end - timedelta(days=7)
        
        orders_ref = db.collection('orders')
        query = orders_ref.where('createdAt', '>=', start).where('createdAt', '<=', end)
        docs = query.stream()
        
        orders = [doc.to_dict() for doc in docs]
        df = pd.DataFrame(orders) if orders else pd.DataFrame()
        
        return {
            'period': 'weekly',
            'start_date': start.strftime('%Y-%m-%d'),
            'end_date': end.strftime('%Y-%m-%d'),
            'total_orders': len(orders),
            'total_revenue': round(df['total'].sum(), 2) if not df.empty else 0,
            'daily_breakdown': AnalyticsService._get_daily_breakdown(df, 7),
            'top_customers': AnalyticsService._get_top_customers(df)
        }
    
    @staticmethod
    async def get_monthly_analytics() -> Dict[str, Any]:
        end = datetime.now()
        start = end - timedelta(days=30)
        
        orders_ref = db.collection('orders')
        query = orders_ref.where('createdAt', '>=', start).where('createdAt', '<=', end)
        docs = query.stream()
        
        orders = [doc.to_dict() for doc in docs]
        df = pd.DataFrame(orders) if orders else pd.DataFrame()
        
        return {
            'period': 'monthly',
            'start_date': start.strftime('%Y-%m-%d'),
            'end_date': end.strftime('%Y-%m-%d'),
            'total_orders': len(orders),
            'total_revenue': round(df['total'].sum(), 2) if not df.empty else 0,
            'daily_breakdown': AnalyticsService._get_daily_breakdown(df, 30),
            'top_customers': AnalyticsService._get_top_customers(df),
            'category_breakdown': AnalyticsService._get_category_breakdown(df)
        }
    
    @staticmethod
    def _get_top_items(df: pd.DataFrame, limit: int = 10) -> List[Dict]:
        if df.empty or 'items' not in df.columns:
            return []
        
        all_items = []
        for items in df['items']:
            if isinstance(items, list):
                all_items.extend([item.get('title', item) if isinstance(item, dict) else item for item in items])
        
        if not all_items:
            return []
        
        item_counts = pd.Series(all_items).value_counts().head(limit)
        return [{'item': item, 'count': int(count)} for item, count in item_counts.items()]
    
    @staticmethod
    def _get_hourly_breakdown(df: pd.DataFrame) -> List[Dict]:
        if df.empty or 'createdAt' not in df.columns:
            return []
        
        df['hour'] = pd.to_datetime(df['createdAt']).dt.hour
        hourly = df.groupby('hour').size().reset_index(name='orders')
        return hourly.to_dict('records')
    
    @staticmethod
    def _get_daily_breakdown(df: pd.DataFrame, days: int) -> List[Dict]:
        if df.empty or 'createdAt' not in df.columns:
            return []
        
        df['date'] = pd.to_datetime(df['createdAt']).dt.date
        daily = df.groupby('date').agg({'total': 'sum', 'id': 'count'}).reset_index()
        daily.columns = ['date', 'revenue', 'orders']
        return daily.tail(days).to_dict('records')
    
    @staticmethod
    def _get_top_customers(df: pd.DataFrame, limit: int = 10) -> List[Dict]:
        if df.empty or 'customerId' not in df.columns:
            return []
        
        top = df.groupby('customerId').agg({
            'total': 'sum',
            'id': 'count'
        }).reset_index()
        top.columns = ['customerId', 'total_spent', 'order_count']
        top = top.sort_values('total_spent', ascending=False).head(limit)
        return top.to_dict('records')
    
    @staticmethod
    def _get_category_breakdown(df: pd.DataFrame) -> List[Dict]:
        if df.empty or 'items' not in df.columns:
            return []
        
        categories = {}
        for items in df['items']:
            if isinstance(items, list):
                for item in items:
                    if isinstance(item, dict):
                        cat = item.get('category', 'Other')
                        categories[cat] = categories.get(cat, 0) + 1
        
        return [{'category': cat, 'count': count} for cat, count in sorted(categories.items(), key=lambda x: x[1], reverse=True)]

analytics_service = AnalyticsService()
