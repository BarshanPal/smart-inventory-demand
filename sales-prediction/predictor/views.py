import joblib
import pandas as pd

from django.conf import settings
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status

from .models import SalesPrediction
from .seriyalizer import (
    SalesPredictionSerializer,
    ActualSalesSerializer
)

_model = None

def get_model():
    """Lazily load and cache the trained ML model."""
    global _model
    if _model is None:
        model_path = settings.BASE_DIR / 'random_forest_model.pkl'
        if not model_path.exists():
            alt_path = settings.BASE_DIR.parent / 'demand-forecasting-kernels-only' / 'random_forest_model.pkl'
            if alt_path.exists():
                model_path = alt_path

        loaded = joblib.load(model_path)
        # Check if saved artifact is a dictionary containing the model
        if isinstance(loaded, dict) and 'model' in loaded:
            _model = loaded['model']
        else:
            _model = loaded
    return _model


# Predict Sales
@api_view(['GET', 'POST'])
def predict_sales(request):
    if request.method == 'GET':
        predictions = SalesPrediction.objects.all().order_by('-id')[:50]
        serializer = SalesPredictionSerializer(predictions, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    serializer = SalesPredictionSerializer(data=request.data)

    if serializer.is_valid():
        date = serializer.validated_data['date']
        store = serializer.validated_data['store']
        item = serializer.validated_data['item']

        # Extract date features
        year = date.year
        month = date.month
        day = date.day
        day_of_week = date.weekday()

        # Prepare input for ML model (feature names matching training features)
        input_data = pd.DataFrame([{
            'store': store,
            'item': item,
            'year': year,
            'month': month,
            'day': day,
            'dayofweek': day_of_week
        }])

        # Predict sales
        ml_model = get_model()
        prediction = ml_model.predict(input_data)[0]

        # Save prediction in database
        sales = SalesPrediction.objects.create(
            date=date,
            store=store,
            item=item,
            predicted_sales=float(prediction)
        )

        return Response({
            'message': 'Sales predicted successfully',
            'data': SalesPredictionSerializer(sales).data
        }, status=status.HTTP_201_CREATED)

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# Update Actual Sales
@api_view(['GET', 'PATCH'])
def update_actual_sales(request, pk):
    try:
        sales = SalesPrediction.objects.get(id=pk)
    except SalesPrediction.DoesNotExist:
        return Response(
            {'error': 'Prediction not found'},
            status=status.HTTP_404_NOT_FOUND
        )

    if request.method == 'GET':
        return Response(SalesPredictionSerializer(sales).data)

    serializer = ActualSalesSerializer(
        sales,
        data=request.data,
        partial=True
    )

    if serializer.is_valid():
        serializer.save()

        return Response({
            'message': 'Actual sales updated successfully',
            'data': SalesPredictionSerializer(sales).data
        })

    return Response(
        serializer.errors,
        status=status.HTTP_400_BAD_REQUEST
    )
