from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import inch
import matplotlib.pyplot as plt
import matplotlib
matplotlib.use('Agg')
import io
import base64
from typing import Dict, Any, List
from datetime import datetime

class ReportService:
    @staticmethod
    def generate_daily_pdf_report(analytics: Dict[str, Any]) -> bytes:
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=letter)
        styles = getSampleStyleSheet()
        story = []
        
        story.append(Paragraph(f"Daily Analytics Report - {analytics['date']}", styles['Title']))
        story.append(Spacer(1, 0.2 * inch))
        
        data = [
            ['Metric', 'Value'],
            ['Total Orders', str(analytics['total_orders'])],
            ['Total Revenue', f"${analytics['total_revenue']:.2f}"],
            ['Average Order Value', f"${analytics['avg_order_value']:.2f}"],
            ['Unique Customers', str(analytics['unique_customers'])]
        ]
        
        table = Table(data, colWidths=[3 * inch, 3 * inch])
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#e8281a')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 14),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor('#f8f9fa')),
            ('GRID', (0, 0), (-1, -1), 1, colors.grey)
        ]))
        
        story.append(table)
        doc.build(story)
        buffer.seek(0)
        return buffer.getvalue()
    
    @staticmethod
    def generate_revenue_chart(daily_data: List[Dict]) -> str:
        if not daily_data:
            return ""
        
        dates = [d['date'] for d in daily_data]
        revenues = [d['revenue'] for d in daily_data]
        
        plt.figure(figsize=(10, 6))
        plt.plot(dates, revenues, marker='o', linewidth=2, markersize=6, color='#e8281a')
        plt.fill_between(dates, revenues, alpha=0.3, color='#e8281a')
        plt.title('Daily Revenue Trend', fontsize=16, fontweight='bold')
        plt.xlabel('Date', fontsize=12)
        plt.ylabel('Revenue ($)', fontsize=12)
        plt.xticks(rotation=45)
        plt.grid(True, alpha=0.3)
        plt.tight_layout()
        
        buffer = io.BytesIO()
        plt.savefig(buffer, format='png', dpi=150)
        buffer.seek(0)
        plt.close()
        
        return base64.b64encode(buffer.getvalue()).decode()
    
    @staticmethod
    def generate_category_chart(category_data: List[Dict]) -> str:
        if not category_data:
            return ""
        
        categories = [d['category'] for d in category_data]
        counts = [d['count'] for d in category_data]
        
        plt.figure(figsize=(8, 8))
        plt.pie(counts, labels=categories, autopct='%1.1f%%', startangle=90)
        plt.title('Orders by Category', fontsize=16, fontweight='bold')
        plt.tight_layout()
        
        buffer = io.BytesIO()
        plt.savefig(buffer, format='png', dpi=150)
        buffer.seek(0)
        plt.close()
        
        return base64.b64encode(buffer.getvalue()).decode()

report_service = ReportService()
