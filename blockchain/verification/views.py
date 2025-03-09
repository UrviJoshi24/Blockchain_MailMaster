
from django.shortcuts import render
import json
import web3
import uuid
import time
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.utils.timezone import now
from django.core.cache import cache  # Rate-limiting
from .models import User
from eth_account.messages import encode_defunct
import random
import string
from django.http import JsonResponse
from django.contrib.auth import logout
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt

w3 = web3.Web3()

# Function to generate a random nonce
def generate_nonce():
    return ''.join(random.choices(string.ascii_letters + string.digits, k=32))

@csrf_exempt
def register(request):
    if request.method == "POST":
        try:
            data = json.loads(request.body)
            wallet_address = data.get("wallet_address")

            if not wallet_address:
                return JsonResponse({"error": "Missing wallet address"}, status=400)

            # Check if user exists, else create a new one with a nonce
            user, created = User.objects.get_or_create(wallet_address=wallet_address)
            if created:
                user.nonce = generate_nonce()  # Assign new nonce
                user.save()

            return JsonResponse({
                "message": "Registration successful" if created else "User already registered",
                "wallet_address": wallet_address,
                "nonce": user.nonce
            }, status=200)

        except Exception as e:
            return JsonResponse({"error": str(e)}, status=500)

@csrf_exempt
def get_nonce(request):
    if request.method == "POST":
        try:
            data = json.loads(request.body)
            wallet_address = data.get("wallet_address")

            if not wallet_address:
                return JsonResponse({"error": "Missing wallet address"}, status=400)

            user = User.objects.filter(wallet_address=wallet_address).first()
            if not user:
                return JsonResponse({"error": "User not registered"}, status=404)

            # Generate and store a nonce for the user (ensure it's a UUID)
            nonce = str(uuid.uuid4())  # Call uuid4() to get a generated UUID

            # Optionally, save the nonce in the database for verification later
            user.nonce = nonce  # Save the generated nonce to the User model
            user.save()

            return JsonResponse({"nonce": nonce}, status=200)

        except Exception as e:
            return JsonResponse({"error": str(e)}, status=500)


@csrf_exempt
def login(request):
    if request.method == "POST":
        try:
            data = json.loads(request.body)
            wallet_address = data.get("wallet_address")
            signature = data.get("signature")

            if not wallet_address or not signature:
                return JsonResponse({"error": "Missing parameters"}, status=400)

            # Rate-limit login attempts (Max 5 per minute)
            rate_limit_key = f"login_attempts_{wallet_address}"
            attempts = cache.get(rate_limit_key, 0)

            if attempts >= 5:
                return JsonResponse({"error": "Too many login attempts. Try again later."}, status=429)

            cache.set(rate_limit_key, attempts + 1, timeout=60)  # Store attempts for 1 minute

            user = User.objects.filter(wallet_address=wallet_address).first()
            if not user:
                return JsonResponse({"error": "User not registered"}, status=404)

            # Use nonce for verification
            message = f"Sign this message to verify your identity: {user.nonce}"
            message_encoded = encode_defunct(text=message)

            # Recover address from signature
            recovered_address = w3.eth.account.recover_message(message_encoded, signature=signature)

            if recovered_address.lower() != wallet_address.lower():
                return JsonResponse({"error": "Invalid signature"}, status=401)

            # Reset nonce after successful login
            user.nonce = generate_nonce()
            user.save()

            return JsonResponse({
                "message": "Login successful",
                "wallet_address": wallet_address,
                "redirect_url": "/dashboard/",  # This is the URL to redirect after a successful login
            }, status=200)

        except Exception as e:
            return JsonResponse({"error": str(e)}, status=500)


def index(request):
    return render(request, 'apps/test.html')


def dashboard(request):
    return render(request, 'apps/dashboard.html')


def logout_user(request):
    # Invalidate the user's session (if using Django's session authentication)
    logout(request)

    # Optionally, remove any tokens from the database if using JWT or other token-based authentication
    return JsonResponse({"message": "Logged out successfully"})

