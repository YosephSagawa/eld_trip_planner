import requests
from datetime import datetime, timedelta
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
import json

OSRM_URL = "http://router.project-osrm.org"


@csrf_exempt
@require_http_methods(["POST"])
def plan_trip(request):
    data = json.loads(request.body)

    current_loc = data['current_location']
    pickup_loc = data['pickup_location']
    dropoff_loc = data['dropoff_location']
    cycle_used = float(data['cycle_used'])

    # Get route through OSRM
    coordinates = get_coordinates([current_loc, pickup_loc, dropoff_loc])
    if not coordinates:
        return JsonResponse({"error": "Could not geocode locations"}, status=400)
    
    route = get_osrm_route(coordinates)
    if not route:
        return JsonResponse({"error": "Could not get route"}, status=400)
    
    total_distance_miles = route['distance'] / 1609.34 # meters -> miles
    total_duration_hours = route['duration'] / 3600 # seconds -> hours

    # Build realistic trip plan with ELD rules
    trip_plan = build_eld_trip_plan(
        current_loc=current_loc,
        pickup_loc=pickup_loc,
        dropoff_loc=dropoff_loc,
        coordinates=coordinates,
        route_geometry=route['geometry'],
        total_distance_miles=total_distance_miles,
        cycle_used=cycle_used
    )

    return JsonResponse(trip_plan)

def get_coordinates(locations):
    coords = []
    for loc in locations:
        url = f"http://nominatim.openstreetmap.org/search?format=json&q={loc}"
        try:
            r = requests.get(url, headers={"User-Agent": "ELDPlanner/1.0"}, timeout=10)
            data = r.json()
            if data:
                coords.append(f"{data[0]['lon']},{data[0]['lat']}")
        except:
            pass
    return coords if len(coords) == 3 else None

def get_osrm_route(coords):
    coord_str = ";".join(coords)
    url = f"{OSRM_URL}/route/v1/driving/{coord_str}?overview=full&geometries=geojson"
    try:
        r = requests.get(url, timeout=15)
        data = r.json()
        if data['routes']:
            return data['routes'][0]
    except:
        return None
    return None

def build_eld_trip_plan(current_loc, pickup_loc, dropoff_loc, coordinates, route_geometry, total_distance_miles, cycle_used):
    # Assumptions
    DRIVE_TIME_MAX = 11
    ON_DUTY_MAX = 14
    CYCLE_MAX = 70
    MILES_PER_HOUR = 55
    FUEL_EVERY_MILES = 1000

    remaining_cycle = CYCLE_MAX - cycle_used

    # Pre-trip: 1 hour pickup
    events = [{
        "type": "pickup",
        "location": pickup_loc,
        "duration_hours": 1.0,
        "status": "ON",
        "remarks": "Pickup"
    }]

    driving_hours_so_far = 0
    on_duty_hours_so_far = 1  # from pickup
    cycle_hours_so_far = cycle_used + 1
    distance_so_far = 0
    fuel_stops = 0

    current_time = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)

    # Main driving loop
    while distance_so_far < total_distance_miles:
        # How much can driver drive today?
        drive_today = min(DRIVE_TIME_MAX - driving_hours_so_far, 11)
        duty_today = min(ON_DUTY_MAX - on_duty_hours_so_far, 14 - on_duty_hours_so_far)

        available_drive = min(drive_today, duty_today)
        available_drive = min(available_drive, remaining_cycle - (cycle_hours_so_far - cycle_used))

        if available_drive <= 0:
            # Need 10-hour reset
            events.append({
                "type": "off_duty",
                "duration_hours": 10,
                "status": "OFF",
                "remarks": "10-hour reset"
            })
            current_time += timedelta(hours=10)
            # Reset daily counters
            driving_hours_so_far = 0
            on_duty_hours_so_far = 0
            cycle_hours_so_far += 10
            continue

        miles_today = available_drive * MILES_PER_HOUR
        if distance_so_far + miles_today > total_distance_miles:
            miles_today = total_distance_miles - distance_so_far

        # Fuel stop?
        if distance_so_far // FUEL_EVERY_MILES > fuel_stops:
            events.append({
                "type": "fuel",
                "duration_hours": 0.5,
                "status": "ON",
                "remarks": "Fuel stop"
            })
            on_duty_hours_so_far += 0.5
            fuel_stops += 1

        # Driving segment
        events.append({
            "type": "driving",
            "miles": round(miles_today, 1),
            "duration_hours": round(miles_today / MILES_PER_HOUR, 2),
            "status": "D",
            "remarks": f"Driving toward {dropoff_loc}"
        })

        driving_hours_so_far += miles_today / MILES_PER_HOUR
        on_duty_hours_so_far += miles_today / MILES_PER_HOUR
        distance_so_far += miles_today

        # 30-min break if driven 8+ hours
        if driving_hours_so_far >= 8 and "break" not in [e['type'] for e in events[-5:]]:
            events.append({
                "type": "break",
                "duration_hours": 0.5,
                "status": "ON",
                "remarks": "30-min break"
            })
            on_duty_hours_so_far += 0.5

        # End of duty day → sleeper berth
        if on_duty_hours_so_far >= 14:
            events.append({
                "type": "sleeper",
                "duration_hours": 10,
                "status": "SB",
                "remarks": "10-hour sleeper berth"
            })
            driving_hours_so_far = 0
            on_duty_hours_so_far = 0

    # Final drop-off
    events.append({
        "type": "dropoff",
        "location": dropoff_loc,
        "duration_hours": 1.0,
        "status": "ON",
        "remarks": "Drop-off"
    })

    # Generate daily logs
    daily_logs = generate_daily_logs(events)

    return {
        "route": {
            "geometry": route_geometry,
            "distance_miles": round(total_distance_miles, 1),
            "coordinates": coordinates
        },
        "events": events,
        "daily_logs": daily_logs,
        "summary": {
            "total_driving_hours": round(total_distance_miles / MILES_PER_HOUR, 1),
            "total_days": len(daily_logs),
            "fuel_stops": fuel_stops
        }
    }

def generate_daily_logs(events):
    logs = []
    current_day = []
    day_hours = 0

    for event in events:
        current_day.append(event)
        day_hours += event.get('duration_hours', 0)

        if event['status'] in ['SB', 'OFF'] and day_hours >= 10:
            logs.append({
                "date": datetime.now().strftime("%Y-%m-%d"),
                "events": current_day,
                "graph": build_graph_data(current_day)
            })
            current_day = []
            day_hours = 0

    if current_day:
        logs.append({
            "date": datetime.now().strftime("%Y-%m-%d"),
            "events": current_day,
            "graph": build_graph_data(current_day)
        })

    return logs


def build_graph_data(day_events):
    # Returns 24-hour grid data for ELD graph
    graph = [{"hour": h, "status": "OFF"} for h in range(24)]
    current_hour = 0

    for e in day_events:
        duration = e.get('duration_hours', 0)
        hours = int(duration)
        minutes = int((duration - hours) * 60)

        for _ in range(hours):
            if current_hour < 24:
                graph[current_hour]["status"] = e['status']
                current_hour += 1
        # Simplified — real version would handle minutes too

    return graph