from django.contrib import admin
from .models import SalesPrediction

@admin.register(SalesPrediction)
class SalesPredictionAdmin(admin.ModelAdmin):
    list_display = ('id', 'store', 'item', 'date', 'predicted_sales', 'actual_sales')
    list_filter = ('store', 'item', 'date')
    search_fields = ('store', 'item')
