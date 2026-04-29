#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import os
import traceback
import math
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime

import requests
from flask import Flask, jsonify, request
from flask_cors import CORS
from dotenv import load_dotenv

load_dotenv()

AMAP_WEB_SERVICE_KEY = os.environ.get("AMAP_WEB_SERVICE_KEY", "").strip()
AMAP_TIMEOUT_SECONDS = 12
MAX_TARGETS = 12
MAX_WORKERS = 6
ROUTE_PLANNER_HOST = os.environ.get("ROUTE_PLANNER_HOST", "127.0.0.1").strip() or "127.0.0.1"
ROUTE_PLANNER_PORT = int(os.environ.get("ROUTE_PLANNER_PORT", "5050"))
SUPPORTED_TRAVEL_MODES = {"driving", "walking", "riding"}
EARTH_RADIUS = 6378245.0
EE = 0.00669342162296594323

app = Flask(__name__, static_folder=None)
CORS(app)


class AMapAPIError(RuntimeError):
    def __init__(self, message, *, error_code="AMAP_API_ERROR", provider_code=None, details=None, status_code=502):
        super().__init__(message)
        self.message = message
        self.error_code = error_code
        self.provider_code = provider_code
        self.details = details or {}
        self.status_code = status_code


def json_error(message, status_code=400, error_code="BAD_REQUEST", extra=None):
    payload = {
        "status": "error",
        "error": message,
        "errorCode": error_code,
    }
    if extra:
        payload.update(extra)
    return jsonify(payload), status_code


def safe_float(value, default=0.0):
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def build_meta(api_mode):
    return {
        "unitDistance": "meter",
        "unitDuration": "second",
        "calculatedAt": datetime.now().astimezone().isoformat(timespec="seconds"),
        "apiMode": api_mode,
    }


def out_of_china(lat, lng):
    return not (73.66 < lng < 135.05 and 3.86 < lat < 53.55)


def transform_lat(lng, lat):
    ret = -100.0 + 2.0 * lng + 3.0 * lat + 0.2 * lat * lat + 0.1 * lng * lat + 0.2 * abs(lng) ** 0.5
    ret += (20.0 * math.sin(6.0 * lng * math.pi) + 20.0 * math.sin(2.0 * lng * math.pi)) * 2.0 / 3.0
    ret += (20.0 * math.sin(lat * math.pi) + 40.0 * math.sin(lat / 3.0 * math.pi)) * 2.0 / 3.0
    ret += (160.0 * math.sin(lat / 12.0 * math.pi) + 320 * math.sin(lat * math.pi / 30.0)) * 2.0 / 3.0
    return ret


def transform_lng(lng, lat):
    ret = 300.0 + lng + 2.0 * lat + 0.1 * lng * lng + 0.1 * lng * lat + 0.1 * abs(lng) ** 0.5
    ret += (20.0 * math.sin(6.0 * lng * math.pi) + 20.0 * math.sin(2.0 * lng * math.pi)) * 2.0 / 3.0
    ret += (20.0 * math.sin(lng * math.pi) + 40.0 * math.sin(lng / 3.0 * math.pi)) * 2.0 / 3.0
    ret += (150.0 * math.sin(lng / 12.0 * math.pi) + 300.0 * math.sin(lng / 30.0 * math.pi)) * 2.0 / 3.0
    return ret


def delta(lat, lng):
    d_lat = transform_lat(lng - 105.0, lat - 35.0)
    d_lng = transform_lng(lng - 105.0, lat - 35.0)
    rad_lat = lat / 180.0 * math.pi
    magic = math.sin(rad_lat)
    magic = 1 - EE * magic * magic
    sqrt_magic = math.sqrt(magic)
    d_lat = (d_lat * 180.0) / ((EARTH_RADIUS * (1 - EE)) / (magic * sqrt_magic) * math.pi)
    d_lng = (d_lng * 180.0) / (EARTH_RADIUS / sqrt_magic * math.cos(rad_lat) * math.pi)
    return d_lat, d_lng


def wgs84_to_gcj02(lng, lat):
    if out_of_china(lat, lng):
        return lng, lat
    d_lat, d_lng = delta(lat, lng)
    return lng + d_lng, lat + d_lat


def gcj02_to_wgs84(lng, lat):
    if out_of_china(lat, lng):
        return lng, lat
    d_lat, d_lng = delta(lat, lng)
    return lng - d_lng, lat - d_lat


