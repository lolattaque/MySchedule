import datetime

from django.conf import settings
from django.db import models

DAY_CHOICES = [
    ('Mon', 'Monday'), ('Tue', 'Tuesday'), ('Wed', 'Wednesday'), ('Thu', 'Thursday'),
    ('Fri', 'Friday'), ('Sat', 'Saturday'), ('Sun', 'Sunday'),
]
DAY_ORDER = [d[0] for d in DAY_CHOICES]

CATEGORY_CHOICES = [
    ('class', 'Class'),
    ('gym', 'Fitness'),
    ('event', 'Event'),
]

WEEK_TYPE_CHOICES = [
    ('both', 'Every week'),
    ('A', 'Week A'),
    ('B', 'Week B'),
]

DEFAULT_COLOR = '#3E7BFA'


class Profile(models.Model):
    """Per-user preferences, including the reference date the A/B alternation is computed from."""

    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='profile')
    theme = models.CharField(max_length=10, default='system')  # system | light | dark
    hour_start = models.PositiveSmallIntegerField(default=7)
    hour_end = models.PositiveSmallIntegerField(default=22)
    # The Monday of the first week that should count as "Week A". Alternation is computed
    # from this date, so the app can show any past or future week correctly.
    week_a_anchor = models.DateField(default=datetime.date(2026, 1, 5))

    def computed_week_type(self, monday: datetime.date) -> str:
        delta_weeks = (monday - self._anchor_monday()).days // 7
        return 'A' if delta_weeks % 2 == 0 else 'B'

    def _anchor_monday(self) -> datetime.date:
        return self.week_a_anchor - datetime.timedelta(days=self.week_a_anchor.weekday())

    def week_type_for(self, monday: datetime.date) -> str:
        override = self.user.week_overrides.filter(week_monday=monday).first()
        if override:
            return override.week_type
        return self.computed_week_type(monday)


class WeekOverride(models.Model):
    """Lets a user manually correct the auto-computed A/B pattern for one specific week."""

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='week_overrides')
    week_monday = models.DateField()
    week_type = models.CharField(max_length=1, choices=[('A', 'Week A'), ('B', 'Week B')])

    class Meta:
        unique_together = ('user', 'week_monday')


class Event(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='events')
    category = models.CharField(max_length=10, choices=CATEGORY_CHOICES)

    # Shared / class fields
    title = models.CharField(max_length=200, blank=True)
    professor = models.CharField(max_length=150, blank=True)
    room = models.CharField(max_length=150, blank=True)

    # Gym fields
    activity = models.CharField(max_length=150, blank=True)

    # Event / gym shared
    location = models.CharField(max_length=150, blank=True)

    start_time = models.TimeField()
    end_time = models.TimeField()

    # Recurrence: either a set of weekdays (recurring) or a single specific date (one-time event)
    days = models.CharField(max_length=27, blank=True, help_text='Comma-separated: Mon,Wed,Fri')
    week_type = models.CharField(max_length=4, choices=WEEK_TYPE_CHOICES, default='both')
    is_one_time = models.BooleanField(default=False)
    date = models.DateField(null=True, blank=True)

    notes = models.TextField(blank=True)
    color = models.CharField(max_length=7, default=DEFAULT_COLOR)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['start_time']

    def day_list(self):
        return [d for d in self.days.split(',') if d]

    def display_title(self):
        if self.category == 'gym':
            return self.activity
        return self.title

    def display_subtitle(self):
        if self.category == 'class':
            return self.room
        return self.location

    def occurs_on(self, day_abbr: str, date_obj: datetime.date, week_type: str) -> bool:
        if self.is_one_time:
            return self.date == date_obj
        if day_abbr not in self.day_list():
            return False
        return self.week_type == 'both' or self.week_type == week_type

    def to_dict(self):
        return {
            'id': self.id,
            'category': self.category,
            'title': self.title,
            'professor': self.professor,
            'room': self.room,
            'activity': self.activity,
            'location': self.location,
            'startTime': self.start_time.strftime('%H:%M'),
            'endTime': self.end_time.strftime('%H:%M'),
            'days': self.day_list(),
            'weekType': self.week_type,
            'isOneTime': self.is_one_time,
            'date': self.date.isoformat() if self.date else None,
            'notes': self.notes,
            'color': self.color,
        }


class Task(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='tasks')
    text = models.CharField(max_length=280)
    done = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['done', '-created_at']

    def to_dict(self):
        return {'id': self.id, 'text': self.text, 'done': self.done}
