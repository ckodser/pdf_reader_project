from django.urls import path
from . import views

# This is the URL configuration for the pdf_reader_app
urlpatterns = [
    # This pattern maps the root URL of the app to the 'index' view
    path('', views.index, name='index'),

    # NEW: API endpoints for the server-side caching system
    path('api/get-cache/<str:file_hash>/', views.get_cached_audio, name='get_cached_audio'),
    path('api/cache-audio/', views.cache_audio, name='cache_audio'),
]
