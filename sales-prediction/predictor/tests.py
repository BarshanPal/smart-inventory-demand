from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from predictor.models import SalesPrediction


class SalesPredictionTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_predict_sales_valid(self):
        data = {
            'date': '2023-06-01',
            'store': 1,
            'item': 1
        }
        response = self.client.post('/api/predict/', data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('data', response.data)
        self.assertIsNotNone(response.data['data']['predicted_sales'])
        self.assertEqual(response.data['data']['store'], 1)
        self.assertEqual(response.data['data']['item'], 1)

    def test_predict_sales_invalid_store(self):
        data = {
            'date': '2023-06-01',
            'store': 0,  # Invalid: must be positive
            'item': 1
        }
        response = self.client.post('/api/predict/', data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_predict_sales_invalid_item(self):
        data = {
            'date': '2023-06-01',
            'store': 1,
            'item': 1000  # Invalid: must be between 1 and 999
        }
        response = self.client.post('/api/predict/', data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_update_actual_sales(self):
        prediction = SalesPrediction.objects.create(
            date='2023-06-01',
            store=1,
            item=1,
            predicted_sales=25.0
        )
        response = self.client.patch(
            f'/api/actual-sales/{prediction.id}/',
            {'actual_sales': 28.5},
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        prediction.refresh_from_db()
        self.assertEqual(prediction.actual_sales, 28.5)

    def test_get_predictions(self):
        SalesPrediction.objects.create(
            date='2023-06-01',
            store=1,
            item=1,
            predicted_sales=25.0
        )
        response = self.client.get('/api/predict/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(len(response.data) > 0)