def format_point(node):
    gcj_lng, gcj_lat = wgs84_to_gcj02(node["lng"], node["lat"])
    return f"{gcj_lng:.6f},{gcj_lat:.6f}"


def validate_point(point, label):
    if not isinstance(point, dict):
        raise ValueError(f"{label} 必须是对象")

    try:
        lng = float(point["lng"])
        lat = float(point["lat"])
    except (KeyError, TypeError, ValueError) as exc:
        raise ValueError(f"{label} 缺少合法的经纬度") from exc

    if not (-180 <= lng <= 180 and -90 <= lat <= 90):
        raise ValueError(f"{label} 经纬度超出范围")

    return {
        "id": point.get("id") or label,
        "name": point.get("name") or label,
        "lng": lng,
        "lat": lat,
    }


def validate_travel_mode(raw_mode):
    mode = (raw_mode or "walking").lower().strip()
    if mode not in SUPPORTED_TRAVEL_MODES:
        raise ValueError("不支持的出行方式")
    return mode


def build_nodes(payload):
    start_point = validate_point(payload.get("startPoint"), "起点")
    targets = payload.get("targets")

    if not isinstance(targets, list) or not targets:
        raise ValueError("请至少选择一个目标机位")
    if len(targets) > MAX_TARGETS:
        raise ValueError(f"一次最多规划 {MAX_TARGETS} 个目标机位")

    nodes = [{
        "id": "__start__",
        "name": start_point["name"],
        "lng": start_point["lng"],
        "lat": start_point["lat"],
        "kind": "start",
    }]
    seen_ids = set()

    for index, target in enumerate(targets, start=1):
        node = validate_point(target, f"目标机位 {index}")
        if node["id"] in seen_ids:
            raise ValueError("目标机位 ID 不能重复")
        seen_ids.add(node["id"])
        node["kind"] = "target"
        nodes.append(node)

    return nodes


def build_geometry_request(payload):
    start_point = validate_point(payload.get("startPoint"), "起点")
    ordered_targets = payload.get("orderedTargets")

    if not isinstance(ordered_targets, list) or not ordered_targets:
        raise ValueError("缺少规划后的目标顺序")
    if len(ordered_targets) > MAX_TARGETS:
        raise ValueError(f"一次最多规划 {MAX_TARGETS} 个目标机位")

    normalized_targets = []
    seen_ids = set()
    for index, target in enumerate(ordered_targets, start=1):
        node = validate_point(target, f"顺序机位 {index}")
        if node["id"] in seen_ids:
            raise ValueError("顺序机位 ID 不能重复")
        seen_ids.add(node["id"])
        normalized_targets.append(node)

    return start_point, normalized_targets


def amap_request(path, params):
    if not AMAP_WEB_SERVICE_KEY:
        raise AMapAPIError(
            "未配置 AMAP_WEB_SERVICE_KEY，请先在 backend/.env 中填写",
            error_code="AMAP_KEY_MISSING",
            status_code=500,
        )

    query = dict(params)
    query["key"] = AMAP_WEB_SERVICE_KEY

    try:
        response = requests.get(
            f"https://restapi.amap.com{path}",
            params=query,
            timeout=AMAP_TIMEOUT_SECONDS,
        )
        response.raise_for_status()
        return response.json()
    except requests.RequestException as exc:
        raise AMapAPIError(
            "高德接口请求失败",
            error_code="AMAP_REQUEST_FAILED",
            details={"path": path, "reason": str(exc)},
        ) from exc


def map_amap_error_code(message):
    mapping = {
        "INVALID_USER_IP": "AMAP_INVALID_USER_IP",
        "INVALID_USER_KEY": "AMAP_INVALID_USER_KEY",
        "SERVICE_NOT_AVAILABLE": "AMAP_SERVICE_NOT_AVAILABLE",
        "DAILY_QUERY_OVER_LIMIT": "AMAP_DAILY_QUERY_OVER_LIMIT",
        "USER_DAILY_QUERY_OVER_LIMIT": "AMAP_DAILY_QUERY_OVER_LIMIT",
        "ACCESS_TOO_FREQUENT": "AMAP_ACCESS_TOO_FREQUENT",
    }
    return mapping.get(str(message or "").strip(), "AMAP_API_ERROR")


