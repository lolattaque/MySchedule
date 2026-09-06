from django.contrib import admin

from .models import Event, Profile, Task, WeekOverride


@admin.register(Profile)
class ProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'theme', 'hour_start', 'hour_end', 'week_a_anchor')


@admin.register(Event)
class EventAdmin(admin.ModelAdmin):
    list_display = ('user', 'category', 'display_title', 'start_time', 'end_time', 'days', 'week_type', 'is_one_time', 'date')
    list_filter = ('category', 'week_type', 'is_one_time')
    search_fields = ('title', 'activity', 'location', 'professor')


@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    list_display = ('user', 'text', 'done', 'created_at')
    list_filter = ('done',)


@admin.register(WeekOverride)
class WeekOverrideAdmin(admin.ModelAdmin):
    list_display = ('user', 'week_monday', 'week_type')
