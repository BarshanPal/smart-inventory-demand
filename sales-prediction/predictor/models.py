from django.db import models

class SalesPrediction(models.Model):

    date = models.DateField()
    store = models.IntegerField()
    item = models.IntegerField()

    predicted_sales = models.FloatField(null=True, blank=True)
    actual_sales = models.FloatField(null=True, blank=True)

    def __str__(self):
        return f"Store {self.store} - Item {self.item}"