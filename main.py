from datetime import datetime, timedelta, timezone
from statistics import mean
from uuid import uuid4

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware


app = FastAPI(
    title="Mock CORS Intelligent Alert Dashboard API",
    description="Local mock API for testing CORS/NTRIP dashboard flows before connecting real services.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def iso_minutes_ago(minutes: int) -> str:
    return (datetime.now(timezone.utc) - timedelta(minutes=minutes)).isoformat()


STATIONS = [
    {
        "station_id": "NYA01",
        "station_name": "Nyanga CORS Station",
        "country": "Zimbabwe",
        "province": "Manicaland",
        "latitude": -18.2167,
        "longitude": 32.7467,
        "status": "ONLINE",
        "receiver_status": "ONLINE",
        "antenna_status": "ONLINE",
        "power_status": "ONLINE",
        "internet_status": "ONLINE",
        "latency_seconds": 1.4,
        "satellites_tracked": 31,
        "gnss_signal_quality_percent": 96.7,
        "positioning_accuracy_cm": 1.2,
        "last_data_received_minutes_ago": 1,
    },
    {
        "station_id": "HRE01",
        "station_name": "Harare Reference Station",
        "country": "Zimbabwe",
        "province": "Harare",
        "latitude": -17.8252,
        "longitude": 31.0335,
        "status": "ONLINE",
        "receiver_status": "ONLINE",
        "antenna_status": "ONLINE",
        "power_status": "ONLINE",
        "internet_status": "ONLINE",
        "latency_seconds": 2.1,
        "satellites_tracked": 29,
        "gnss_signal_quality_percent": 94.2,
        "positioning_accuracy_cm": 1.6,
        "last_data_received_minutes_ago": 2,
    },
    {
        "station_id": "MUT01",
        "station_name": "Mutare CORS Station",
        "country": "Zimbabwe",
        "province": "Manicaland",
        "latitude": -18.9707,
        "longitude": 32.6709,
        "status": "WARNING",
        "receiver_status": "ONLINE",
        "antenna_status": "ONLINE",
        "power_status": "ONLINE",
        "internet_status": "DEGRADED",
        "latency_seconds": 8.7,
        "satellites_tracked": 23,
        "gnss_signal_quality_percent": 82.4,
        "positioning_accuracy_cm": 3.8,
        "last_data_received_minutes_ago": 7,
    },
    {
        "station_id": "BUL01",
        "station_name": "Bulawayo CORS Station",
        "country": "Zimbabwe",
        "province": "Bulawayo",
        "latitude": -20.1325,
        "longitude": 28.6265,
        "status": "ONLINE",
        "receiver_status": "ONLINE",
        "antenna_status": "ONLINE",
        "power_status": "ONLINE",
        "internet_status": "ONLINE",
        "latency_seconds": 2.8,
        "satellites_tracked": 28,
        "gnss_signal_quality_percent": 92.5,
        "positioning_accuracy_cm": 1.9,
        "last_data_received_minutes_ago": 2,
    },
    {
        "station_id": "MAS01",
        "station_name": "Masvingo CORS Station",
        "country": "Zimbabwe",
        "province": "Masvingo",
        "latitude": -20.0744,
        "longitude": 30.8328,
        "status": "CRITICAL",
        "receiver_status": "ONLINE",
        "antenna_status": "WARNING",
        "power_status": "ONLINE",
        "internet_status": "CRITICAL",
        "latency_seconds": 31.5,
        "satellites_tracked": 14,
        "gnss_signal_quality_percent": 59.8,
        "positioning_accuracy_cm": 9.4,
        "last_data_received_minutes_ago": 23,
    },
    {
        "station_id": "GWE01",
        "station_name": "Gweru CORS Station",
        "country": "Zimbabwe",
        "province": "Midlands",
        "latitude": -19.4517,
        "longitude": 29.8167,
        "status": "ONLINE",
        "receiver_status": "ONLINE",
        "antenna_status": "ONLINE",
        "power_status": "ONLINE",
        "internet_status": "ONLINE",
        "latency_seconds": 3.2,
        "satellites_tracked": 27,
        "gnss_signal_quality_percent": 90.9,
        "positioning_accuracy_cm": 2.1,
        "last_data_received_minutes_ago": 3,
    },
    {
        "station_id": "KAR01",
        "station_name": "Kariba CORS Station",
        "country": "Zimbabwe",
        "province": "Mashonaland West",
        "latitude": -16.5167,
        "longitude": 28.8000,
        "status": "WARNING",
        "receiver_status": "ONLINE",
        "antenna_status": "ONLINE",
        "power_status": "WARNING",
        "internet_status": "ONLINE",
        "latency_seconds": 12.6,
        "satellites_tracked": 21,
        "gnss_signal_quality_percent": 78.6,
        "positioning_accuracy_cm": 5.7,
        "last_data_received_minutes_ago": 11,
    },
    {
        "station_id": "VFA01",
        "station_name": "Victoria Falls CORS Station",
        "country": "Zimbabwe",
        "province": "Matabeleland North",
        "latitude": -17.9243,
        "longitude": 25.8560,
        "status": "OFFLINE",
        "receiver_status": "OFFLINE",
        "antenna_status": "UNKNOWN",
        "power_status": "CRITICAL",
        "internet_status": "OFFLINE",
        "latency_seconds": 0,
        "satellites_tracked": 0,
        "gnss_signal_quality_percent": 0,
        "positioning_accuracy_cm": 0,
        "last_data_received_minutes_ago": 188,
    },
    {
        "station_id": "KGL01",
        "station_name": "Kigali Regional CORS Station",
        "country": "Rwanda",
        "province": "Kigali",
        "latitude": -1.9441,
        "longitude": 30.0619,
        "status": "ONLINE",
        "receiver_status": "ONLINE",
        "antenna_status": "ONLINE",
        "power_status": "ONLINE",
        "internet_status": "ONLINE",
        "latency_seconds": 4.4,
        "satellites_tracked": 30,
        "gnss_signal_quality_percent": 93.6,
        "positioning_accuracy_cm": 1.8,
        "last_data_received_minutes_ago": 4,
    },
    {
        "station_id": "LSK01",
        "station_name": "Lusaka Regional CORS Station",
        "country": "Zambia",
        "province": "Lusaka",
        "latitude": -15.3875,
        "longitude": 28.3228,
        "status": "ONLINE",
        "receiver_status": "ONLINE",
        "antenna_status": "ONLINE",
        "power_status": "ONLINE",
        "internet_status": "ONLINE",
        "latency_seconds": 5.1,
        "satellites_tracked": 26,
        "gnss_signal_quality_percent": 88.9,
        "positioning_accuracy_cm": 2.6,
        "last_data_received_minutes_ago": 5,
    },
]


ALERTS = [
    {
        "alert_id": "ALT-MAS01-001",
        "severity": "CRITICAL",
        "station_id": "MAS01",
        "problem": "RTCM stream latency above operational threshold and antenna signal drop detected.",
        "detected_minutes_ago": 24,
        "duration": "24 minutes",
        "recommended_action": "Inspect internet backhaul and antenna cable path. Switch users to nearest fallback station.",
        "status": "NEW",
    },
    {
        "alert_id": "ALT-VFA01-002",
        "severity": "CRITICAL",
        "station_id": "VFA01",
        "problem": "Station offline. No receiver telemetry or GNSS observations received.",
        "detected_minutes_ago": 188,
        "duration": "3 hours 8 minutes",
        "recommended_action": "Dispatch field team to verify power supply and receiver status.",
        "status": "ACKNOWLEDGED",
    },
    {
        "alert_id": "ALT-KAR01-003",
        "severity": "WARNING",
        "station_id": "KAR01",
        "problem": "Solar backup voltage below normal operating range.",
        "detected_minutes_ago": 42,
        "duration": "42 minutes",
        "recommended_action": "Monitor battery voltage and inspect charge controller if condition persists.",
        "status": "NEW",
    },
    {
        "alert_id": "ALT-MUT01-004",
        "severity": "WARNING",
        "station_id": "MUT01",
        "problem": "Intermittent internet packet loss affecting NTRIP caster updates.",
        "detected_minutes_ago": 17,
        "duration": "17 minutes",
        "recommended_action": "Check ISP link quality and fail over to backup connection if available.",
        "status": "NEW",
    },
    {
        "alert_id": "ALT-HRE01-005",
        "severity": "INFO",
        "station_id": "HRE01",
        "problem": "Scheduled RINEX quality control completed successfully.",
        "detected_minutes_ago": 9,
        "duration": "2 minutes",
        "recommended_action": "No action required.",
        "status": "RESOLVED",
    },
]


STREAMS = [
    {
        "station_id": station["station_id"],
        "mountpoint": f"{station['station_id']}_RTCM3",
        "caster": "mock-ntrip.zingsa.local:2101",
        "format": "RTCM 3.3",
        "stream_status": "DOWN" if station["status"] == "OFFLINE" else "DEGRADED" if station["status"] in {"WARNING", "CRITICAL"} else "UP",
        "connected_clients": 0 if station["status"] == "OFFLINE" else max(3, station["satellites_tracked"] // 3),
        "message_rate_hz": 0 if station["status"] == "OFFLINE" else 1,
        "bandwidth_kbps": 0 if station["status"] == "OFFLINE" else round(12 + station["satellites_tracked"] * 0.8, 1),
        "latency_seconds": station["latency_seconds"],
        "last_packet_received": None if station["status"] == "OFFLINE" else iso_minutes_ago(station["last_data_received_minutes_ago"]),
    }
    for station in STATIONS
]


RINEX = [
    {
        "station_id": station["station_id"],
        "date": datetime.now(timezone.utc).date().isoformat(),
        "daily_file_available": station["status"] != "OFFLINE",
        "hourly_files_expected": 24,
        "hourly_files_received": 0 if station["status"] == "OFFLINE" else 21 if station["status"] == "CRITICAL" else 23 if station["status"] == "WARNING" else 24,
        "missing_files": ["03", "04", "05"] if station["status"] == "OFFLINE" else ["14", "15", "16"] if station["status"] == "CRITICAL" else ["11"] if station["status"] == "WARNING" else [],
        "late_files": [] if station["status"] in {"ONLINE", "OFFLINE"} else ["latest_hour"],
        "quality_percentage": 0 if station["status"] == "OFFLINE" else 67.5 if station["status"] == "CRITICAL" else 84.0 if station["status"] == "WARNING" else round(station["gnss_signal_quality_percent"], 1),
        "reporting_station": station["station_name"],
        "last_file_received": None if station["status"] == "OFFLINE" else iso_minutes_ago(station["last_data_received_minutes_ago"] + 5),
    }
    for station in STATIONS
]


DEFORMATION = [
    {
        "station_id": station["station_id"],
        "station_name": station["station_name"],
        "north_displacement_mm": round((index - 4) * 0.7, 2),
        "east_displacement_mm": round((index % 4 - 1.5) * 0.9, 2),
        "vertical_displacement_mm": round((index % 5 - 2) * 1.1, 2),
        "horizontal_velocity_mm_per_year": round(0.8 + index * 0.22, 2),
        "vertical_velocity_mm_per_year": round(-0.4 + index * 0.08, 2),
        "risk_level": "HIGH" if station["station_id"] in {"MAS01", "VFA01"} else "MODERATE" if station["station_id"] in {"KAR01", "MUT01"} else "LOW",
        "last_solution_time": iso_minutes_ago(15 + index * 3),
    }
    for index, station in enumerate(STATIONS)
]


def with_station_timestamp(station: dict) -> dict:
    data = station.copy()
    minutes = data.pop("last_data_received_minutes_ago")
    data["last_data_received"] = iso_minutes_ago(minutes)
    return data


def with_alert_timestamp(alert: dict) -> dict:
    data = alert.copy()
    minutes = data.pop("detected_minutes_ago")
    data["detected_time"] = iso_minutes_ago(minutes)
    return data


def get_station(station_id: str) -> dict:
    station = next((item for item in STATIONS if item["station_id"] == station_id.upper()), None)
    if not station:
        raise HTTPException(status_code=404, detail=f"Station {station_id} not found")
    return station


@app.get("/")
def root():
    return {
        "service": "Mock CORS Intelligent Alert Dashboard API",
        "status": "ONLINE",
        "docs": "/docs",
        "endpoints": [
            "/api/cors/stations",
            "/api/cors/stations/{station_id}/status",
            "/api/cors/alerts",
            "/api/cors/streams",
            "/api/cors/rinex",
            "/api/cors/deformation",
            "/api/cors/summary",
        ],
    }


@app.get("/api/cors/stations")
def list_stations():
    return {"stations": [with_station_timestamp(station) for station in STATIONS]}


@app.get("/api/cors/stations/{station_id}/status")
def station_status(station_id: str):
    station = get_station(station_id)
    station_alerts = [alert for alert in ALERTS if alert["station_id"] == station["station_id"]]
    station_stream = next(item for item in STREAMS if item["station_id"] == station["station_id"])
    station_rinex = next(item for item in RINEX if item["station_id"] == station["station_id"])
    station_deformation = next(item for item in DEFORMATION if item["station_id"] == station["station_id"])

    return {
        "station": with_station_timestamp(station),
        "health": {
            "overall_status": station["status"],
            "receiver_status": station["receiver_status"],
            "antenna_status": station["antenna_status"],
            "power_status": station["power_status"],
            "internet_status": station["internet_status"],
            "latency_seconds": station["latency_seconds"],
            "satellites_tracked": station["satellites_tracked"],
            "gnss_signal_quality_percent": station["gnss_signal_quality_percent"],
            "positioning_accuracy_cm": station["positioning_accuracy_cm"],
            "health_score_percent": round(
                (
                    station["gnss_signal_quality_percent"]
                    + max(0, 100 - station["latency_seconds"] * 3)
                    + min(100, station["satellites_tracked"] * 3.3)
                )
                / 3,
                1,
            ),
        },
        "active_alerts": [
            with_alert_timestamp(alert)
            for alert in station_alerts
            if alert["status"] != "RESOLVED"
        ],
        "stream": station_stream,
        "rinex": station_rinex,
        "deformation": station_deformation,
        "request_id": str(uuid4()),
    }


@app.get("/api/cors/alerts")
def list_alerts():
    return {"alerts": [with_alert_timestamp(alert) for alert in ALERTS]}


@app.get("/api/cors/streams")
def list_streams():
    return {"streams": STREAMS}


@app.get("/api/cors/rinex")
def list_rinex():
    return {
        "rinex": RINEX,
        "summary": {
            "reporting_stations": len([item for item in RINEX if item["daily_file_available"]]),
            "missing_file_count": sum(len(item["missing_files"]) for item in RINEX),
            "late_file_count": sum(len(item["late_files"]) for item in RINEX),
            "average_quality_percentage": round(mean(item["quality_percentage"] for item in RINEX), 1),
        },
    }


@app.get("/api/cors/deformation")
def list_deformation():
    return {"deformation": DEFORMATION}


@app.get("/api/cors/summary")
def dashboard_summary():
    online = len([station for station in STATIONS if station["status"] == "ONLINE"])
    warning = len([station for station in STATIONS if station["status"] == "WARNING"])
    critical = len([station for station in STATIONS if station["status"] == "CRITICAL"])
    offline = len([station for station in STATIONS if station["status"] == "OFFLINE"])
    active_alerts = len([alert for alert in ALERTS if alert["status"] != "RESOLVED"])
    active_stations = [station for station in STATIONS if station["status"] != "OFFLINE"]

    return {
        "total_stations": len(STATIONS),
        "online": online,
        "warning": warning,
        "critical": critical,
        "offline": offline,
        "active_alerts": active_alerts,
        "average_latency": round(mean(station["latency_seconds"] for station in active_stations), 1),
        "average_positioning_accuracy": round(mean(station["positioning_accuracy_cm"] for station in active_stations), 1),
        "uptime_percent": round((online + warning * 0.75 + critical * 0.35) / len(STATIONS) * 100, 1),
    }
