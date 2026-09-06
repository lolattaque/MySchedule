import datetime
import json

from django.contrib.auth.decorators import login_required
from django.http import JsonResponse, HttpResponseBadRequest
from django.shortcuts import render, get_object_or_404
from django.views.decorators.http import require_http_methods

from .models import DAY_ORDER, Event, Task, WeekOverride

TIME_FMT = '%H:%M'


def _monday_of(date_obj: datetime.date) -> datetime.date:
    return date_obj - datetime.timedelta(days=date_obj.weekday())


def _parse_week_param(request) -> datetime.date:
    raw = request.GET.get('week')
    if raw:
        try:
            return _monday_of(datetime.date.fromisoformat(raw))
        except ValueError:
            pass
    return _monday_of(datetime.date.today())


@login_required
def week_view(request):
    profile = request.user.profile
    monday = _parse_week_param(request)
    week_dates = [monday + datetime.timedelta(days=i) for i in range(7)]
    week_type = profile.week_type_for(monday)
    has_override = WeekOverride.objects.filter(user=request.user, week_monday=monday).exists()

    events = Event.objects.filter(user=request.user)
    today = datetime.date.today()

    grid_events = []
    for ev in events:
        for i, d in enumerate(week_dates):
            if ev.occurs_on(DAY_ORDER[i], d, week_type):
                payload = ev.to_dict()
                payload['columnDate'] = d.isoformat()
                grid_events.append(payload)
                break  # a recurring event can only land on one column per week

    context = {
        'profile': profile,
        'monday': monday,
        'prev_week': (monday - datetime.timedelta(days=7)).isoformat(),
        'next_week': (monday + datetime.timedelta(days=7)).isoformat(),
        'today_week': _monday_of(today).isoformat(),
        'week_dates': week_dates,
        'day_order': DAY_ORDER,
        'week_type': week_type,
        'has_override': has_override,
        'is_current_week': monday == _monday_of(today),
        'range_label': f"{monday.strftime('%b %d')} – {week_dates[-1].strftime('%b %d, %Y')}",
        'initial_data': {
            'events': grid_events,
            'tasks': [t.to_dict() for t in Task.objects.filter(user=request.user)],
            'weekMonday': monday.isoformat(),
            'weekType': week_type,
            'hasOverride': has_override,
            'todayIso': today.isoformat(),
            'hours': {'start': profile.hour_start, 'end': profile.hour_end},
            'theme': profile.theme,
        },
    }
    return render(request, 'planner/dashboard.html', context)


def _event_from_payload(data, user, instance=None):
    ev = instance or Event(user=user)
    ev.category = data.get('category', 'class')
    ev.title = (data.get('title') or '').strip()
    ev.professor = (data.get('professor') or '').strip()
    ev.room = (data.get('room') or '').strip()
    ev.activity = (data.get('activity') or '').strip()
    ev.location = (data.get('location') or '').strip()
    ev.start_time = datetime.datetime.strptime(data['startTime'], TIME_FMT).time()
    ev.end_time = datetime.datetime.strptime(data['endTime'], TIME_FMT).time()
    ev.is_one_time = bool(data.get('isOneTime'))
    if ev.is_one_time:
        ev.date = datetime.date.fromisoformat(data['date']) if data.get('date') else None
        ev.days = ''
        ev.week_type = 'both'
    else:
        ev.date = None
        ev.days = ','.join(data.get('days') or [])
        ev.week_type = data.get('weekType', 'both')
    ev.notes = (data.get('notes') or '').strip()
    ev.color = data.get('color') or '#3E7BFA'
    return ev


@login_required
@require_http_methods(['GET', 'POST'])
def api_events(request):
    if request.method == 'GET':
        return JsonResponse({'events': [e.to_dict() for e in Event.objects.filter(user=request.user)]})

    try:
        data = json.loads(request.body)
    except json.JSONDecodeError:
        return HttpResponseBadRequest('Invalid JSON')

    if not data.get('startTime') or not data.get('endTime'):
        return JsonResponse({'error': 'Start and end time are required.'}, status=400)
    if data['endTime'] <= data['startTime']:
        return JsonResponse({'error': 'End time must be after start time.'}, status=400)

    ev = _event_from_payload(data, request.user)
    ev.save()
    return JsonResponse({'event': ev.to_dict()}, status=201)


@login_required
@require_http_methods(['PUT', 'DELETE'])
def api_event_detail(request, pk):
    ev = get_object_or_404(Event, pk=pk, user=request.user)

    if request.method == 'DELETE':
        ev.delete()
        return JsonResponse({'ok': True})

    try:
        data = json.loads(request.body)
    except json.JSONDecodeError:
        return HttpResponseBadRequest('Invalid JSON')

    if data.get('endTime', '') <= data.get('startTime', ''):
        return JsonResponse({'error': 'End time must be after start time.'}, status=400)

    ev = _event_from_payload(data, request.user, instance=ev)
    ev.save()
    return JsonResponse({'event': ev.to_dict()})


@login_required
@require_http_methods(['GET', 'POST'])
def api_tasks(request):
    if request.method == 'GET':
        return JsonResponse({'tasks': [t.to_dict() for t in Task.objects.filter(user=request.user)]})

    try:
        data = json.loads(request.body)
    except json.JSONDecodeError:
        return HttpResponseBadRequest('Invalid JSON')
    text = (data.get('text') or '').strip()
    if not text:
        return JsonResponse({'error': 'Reminder text is required.'}, status=400)
    task = Task.objects.create(user=request.user, text=text[:280])
    return JsonResponse({'task': task.to_dict()}, status=201)


