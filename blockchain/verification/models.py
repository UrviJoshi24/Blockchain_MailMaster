from django.db import models
import uuid

class User(models.Model):
    wallet_address = models.CharField(max_length=42, unique=True)  # Ethereum address (0x...)
    registered_at = models.DateTimeField(auto_now_add=True)  # Timestamp of registration
    nonce = models.CharField(max_length=255, default=str(uuid.uuid4))  # Unique random nonce

    def __str__(self):
        return self.wallet_address
