from django.contrib import admin
from django.urls import path, include
from core import views as core_views

urlpatterns = [
    path('admin/', admin.site.urls),
    path('', include('core.urls')),
    path('dashboard/', include('dashboard.urls')),
    path(
        "firebase-messaging-sw.js",
        core_views.firebase_messaging_sw,
        name="firebase-messaging-sw.js"
    ),
]