@login_required
@require_http_methods(['PATCH', 'DELETE'])
def api_task_detail(request, pk):
    task = get_object_or_404(Task, pk=pk, user=request.user)
    if request.method == 'DELETE':
        task.delete()
        return JsonResponse({'ok': True})
    try:
        data = json.loads(request.body)
    except json.JSONDecodeError:
        return HttpResponseBadRequest('Invalid JSON')
    if 'done' in data:
        task.done = bool(data['done'])
        task.save()
    return JsonResponse({'task': task.to_dict()})


@login_required
@require_http_methods(['POST', 'DELETE'])
def api_week_override(request):
    try:
        data = json.loads(request.body)
        monday = datetime.date.fromisoformat(data['weekMonday'])
    except (json.JSONDecodeError, KeyError, ValueError):
        return HttpResponseBadRequest('Invalid payload')

    if request.method == 'DELETE':
        WeekOverride.objects.filter(user=request.user, week_monday=monday).delete()
        return JsonResponse({'ok': True, 'weekType': request.user.profile.computed_week_type(monday)})

    week_type = data.get('weekType')
    if week_type not in ('A', 'B'):
        return HttpResponseBadRequest('Invalid week type')

    WeekOverride.objects.update_or_create(
        user=request.user, week_monday=monday, defaults={'week_type': week_type}
    )
    return JsonResponse({'ok': True, 'weekType': week_type})


@login_required
@require_http_methods(['POST'])
def api_settings(request):
    try:
        data = json.loads(request.body)
    except json.JSONDecodeError:
        return HttpResponseBadRequest('Invalid JSON')

    profile = request.user.profile
    if 'theme' in data and data['theme'] in ('system', 'light', 'dark'):
        profile.theme = data['theme']
    if 'hourStart' in data and 'hourEnd' in data:
        try:
            hs, he = int(data['hourStart']), int(data['hourEnd'])
            if 0 <= hs < he <= 24:
                profile.hour_start, profile.hour_end = hs, he
        except (TypeError, ValueError):
            pass
    if 'weekAAnchor' in data:
        try:
            profile.week_a_anchor = datetime.date.fromisoformat(data['weekAAnchor'])
        except ValueError:
            pass
    profile.save()
    return JsonResponse({'ok': True})


@login_required
@require_http_methods(['GET'])
def api_export(request):
    profile = request.user.profile
    payload = {
        'events': [e.to_dict() for e in Event.objects.filter(user=request.user)],
        'tasks': [t.to_dict() for t in Task.objects.filter(user=request.user)],
        'settings': {
            'theme': profile.theme,
            'hourStart': profile.hour_start,
            'hourEnd': profile.hour_end,
            'weekAAnchor': profile.week_a_anchor.isoformat(),
        },
    }
    return JsonResponse(payload)


@login_required
@require_http_methods(['POST'])
def api_import(request):
    try:
        data = json.loads(request.body)
    except json.JSONDecodeError:
        return HttpResponseBadRequest('Invalid JSON')

    events = data.get('events')
    tasks = data.get('tasks')
    if events is None or tasks is None:
        return JsonResponse({'error': 'File is missing events or tasks.'}, status=400)

    Event.objects.filter(user=request.user).delete()
    Task.objects.filter(user=request.user).delete()

    for e in events:
        try:
            ev = _event_from_payload({
                'category': e.get('category', 'class'),
                'title': e.get('title', ''),
                'professor': e.get('professor', ''),
                'room': e.get('room', ''),
                'activity': e.get('activity', ''),
                'location': e.get('location', ''),
                'startTime': e['startTime'],
                'endTime': e['endTime'],
                'isOneTime': e.get('isOneTime', False),
                'date': e.get('date'),
                'days': e.get('days', []),
                'weekType': e.get('weekType', 'both'),
                'notes': e.get('notes', ''),
                'color': e.get('color', '#3E7BFA'),
            }, request.user)
            ev.save()
        except (KeyError, TypeError):
            continue

    for t in tasks:
        text = (t.get('text') or '').strip()
        if text:
            Task.objects.create(user=request.user, text=text[:280], done=bool(t.get('done')))

    settings_data = data.get('settings') or {}
    profile = request.user.profile
    if settings_data.get('theme') in ('system', 'light', 'dark'):
        profile.theme = settings_data['theme']
    try:
        if 'hourStart' in settings_data and 'hourEnd' in settings_data:
            profile.hour_start = int(settings_data['hourStart'])
            profile.hour_end = int(settings_data['hourEnd'])
        if 'weekAAnchor' in settings_data:
            profile.week_a_anchor = datetime.date.fromisoformat(settings_data['weekAAnchor'])
    except (TypeError, ValueError):
        pass
    profile.save()

    return JsonResponse({'ok': True})


@login_required
@require_http_methods(['POST'])
def api_clear_all(request):
    Event.objects.filter(user=request.user).delete()
    Task.objects.filter(user=request.user).delete()
    WeekOverride.objects.filter(user=request.user).delete()
    return JsonResponse({'ok': True})