def ensure_amap_success(data):
    if data.get("status") == "1":
        return

    message = data.get("info") or "高德接口返回失败"
    raise AMapAPIError(
        message,
        error_code=map_amap_error_code(message),
        provider_code=data.get("infocode"),
        details=data,
    )


def ensure_amap_v4_success(data):
    errcode = str(data.get("errcode", ""))
    if errcode in {"0", ""}:
        return

    message = data.get("errmsg") or "高德接口返回失败"
    raise AMapAPIError(
        message,
        error_code=map_amap_error_code(message),
        provider_code=errcode,
        details=data,
    )


def decode_polyline(polyline_text):
    if not polyline_text:
        return []

    points = []
    for item in str(polyline_text).split(";"):
        if not item:
            continue
        parts = item.split(",")
        if len(parts) != 2:
            continue
        gcj_lng = safe_float(parts[0])
        gcj_lat = safe_float(parts[1])
        wgs_lng, wgs_lat = gcj02_to_wgs84(gcj_lng, gcj_lat)
        points.append([wgs_lng, wgs_lat])
    return points


def merge_polyline_segments(segments):
    merged = []
    for segment in segments:
        for point in segment:
            if merged and point[0] == merged[-1][0] and point[1] == merged[-1][1]:
                continue
            merged.append(point)
    return merged


def normalize_segment_type(mode, instruction="", road_name=""):
    text = f"{instruction} {road_name}".lower()

    if mode == "walking":
        default_type = "walkway"
    elif mode == "riding":
        default_type = "bikeway"
    else:
        default_type = "road"

    if any(keyword in text for keyword in ("stairs", "stair", "楼梯", "台阶")):
        return "stairs"
    if any(keyword in text for keyword in ("cross", "crosswalk", "过街", "斑马线", "人行横道")):
        return "crossing"
    if any(keyword in text for keyword in ("walk", "步行", "步道", "人行")):
        return "walkway"
    if any(keyword in text for keyword in ("bike", "bicycle", "骑行", "非机动车")):
        return "bikeway"
    if any(keyword in text for keyword in ("road", "street", "大道", "公路", "路")):
        return "road"
    return default_type


def build_step_record(step, *, mode, index):
    instruction = step.get("instruction") or step.get("navi") or step.get("action") or ""
    road_name = (
        step.get("road")
        or step.get("road_name")
        or step.get("name")
        or step.get("assistant_action")
        or ""
    )
    polyline = decode_polyline(step.get("polyline") or step.get("path") or "")
    return {
        "index": index,
        "instruction": instruction,
        "roadName": road_name,
        "distance": safe_float(step.get("distance")),
        "duration": safe_float(step.get("duration")),
        "polyline": polyline,
        "segmentType": normalize_segment_type(mode, instruction, road_name),
    }


def build_leg_record(origin, destination, *, mode, seq, distance, duration, polyline, steps):
    return {
        "seq": seq,
        "travelMode": mode,
        "from": {
            "id": origin["id"],
            "name": origin["name"],
            "lng": origin["lng"],
            "lat": origin["lat"],
        },
        "to": {
            "id": destination["id"],
            "name": destination["name"],
            "lng": destination["lng"],
            "lat": destination["lat"],
        },
        "distance": distance,
        "duration": duration,
        "polyline": polyline,
        "steps": steps,
    }


def parse_v3_route_path(data):
    ensure_amap_success(data)
    paths = ((data.get("route") or {}).get("paths") or [])
    if not paths:
        raise AMapAPIError("高德未返回可用路线", error_code="AMAP_EMPTY_ROUTE")
    return paths[0]


def parse_v4_route_path(data):
    ensure_amap_v4_success(data)
    paths = ((data.get("data") or {}).get("paths") or [])
    if not paths:
        raise AMapAPIError("高德未返回可用路线", error_code="AMAP_EMPTY_ROUTE")
    return paths[0]


def fetch_driving_matrix(nodes):
    size = len(nodes)
    distance_matrix = [[0.0 for _ in range(size)] for _ in range(size)]
    duration_matrix = [[0.0 for _ in range(size)] for _ in range(size)]

    for destination_index in range(size):
        origins = [format_point(nodes[i]) for i in range(size) if i != destination_index]
        indices = [i for i in range(size) if i != destination_index]
        data = amap_request(
            "/v3/distance",
            {
                "origins": "|".join(origins),
                "destination": format_point(nodes[destination_index]),
                "type": "1",
            },
        )
        ensure_amap_success(data)
        results = data.get("results") or []
        if len(results) != len(indices):
            raise AMapAPIError("高德距离矩阵返回数量异常", error_code="AMAP_MATRIX_SIZE_MISMATCH")

        for offset, result in enumerate(results):
            distance_matrix[indices[offset]][destination_index] = safe_float(result.get("distance"))
            duration_matrix[indices[offset]][destination_index] = safe_float(result.get("duration"))

    return distance_matrix, duration_matrix


