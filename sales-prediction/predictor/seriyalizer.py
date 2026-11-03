from rest_framework import serializers
from .models import SalesPrediction


class SalesPredictionSerializer(serializers.ModelSerializer):

    class Meta:
        model = SalesPrediction
        fields = ['id', 'date', 'store', 'item',
                  'predicted_sales', 'actual_sales']

        read_only_fields = ['id', 'predicted_sales', 'actual_sales']

    def validate_store(self, value):
        if value < 1:
            raise serializers.ValidationError(
                "Store ID must be positive."
            )
        return value

    def validate_item(self, value):
        if value < 1 or value > 999:
            raise serializers.ValidationError(
                "Item ID must be between 1 and 999."
            )
        return value


class ActualSalesSerializer(serializers.ModelSerializer):

    class Meta:
        model = SalesPrediction
        fields = ['actual_sales']