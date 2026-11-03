from django.urls import path
from .views import predict_sales, update_actual_sales

urlpatterns = [

    path('predict/', predict_sales, name='predict_sales'),

    path(
        'actual-sales/<int:pk>/',
        update_actual_sales,
        name='update_actual_sales'
    ),

]