def fetch_walking_summary(origin, destination):
    data = amap_request(
        "/v3/direction/walking",
        {"origin": format_point(origin), "destination": format_point(destination)},
    )
    path = parse_v3_route_path(data)
    return safe_float(path.get("distance")), safe_float(path.get("duration"))


def fetch_riding_summary(origin, destination):
    data = amap_request(
        "/v4/direction/bicycling",
        {"origin": format_point(origin), "destination": format_point(destination)},
    )
    path = parse_v4_route_path(data)
    return safe_float(path.get("distance")), safe_float(path.get("duration"))


def fetch_pairwise_matrix(nodes, mode):
    size = len(nodes)
    distance_matrix = [[0.0 for _ in range(size)] for _ in range(size)]
    duration_matrix = [[0.0 for _ in range(size)] for _ in range(size)]
    fetcher = fetch_walking_summary if mode == "walking" else fetch_riding_summary

    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
        futures = {
            executor.submit(fetcher, nodes[i], nodes[j]): (i, j)
            for i in range(size)
            for j in range(size)
            if i != j
        }
        for future in as_completed(futures):
            origin_index, destination_index = futures[future]
            distance_matrix[origin_index][destination_index], duration_matrix[origin_index][destination_index] = future.result()

    return distance_matrix, duration_matrix


def build_route_matrix(nodes, travel_mode):
    if travel_mode == "driving":
        return fetch_driving_matrix(nodes)
    if travel_mode in {"walking", "riding"}:
        return fetch_pairwise_matrix(nodes, travel_mode)
    raise ValueError("不支持的出行方式")


def fetch_driving_leg(origin, destination, seq):
    data = amap_request(
        "/v3/direction/driving",
        {
            "origin": format_point(origin),
            "destination": format_point(destination),
            "extensions": "base",
            "strategy": "0",
        },
    )
    path = parse_v3_route_path(data)
    steps = [
        build_step_record(step, mode="driving", index=index)
        for index, step in enumerate(path.get("steps") or [], start=1)
    ]
    leg_polyline = merge_polyline_segments([step["polyline"] for step in steps if step["polyline"]])
    if not leg_polyline:
        leg_polyline = decode_polyline(path.get("polyline") or "")
    return build_leg_record(
        origin,
        destination,
        mode="driving",
        seq=seq,
        distance=safe_float(path.get("distance")),
        duration=safe_float(path.get("duration")),
        polyline=leg_polyline,
        steps=steps,
    )


def fetch_walking_leg(origin, destination, seq):
    data = amap_request(
        "/v3/direction/walking",
        {"origin": format_point(origin), "destination": format_point(destination)},
    )
    path = parse_v3_route_path(data)
    steps = [
        build_step_record(step, mode="walking", index=index)
        for index, step in enumerate(path.get("steps") or [], start=1)
    ]
    leg_polyline = merge_polyline_segments([step["polyline"] for step in steps if step["polyline"]])
    if not leg_polyline:
        leg_polyline = decode_polyline(path.get("polyline") or "")
    return build_leg_record(
        origin,
        destination,
        mode="walking",
        seq=seq,
        distance=safe_float(path.get("distance")),
        duration=safe_float(path.get("duration")),
        polyline=leg_polyline,
        steps=steps,
    )


def fetch_riding_leg(origin, destination, seq):
    data = amap_request(
        "/v4/direction/bicycling",
        {"origin": format_point(origin), "destination": format_point(destination)},
    )
    path = parse_v4_route_path(data)
    raw_steps = path.get("steps") or path.get("rides") or []
    steps = [
        build_step_record(step, mode="riding", index=index)
        for index, step in enumerate(raw_steps, start=1)
    ]
    leg_polyline = merge_polyline_segments([step["polyline"] for step in steps if step["polyline"]])
    if not leg_polyline:
        leg_polyline = decode_polyline(path.get("polyline") or "")
    return build_leg_record(
        origin,
        destination,
        mode="riding",
        seq=seq,
        distance=safe_float(path.get("distance")),
        duration=safe_float(path.get("duration")),
        polyline=leg_polyline,
        steps=steps,
    )


