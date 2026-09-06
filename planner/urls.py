from django.urls import path

from . import views

app_name = 'planner'

urlpatterns = [
    path('', views.week_view, name='week'),
    path('api/events', views.api_events, name='api_events'),
    path('api/events/<int:pk>', views.api_event_detail, name='api_event_detail'),
    path('api/tasks', views.api_tasks, name='api_tasks'),
    path('api/tasks/<int:pk>', views.api_task_detail, name='api_task_detail'),
    path('api/week-override', views.api_week_override, name='api_week_override'),
    path('api/settings', views.api_settings, name='api_settings'),
    path('api/export', views.api_export, name='api_export'),
    path('api/import', views.api_import, name='api_import'),
    path('api/clear-all', views.api_clear_all, name='api_clear_all'),
]
