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