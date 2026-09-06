from django.conf import settings
from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import Profile, Task, Event


@receiver(post_save, sender=settings.AUTH_USER_MODEL)
def create_profile_and_starter_data(sender, instance, created, **kwargs):
    if not created:
        return
    Profile.objects.create(user=instance)

    Task.objects.bulk_create([
        Task(user=instance, text='Try editing this reminder, or add your own', done=False),
        Task(user=instance, text='Add your real classes with "Add to routine"', done=False),
    ])

    Event.objects.bulk_create([
        Event(
            user=instance, category='class', title='Data Structures',
            professor='Dr. Alina Voss', room='Eng Bldg · Rm 214',
            start_time='09:00', end_time='10:30', days='Mon,Wed', week_type='both',
            notes='Bring laptop for lab exercises.', color='#3E7BFA',
        ),
        Event(
            user=instance, category='gym', activity='Push Day — Strength',
            location='Campus Rec Center',
            start_time='07:00', end_time='08:00', days='Mon,Wed,Fri', week_type='both',
            color='#3FB27F',
        ),
        Event(
            user=instance, category='event', title='Study Group — Finals Prep',
            location='Library, 2nd floor',
            start_time='18:00', end_time='19:30', days='Tue', week_type='both',
            color='#E15C88',
        ),
    ])
