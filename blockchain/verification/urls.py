from django.urls import path
from . import views

urlpatterns = [
    path('hello/', views.index, name='index'),
    path("api/register/", views.register, name="register"),
    path("api/login/", views.login, name="login"),
    path('api/get_nonce/', views.get_nonce, name='get_nonce'),
    path('dashboard/', views.dashboard, name='dashboard'),
    path('api/logout/', views.logout_user, name='logout_user'),
]