def fetch_route_leg(origin, destination, mode, seq):
    if mode == "driving":
        return fetch_driving_leg(origin, destination, seq)
    if mode == "walking":
        return fetch_walking_leg(origin, destination, seq)
    if mode == "riding":
        return fetch_riding_leg(origin, destination, seq)
    raise ValueError("不支持的出行方式")


def build_route_geometry(start_point, ordered_targets, travel_mode, round_trip):
    legs = []
    total_distance = 0.0
    total_duration = 0.0
    current_point = {
        "id": "__start__",
        "name": start_point["name"],
        "lng": start_point["lng"],
        "lat": start_point["lat"],
    }

    for sequence, target in enumerate(ordered_targets, start=1):
        leg = fetch_route_leg(current_point, target, travel_mode, sequence)
        legs.append(leg)
        total_distance += leg["distance"]
        total_duration += leg["duration"]
        current_point = target

    if round_trip:
        leg = fetch_route_leg(current_point, {
            "id": "__start__",
            "name": start_point["name"],
            "lng": start_point["lng"],
            "lat": start_point["lat"],
        }, travel_mode, len(legs) + 1)
        legs.append(leg)
        total_distance += leg["distance"]
        total_duration += leg["duration"]

    return {
        "totalDistance": total_distance,
        "totalDuration": total_duration,
        "legs": legs,
    }


@app.post("/api/route-matrix")
def route_matrix():
    try:
        payload = request.get_json(force=True) or {}
        travel_mode = validate_travel_mode(payload.get("travelMode"))
        nodes = build_nodes(payload)
        distance_matrix, duration_matrix = build_route_matrix(nodes, travel_mode)
        return jsonify({
            "status": "success",
            "provider": "amap",
            "travelMode": travel_mode,
            "optimizeBy": payload.get("optimizeBy") or "duration",
            "roundTrip": bool(payload.get("roundTrip")),
            "nodes": nodes,
            "distanceMatrix": distance_matrix,
            "durationMatrix": duration_matrix,
            "meta": build_meta("amap-route-matrix"),
        })
    except ValueError as exc:
        return json_error(str(exc), 400, "INVALID_REQUEST")
    except AMapAPIError as exc:
        return json_error(
            exc.message,
            exc.status_code,
            exc.error_code,
            {
                "provider": "amap",
                "providerCode": exc.provider_code,
                "details": exc.details,
            },
        )
    except Exception:
        traceback.print_exc()
        return json_error("后端计算异常，请查看服务器日志", 500, "INTERNAL_SERVER_ERROR")


@app.post("/api/route-geometry")
def route_geometry():
    try:
        payload = request.get_json(force=True) or {}
        travel_mode = validate_travel_mode(payload.get("travelMode"))
        start_point, ordered_targets = build_geometry_request(payload)
        route = build_route_geometry(
            start_point,
            ordered_targets,
            travel_mode,
            bool(payload.get("roundTrip")),
        )
        return jsonify({
            "status": "success",
            "provider": "amap",
            "travelMode": travel_mode,
            "roundTrip": bool(payload.get("roundTrip")),
            "route": route,
            "meta": {
                **build_meta("amap-route-geometry"),
                "polylineCrs": "WGS84",
            },
        })
    except ValueError as exc:
        return json_error(str(exc), 400, "INVALID_REQUEST")
    except AMapAPIError as exc:
        return json_error(
            exc.message,
            exc.status_code,
            exc.error_code,
            {
                "provider": "amap",
                "providerCode": exc.provider_code,
                "details": exc.details,
            },
        )
    except Exception:
        traceback.print_exc()
        return json_error("后端计算异常，请查看服务器日志", 500, "INTERNAL_SERVER_ERROR")


@app.get("/api/health")
def health():
    return jsonify({
        "status": "ok",
        "key_configured": bool(AMAP_WEB_SERVICE_KEY),
        "supportedModes": sorted(SUPPORTED_TRAVEL_MODES),
    })


if __name__ == "__main__":
    app.run(host=ROUTE_PLANNER_HOST, port=ROUTE_PLANNER_PORT, debug=True)
