"""
PlanHub Dashboard Server
Serves the dashboard UI and provides API endpoints for project data.
"""
import os
import json
import sqlite3
import threading
import urllib.parse
import requests as http_requests

# Monkey patch sqlite3.connect to natively embed timeout globally
_original_connect = sqlite3.connect
def _safe_connect(*args, **kwargs):
    if 'timeout' not in kwargs:
        kwargs['timeout'] = 30.0
    return _original_connect(*args, **kwargs)
sqlite3.connect = _safe_connect

from flask import Flask, jsonify, request, send_from_directory, Response
from flask_cors import CORS

app = Flask(__name__, static_folder="static")
app.config['SEND_FILE_MAX_AGE_DEFAULT'] = 0
CORS(app)

@app.after_request
def add_cors_headers(response):
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, User-Agent, Accept'
    response.headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS'
    
    # Anti-caching for API
    if request.path.startswith('/api/'):
        response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
        response.headers['Pragma'] = 'no-cache'
        response.headers['Expires'] = '0'
    return response

@app.route('/api/<path:path>', methods=['OPTIONS'])
def handle_options(path):
    return "", 200

@app.route("/api/get_dump")
def get_dump():
    conn = get_db()
    try:
        row = conn.execute("SELECT value FROM scraper_status WHERE key='iphone_dump'").fetchone()
    except Exception as e:
        return Response(str(e), status=500)
    conn.close()
    return Response(row["value"] if row else "{}", mimetype="application/json")


@app.route("/api/latest-dump")
def get_latest_dump():
    return Response(get_scraper_status("iphone_systemic_extract", "{}"), mimetype="application/json")


@app.route("/api/test-cloudfront")
def test_cloudfront():
    import requests, os
    try:
        conf_token = os.environ.get("PLANHUB_AUTH_TOKEN", "")
        if not conf_token:
            import json
            try:
                with open('config.json', 'r') as f:
                    conf = json.load(f)
                    conf_token = conf.get("auth_token", "")
            except:
                pass
        
        r = requests.post("https://supplier.planhub.com/api/v3/projects/search", 
                         json={"limit": 2, "offset": 0, "sortColumn": "biddatetimesort", "sortDirection": "asc"},
                         headers={"Authorization": "auth_token " + conf_token, "Content-Type": "application/json", "Origin": "https://supplier.planhub.com", "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36"})
        return {"status": r.status_code, "text": r.text[:500]}
    except Exception as e:
        return {"error": str(e)}

@app.before_request
def require_auth():
    expected_password = os.environ.get("SCOUT_PASSWORD")
    if not expected_password:
        return # Auth disabled
    
    # Allow health check, receive, pixel, push, and bookmark setup to bypass auth
    bypass_paths = ["/api/health", "/api/receive", "/api/enrich/push", "/api/px", "/static/bookmark.html", "/api/scout/token", "/api/scout/refresh", "/api/scrape.js", "/api/diag.js"]
    if request.path in bypass_paths:
        return
        
    auth = request.authorization
    if not auth or auth.password != expected_password:
        return Response(
            'Authentication required. Please enter the Scout password.', 401,
            {'WWW-Authenticate': 'Basic realm="Scout Intelligence Dashboard"'}
        )

# Track enrichment state — Persistent in DB to avoid Gunicorn worker desync
# enrichment_status and log memory variables replaced by DB-backed storage
enrichment_process = None


DB_PATH = os.environ.get("PLANHUB_DB_PATH", os.path.join(os.path.dirname(os.path.abspath(__file__)), "planhub.db"))
# Ensure DB directory exists
_db_dir = os.path.dirname(os.path.abspath(DB_PATH))
if _db_dir and not os.path.exists(_db_dir):
    os.makedirs(_db_dir, exist_ok=True)

def set_scraper_status(key, value):
    """Persist a status value to the shared DB to synchronize across workers."""
    try:
        conn = get_db()
        # Use a retry loop for 'database is locked' errors
        import time as _t_sleep
        for i in range(5):
            try:
                conn.execute("INSERT OR REPLACE INTO scraper_status (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)", (f"enrich_{key}", str(value)))
                conn.commit()
                break
            except sqlite3.OperationalError as e:
                if "locked" in str(e).lower():
                    _t_sleep.sleep(0.1 * (i + 1))
                    continue
                raise
        conn.close()
    except Exception as e:
        print(f"Error updating scraper_status for {key}: {e}")



def get_scraper_status(key, default=None):
    """Read a status value from the shared DB."""
    try:
        conn = get_db()
        row = conn.execute("SELECT value FROM scraper_status WHERE key = ?", (f"enrich_{key}",)).fetchone()
        conn.close()
        return row["value"] if row else default
    except:
        return default



# Load config for API proxy
_config = {}
_config_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "config.json")
if os.path.exists(_config_path):
    with open(_config_path) as f:
        _config = json.load(f)

AUTH_TOKEN = os.environ.get("PLANHUB_AUTH_TOKEN", _config.get("auth_token", ""))
SCRAPEOPS_API_KEY = os.environ.get("SCRAPEOPS_API_KEY", _config.get("scrapeops_api_key", ""))
API_BASE = "https://api.planhub.com/api/v1"
API_HEADERS = {
    "authorization": f"auth_token {AUTH_TOKEN}",
    "content-type": "application/json",
    "accept": "application/json",
    "origin": "https://generalcontractor.planhub.com",
    "referer": "https://generalcontractor.planhub.com/",
}

# ── Turso cloud DB (project_companies junction data lives here) ────────
TURSO_URL = os.environ.get("TURSO_DATABASE_URL", "https://scout-enrichment-bluejaxllc.aws-us-east-1.turso.io")
TURSO_TOKEN = os.environ.get("TURSO_AUTH_TOKEN", "") # REQUIRED VIA ENV

def turso_query(sql, args=None):
    """Execute a SQL query against the Turso cloud database via HTTP API.
    Returns list of dicts (rows) or empty list on error."""
    try:
        if not TURSO_TOKEN:
            print("[turso] Error: TURSO_AUTH_TOKEN not set")
            return []
        stmt = {"sql": sql}
        if args:
            stmt["args"] = [{"type": "integer" if isinstance(a, int) else "text", "value": str(a)} for a in args]
        payload = {
            "requests": [
                {"type": "execute", "stmt": stmt},
                {"type": "close"}
            ]
        }
        resp = http_requests.post(
            f"{TURSO_URL}/v2/pipeline",
            headers={
                "Authorization": f"Bearer {TURSO_TOKEN}",
                "Content-Type": "application/json"
            },
            json=payload,
            timeout=10
        )
        if resp.status_code != 200:
            print(f"[turso] HTTP {resp.status_code}: {resp.text[:200]}")
            return []
        
        data = resp.json()
        result = data.get("results", [{}])[0]
        response_data = result.get("response", {}).get("result", {})
        cols = [c.get("name", "") for c in response_data.get("cols", [])]
        rows_raw = response_data.get("rows", [])
        
        rows = []
        for row in rows_raw:
            d = {}
            for i, col in enumerate(cols):
                cell = row[i] if i < len(row) else {}
                d[col] = cell.get("value") if isinstance(cell, dict) else cell
            rows.append(d)
        return rows
    except Exception as e:
        print(f"[turso] Error: {e}")
        return []

def turso_count(sql, args=None):
    """Execute a COUNT query against Turso and return the integer count."""
    rows = turso_query(sql, args)
    if rows and rows[0]:
        first_val = list(rows[0].values())[0]
        return int(first_val) if first_val else 0
    return 0

def scrapeops_post(url, payload, timeout=30):
    """POST to PlanHub API via ScrapeOps residential proxy."""
    if not SCRAPEOPS_API_KEY:
        raise ValueError("CRITICAL: SCRAPEOPS_API_KEY is missing. Proxy required to avoid IP ban.")
    proxy_url = f"https://proxy.scrapeops.io/v1/?api_key={SCRAPEOPS_API_KEY}&url={urllib.parse.quote(url, safe='')}&keep_headers=true&method=POST&residential=true&country=us"
    return http_requests.post(proxy_url, headers=API_HEADERS, json=payload, timeout=timeout)

def scrapeops_get(url, timeout=30):
    """GET from PlanHub API via ScrapeOps residential proxy."""
    if not SCRAPEOPS_API_KEY:
        raise ValueError("CRITICAL: SCRAPEOPS_API_KEY is missing. Proxy required to avoid IP ban.")
    proxy_url = f"https://proxy.scrapeops.io/v1/?api_key={SCRAPEOPS_API_KEY}&url={urllib.parse.quote(url, safe='')}&keep_headers=true&residential=true&country=us"
    return http_requests.get(proxy_url, headers=API_HEADERS, timeout=timeout)


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    # Enable WAL mode for better concurrency (especially for multi-worker Gunicorn)
    try:
        conn.execute("PRAGMA journal_mode=WAL")
        conn.execute("PRAGMA synchronous=NORMAL")
    except: pass
    return conn

# Ensure all required tables exist on startup
try:
    _conn = get_db()
    _conn.execute("""
        CREATE TABLE IF NOT EXISTS projects (
            id INTEGER PRIMARY KEY,
            project TEXT,
            location TEXT,
            city TEXT,
            state TEXT,
            state_id INTEGER,
            zip TEXT,
            status TEXT,
            bid_date TEXT,
            date_created TEXT,
            date_updated TEXT,
            zone_name TEXT,
            source TEXT,
            negotiated_work TEXT,
            gc_selected TEXT,
            value_range TEXT,
            building_use TEXT,
            construction_type TEXT,
            project_type TEXT,
            contacts TEXT,
            first_seen TEXT,
            last_seen TEXT,
            planhub_id INTEGER
        )
    """)
    _conn.execute("""
        CREATE TABLE IF NOT EXISTS scrape_runs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            started_at TEXT,
            finished_at TEXT,
            total_projects INTEGER,
            new_projects INTEGER,
            updated_projects INTEGER,
            status TEXT,
            pid INTEGER
        )
    """)
    try:
        _conn.execute("ALTER TABLE scrape_runs ADD COLUMN pid INTEGER")
    except:
        pass
        
    try:
        _conn.execute("ALTER TABLE projects ADD COLUMN enriched_at DATETIME")
    except:
        pass
    _conn.execute("""
        CREATE TABLE IF NOT EXISTS scraper_health (
            id TEXT PRIMARY KEY,
            name TEXT,
            status TEXT,
            last_heartbeat TEXT,
            details TEXT
        )
    """)
    _conn.execute("""
        CREATE TABLE IF NOT EXISTS api_keys (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            provider TEXT,
            key_value TEXT UNIQUE,
            status TEXT,
            added_at TEXT,
            credits_used INTEGER DEFAULT 0
        )
    """)
    # Auto-migrate: add credits_used column if missing (existing DBs)
    try:
        _conn.execute("ALTER TABLE api_keys ADD COLUMN credits_used INTEGER DEFAULT 0")
    except:
        pass
    _conn.execute("CREATE INDEX IF NOT EXISTS idx_projects_state ON projects(state_id)")
    _conn.execute("CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status)")
    _conn.execute("CREATE INDEX IF NOT EXISTS idx_projects_date ON projects(date_created)")
    _conn.execute("CREATE INDEX IF NOT EXISTS idx_projects_bid ON projects(bid_date)")
    # Companies table with full schema
    _conn.execute("""
        CREATE TABLE IF NOT EXISTS companies (
            id TEXT PRIMARY KEY,
            name TEXT, type TEXT, phone TEXT, email TEXT,
            address TEXT, city TEXT, state TEXT, zipcode TEXT,
            website TEXT, fax TEXT, trades TEXT, source TEXT DEFAULT '',
            company_size TEXT, logo TEXT, latitude TEXT, longitude TEXT,
            raw_json TEXT, scraped_at TEXT
        )
    """)
    _conn.execute("CREATE INDEX IF NOT EXISTS idx_companies_state ON companies(state)")
    _conn.execute("CREATE INDEX IF NOT EXISTS idx_companies_name ON companies(name)")
    _conn.execute("CREATE INDEX IF NOT EXISTS idx_companies_source ON companies(source)")
    _conn.execute("CREATE INDEX IF NOT EXISTS idx_companies_planhub_id ON companies(id)")
    # State enrichment progress tracking
    _conn.execute("""
        CREATE TABLE IF NOT EXISTS state_enrichment_progress (
            state_id INTEGER PRIMARY KEY,
            state_name TEXT,
            total_projects INTEGER DEFAULT 0,
            enriched_projects INTEGER DEFAULT 0,
            status TEXT DEFAULT 'pending',
            last_updated TEXT
        )
    """)
    # Auto-migrate: add missing columns to existing companies table
    for col, coltype in [('website','TEXT'), ('fax','TEXT'), ('trades','TEXT'), ('source','TEXT'), ('company_size','TEXT'), ('logo','TEXT'), ('latitude','TEXT'), ('longitude','TEXT')]:
        try:
            _conn.execute(f"ALTER TABLE companies ADD COLUMN {col} {coltype}")
        except:
            pass  # Column already exists
    _conn.execute("""
        CREATE TABLE IF NOT EXISTS scraper_status (
            key TEXT PRIMARY KEY,
            value TEXT,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    _conn.execute("""
        CREATE TABLE IF NOT EXISTS scraper_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT,
            line TEXT,
            type TEXT DEFAULT 'enrichment'
        )
    """)
    _conn.execute("CREATE INDEX IF NOT EXISTS idx_scraper_logs_id ON scraper_logs(id)")
    # Initialize default status if empty
    defaults = {
        "enrich_running": "0",
        "enrich_progress": "0",
        "enrich_total": "0",
        "enrich_current_project": "",
        "enrich_speed": "0",
        "enrich_errors": "0"
    }
    for k, v in defaults.items():
        _conn.execute("INSERT OR IGNORE INTO scraper_status (key, value) VALUES (?, ?)", (k, v))
    _conn.commit()
    _conn.close()
except Exception as e:
    print(f"Startup DB Error: {e}")


# ── Daily auto-purge: mark expired bids as "Bid Closed" ────────────────
import time as _time

def _daily_bid_purge():
    """Background thread: every 24h, mark projects with past bid dates as 'Bid Closed'."""
    while True:
        try:
            _time.sleep(60)  # Wait 1 min after startup before first run
            conn = get_db()
            result = conn.execute("""
                UPDATE projects SET status = 'Bid Closed'
                WHERE bid_date IS NOT NULL AND bid_date != ''
                AND SUBSTR(REPLACE(bid_date, '/', '-'), 1, 10) <= date('now')
                AND status != 'Bid Closed'
            """)
            count = result.rowcount
            conn.commit()
            conn.close()
            if count > 0:
                print(f"[purge] Marked {count} expired bids as 'Bid Closed'")
        except Exception as e:
            print(f"[purge] Error: {e}")
        _time.sleep(86400)  # Sleep 24 hours

_purge_thread = threading.Thread(target=_daily_bid_purge, daemon=True)
_purge_thread.start()
print("[purge] Daily bid purge thread started")

# ── Dashboard UI ────────────────────────────────────────────────────────
@app.route("/")
def index():
    response = send_from_directory("static", "index.html")
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    return response

@app.route("/static/<path:path>")
def serve_static(path):
    response = send_from_directory("static", path)
    if path.endswith(".html") or path.endswith(".js") or path.endswith(".css"):
        response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    return response



# -- Inline scraper script (bypasses .dockerignore) -----------------------
_SCRAPE_JS = None
def _load_scrape_js():
    global _SCRAPE_JS
    for p in ['static/scrape.js', 'iphone_scraper_v3.js']:
        if os.path.exists(p):
            with open(p, 'r') as f:
                _SCRAPE_JS = f.read()
            print(f'[scrape] Loaded scraper from {p} ({len(_SCRAPE_JS)} bytes)')
            return
    print('[scrape] WARNING: No scraper script found!')
    _SCRAPE_JS = "alert('Scraper script not found on server');"

_load_scrape_js()

@app.route('/api/scrape.js')
def serve_scrape_js():
    resp = Response(_SCRAPE_JS, mimetype='application/javascript')
    resp.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
    resp.headers['Access-Control-Allow-Origin'] = '*'
    return resp


# -- Inline diagnostic script -----------------------------------------------
_DIAG_JS = None
def _load_diag_js():
    global _DIAG_JS
    for p in ['static/diag.js']:
        if os.path.exists(p):
            with open(p, 'r') as f:
                _DIAG_JS = f.read()
            print(f'[diag] Loaded from {p}')
            return
    _DIAG_JS = "alert('diag not found');"

_load_diag_js()

@app.route('/api/diag.js')
def serve_diag_js():
    resp = Response(_DIAG_JS, mimetype='application/javascript')
    resp.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
    resp.headers['Access-Control-Allow-Origin'] = '*'
    return resp

# -- Auto Token Refresh (2captcha + proxy) --------------------------------
_cached_token = None
_token_lock = threading.Lock()

def _get_cached_token():
    global _cached_token
    # Try env var first
    env_tk = os.environ.get("PLANHUB_AUTH_TOKEN", "")
    if env_tk:
        return env_tk
    # Try cached
    if _cached_token:
        return _cached_token
    # Try config.json
    try:
        with open('config.json', 'r') as f:
            conf = json.load(f)
            if conf.get('auth_token'):
                _cached_token = conf['auth_token']
                return _cached_token
    except:
        pass
    return None

def _solve_captcha_2captcha():
    """Solve reCAPTCHA v3 via 2captcha"""
    api_key = os.environ.get("TWO_CAPTCHA_KEY", "f5905970869a619b91b58cb74608f425")
    site_key = "6Le_xBoiAAAAALbz6bfDe4wLQFB_ER-NFMm0SmiA"
    import time
    
    create_resp = http_requests.post("https://api.2captcha.com/createTask", json={
        "clientKey": api_key,
        "task": {
            "type": "RecaptchaV3TaskProxyless",
            "websiteURL": "https://access.planhub.com/signin",
            "websiteKey": site_key,
            "minScore": 0.3,
            "pageAction": "login"
        }
    })
    create_data = create_resp.json()
    if create_data.get("errorId", 1) != 0:
        return None, f"2captcha create error: {json.dumps(create_data)}"
    
    task_id = create_data["taskId"]
    for _ in range(30):
        time.sleep(5)
        get_resp = http_requests.post("https://api.2captcha.com/getTaskResult", json={
            "clientKey": api_key,
            "taskId": task_id
        })
        get_data = get_resp.json()
        if get_data.get("status") == "ready":
            return get_data["solution"]["gRecaptchaResponse"], None
        if get_data.get("errorId", 0) != 0:
            return None, f"2captcha poll error: {json.dumps(get_data)}"
    return None, "2captcha timeout"

def _api_login_planhub():
    """Login to PlanHub via API and return fresh auth_token"""
    global _cached_token
    import time
    
    email = os.environ.get("PLANHUB_EMAIL", "")
    password = os.environ.get("PLANHUB_PASSWORD", "")
    
    if not email or not password:
        try:
            with open('config.json', 'r') as f:
                conf = json.load(f)
                email = email or conf.get('email', '')
                password = password or conf.get('password', '')
        except:
            pass
    
    if not email or not password:
        return None, "No PlanHub credentials configured"
    
    # Solve captcha
    captcha_token, err = _solve_captcha_2captcha()
    if err:
        return None, err
    
    headers = {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
        'Origin': 'https://access.planhub.com',
        'Referer': 'https://access.planhub.com/'
    }
    
    # Try v2 login
    last_error = ""
    for endpoint in ['/api/v2/auth/login', '/api/v1/auth/login']:
        try:
            resp = http_requests.post(
                f'https://api.planhub.com{endpoint}',
                headers=headers,
                json={'email': email, 'password': password, 're_captcha_token': captcha_token},
                timeout=30
            )
            data = resp.json()
            print(f"[token-refresh] {endpoint} status={resp.status_code} body={json.dumps(data)[:200]}")
            if data.get('auth_token'):
                _cached_token = data['auth_token']
                # Save to config
                try:
                    with open('config.json', 'r') as f:
                        conf = json.load(f)
                    conf['auth_token'] = _cached_token
                    conf['token_refreshed'] = time.strftime('%Y-%m-%dT%H:%M:%S.000Z')
                    with open('config.json', 'w') as f:
                        json.dump(conf, f, indent=4)
                except:
                    pass
                return _cached_token, None
            last_error = f"{endpoint} => {resp.status_code}: {json.dumps(data)[:300]}"
        except Exception as e:
            last_error = f"{endpoint} => exception: {str(e)}"
            continue
    
    return None, f"Login failed for {email}. Last: {last_error}"

@app.route('/api/scout/token')
def get_scout_token():
    """Return the current cached token"""
    tk = _get_cached_token()
    return jsonify({"token": tk or "", "has_token": bool(tk)})

@app.route('/api/scout/refresh', methods=['POST'])
def refresh_scout_token():
    """Force a fresh login to get a new token"""
    with _token_lock:
        token, err = _api_login_planhub()
        if token:
            return jsonify({"status": "ok", "token": token[:25] + "...", "message": "Token refreshed!"})
        return jsonify({"status": "error", "message": err}), 500


# ── API: Stats ──────────────────────────────────────────────────────────
@app.route("/api/stats")
def stats():
    conn = get_db()
    total = conn.execute("SELECT COUNT(*) FROM projects").fetchone()[0]
    by_status = conn.execute(
        "SELECT status, COUNT(*) as count FROM projects GROUP BY status ORDER BY count DESC"
    ).fetchall()
    by_state = conn.execute(
        "SELECT state_id, zone_name, COUNT(*) as count, state FROM projects GROUP BY state_id ORDER BY count DESC"
    ).fetchall()
    newest = conn.execute(
        "SELECT date_created FROM projects ORDER BY date_created DESC LIMIT 1"
    ).fetchone()
    new_this_week = conn.execute(
        "SELECT COUNT(*) FROM projects WHERE date_created >= datetime('now', '-7 days')"
    ).fetchone()[0]

    # Contact/enrichment stats
    enriched = conn.execute(
        "SELECT COUNT(*) FROM projects WHERE contacts IS NOT NULL AND contacts != '' AND contacts != '[]'"
    ).fetchone()[0]
    with_metadata = conn.execute(
        "SELECT COUNT(*) FROM projects WHERE building_use IS NOT NULL AND building_use != ''"
    ).fetchone()[0]

    # Last scrape run
    last_run = conn.execute(
        "SELECT * FROM scrape_runs ORDER BY id DESC LIMIT 1"
    ).fetchone()

    conn.close()
    return jsonify({
        "total_projects": total,
        "new_this_week": new_this_week,
        "newest_date": newest[0] if newest else None,
        "by_status": [{"status": r[0], "count": r[1]} for r in by_status],
        "by_state": [{"state_id": r[0], "zone": r[1], "count": r[2], "state": r[3]} for r in by_state],
        "last_run": dict(last_run) if last_run else None,
        "enriched_count": enriched,
        "with_metadata": with_metadata,
        "enrichment": {
            "running": bool(int(get_scraper_status("running", "0"))),
            "progress": int(get_scraper_status("progress", "0")),
            "total": int(get_scraper_status("total", "0")),
            "speed": float(get_scraper_status("speed", "0"))
        }
    })



# ── API: Filter options (distinct values for dropdowns) ────────────────
@app.route("/api/filter-options")
def filter_options():
    conn = get_db()
    statuses = conn.execute(
        "SELECT DISTINCT status FROM projects WHERE status IS NOT NULL AND status != '' ORDER BY status"
    ).fetchall()
    states = conn.execute(
        "SELECT DISTINCT state_id, state FROM projects WHERE state IS NOT NULL AND state != '' AND state_id IS NOT NULL ORDER BY state"
    ).fetchall()
    building_uses = conn.execute(
        "SELECT DISTINCT building_use FROM projects WHERE building_use IS NOT NULL AND building_use != '' ORDER BY building_use"
    ).fetchall()
    sources = conn.execute(
        "SELECT DISTINCT source FROM projects WHERE source IS NOT NULL AND source != '' ORDER BY source"
    ).fetchall()
    # Separate state list for companies (uses 2-letter codes, not numeric IDs)
    company_states = []
    try:
        raw_company_states = conn.execute(
            "SELECT DISTINCT state FROM companies WHERE state IS NOT NULL AND state != '' ORDER BY state"
        ).fetchall()
        
        VALID_USA_STATES = {'alabama', 'alaska', 'arizona', 'arkansas', 'california', 'colorado', 'connecticut', 'delaware', 'florida', 'georgia', 'hawaii', 'idaho', 'illinois', 'indiana', 'iowa', 'kansas', 'kentucky', 'louisiana', 'maine', 'maryland', 'massachusetts', 'michigan', 'minnesota', 'mississippi', 'missouri', 'montana', 'nebraska', 'nevada', 'new hampshire', 'new jersey', 'new mexico', 'new york', 'north carolina', 'north dakota', 'ohio', 'oklahoma', 'oregon', 'pennsylvania', 'rhode island', 'south carolina', 'south dakota', 'tennessee', 'texas', 'utah', 'vermont', 'virginia', 'washington', 'west virginia', 'wisconsin', 'wyoming', 'district of columbia'}
        VALID_USA_ABBREVS = {'al', 'ak', 'az', 'ar', 'ca', 'co', 'ct', 'de', 'fl', 'ga', 'hi', 'id', 'il', 'in', 'ia', 'ks', 'ky', 'la', 'me', 'md', 'ma', 'mi', 'mn', 'ms', 'mo', 'mt', 'ne', 'nv', 'nh', 'nj', 'nm', 'ny', 'nc', 'nd', 'oh', 'ok', 'or', 'pa', 'ri', 'sc', 'sd', 'tn', 'tx', 'ut', 'vt', 'va', 'wa', 'wv', 'wi', 'wy', 'dc'}
        
        sanitized = set()
        for r in raw_company_states:
            st = r[0].strip().lower()
            if st in VALID_USA_STATES or st in VALID_USA_ABBREVS:
                sanitized.add(r[0])
                
        company_states = sorted(list(sanitized))
    except:
        pass
    conn.close()
    return jsonify({
        "statuses": [{"status": r[0]} for r in statuses],
        "states": [{"state_id": r[0], "state": r[1]} for r in states],
        "building_uses": [{"building_use": r[0]} for r in building_uses],
        "sources": [{"source": r[0]} for r in sources],
        "company_states": [{"state": r} for r in company_states]
    })


def build_filter_query(args):
    where_clauses = []
    params = []
    
    if args.get("status"):
        where_clauses.append("status = ?")
        params.append(args.get("status"))
    if args.get("state_id"):
        state_val = int(args.get("state_id"))
        where_clauses.append("(state_id = ? OR state IN (SELECT DISTINCT state FROM projects WHERE state_id = ? AND state IS NOT NULL))")
        params.extend([state_val, state_val])
    if args.get("zone"):
        where_clauses.append("zone_name = ?")
        params.append(args.get("zone"))
    if args.get("value"):
        where_clauses.append("value_range = ?")
        params.append(args.get("value"))
    if args.get("building_use"):
        where_clauses.append("building_use = ?")
        params.append(args.get("building_use"))
    if args.get("source"):
        sources = args.get("source")
        source_list = [s.strip() for s in sources.split(',') if s.strip()]
        if source_list:
            source_clauses = []
            for s in source_list:
                if s.lower() == 'planhub':
                    source_clauses.append("(source LIKE 'PlanHub%' OR source LIKE 'planhub%' OR source IS NULL OR source = '')")
                else:
                    source_clauses.append("source LIKE ?")
                    params.append(f"{s}%")
            where_clauses.append(f"({' OR '.join(source_clauses)})")
    if args.get("ids"):
        ids = [i for i in args.get("ids").split(",") if i.isdigit()]
        if ids:
            where_clauses.append(f"id IN ({','.join(['?']*len(ids))})")
            params.extend(ids)

    # Days to bid (min_days / max_days slider)
    # NOTE: bid_date is stored as '2024/11/05EST12:00:00' — normalize to YYYY-MM-DD
    if args.get("min_days"):
        where_clauses.append("SUBSTR(REPLACE(bid_date, '/', '-'), 1, 10) >= date('now', '+' || ? || ' days')")
        params.append(str(int(args.get("min_days"))))
        
    if args.get("max_days"):
        val = int(args.get("max_days"))
        if val < 120:
            where_clauses.append("SUBSTR(REPLACE(bid_date, '/', '-'), 1, 10) <= date('now', '+' || ? || ' days')")
            params.append(str(val))
        elif val == 120:
            # Prevent showing expired projects even if max is dragged all the way
            where_clauses.append("SUBSTR(REPLACE(bid_date, '/', '-'), 1, 10) >= date('now')")

    date_filter = args.get("date")
    if date_filter == "today":
        where_clauses.append("date_created >= date('now', '-1 day')")
    elif date_filter == "week":
        where_clauses.append("date_created >= date('now', '-7 days')")
    elif date_filter == "month":
        where_clauses.append("date_created >= date('now', '-30 days')")

    search = args.get("q")
    if search:
        where_clauses.append("(project LIKE ? OR location LIKE ? OR city LIKE ? OR state LIKE ? OR building_use LIKE ? OR contacts LIKE ?)")
        params.extend([f"%{search}%", f"%{search}%", f"%{search}%", f"%{search}%", f"%{search}%", f"%{search}%"])

    # Hide expired / closed projects
    if args.get("hide_expired") == "1":
        where_clauses.append("(status IS NULL OR status NOT IN ('Bid Closed', 'Closed', 'Awarded'))")
        where_clauses.append("(bid_date IS NULL OR bid_date = '' OR SUBSTR(REPLACE(bid_date, '/', '-'), 1, 10) >= date('now'))")

    where_sql = "WHERE " + " AND ".join(where_clauses) if where_clauses else ""
    return where_sql, params

# ── API: Projects list ──────────────────────────────────────────────────
@app.route("/api/projects")
def projects():
    conn = get_db()
    page = int(request.args.get("page", 0))
    page_size = min(int(request.args.get("page_size", 50)), 200)
    sort_by = request.args.get("sort", "date_created")
    sort_dir = request.args.get("dir", "DESC")

    # Validate sort
    allowed_sorts = ["date_created", "project", "location", "status", "bid_date"]
    if sort_by not in allowed_sorts:
        sort_by = "date_created"
    if sort_dir.upper() not in ("ASC", "DESC"):
        sort_dir = "DESC"

    where_sql, params = build_filter_query(request.args)

    # Count
    total = conn.execute(f"SELECT COUNT(*) FROM projects {where_sql}", params).fetchone()[0]

    # Fetch page
    rows = conn.execute(
        f"SELECT * FROM projects {where_sql} ORDER BY {sort_by} {sort_dir} LIMIT ? OFFSET ?",
        params + [page_size, page * page_size]
    ).fetchall()

    conn.close()
    return jsonify({
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size,
        "projects": [dict(r) for r in rows]
    })


# ── API: Project detail (local DB) ─────────────────────────────────────
@app.route("/api/project/<int:project_id>")
def project_detail(project_id):
    conn = get_db()
    row = conn.execute("SELECT * FROM projects WHERE id = ?", (project_id,)).fetchone()
    conn.close()
    if row:
        return jsonify(dict(row))
    return jsonify({"error": "not found"}), 404


# ── API: Companies Directory (Centralized Database & Deduplication) ────
@app.route("/api/companies")
def companies_dir():
    conn = get_db()
    page = int(request.args.get("page", 0))
    page_size = min(int(request.args.get("page_size", 50)), 200)

    try:
        search_query = request.args.get("q", "").strip()
        state_filter = request.args.get("state", "").strip()
        source_filter = request.args.get("source", "").strip()
        type_filter = request.args.get("type", "").strip()
        
        where_clause = "WHERE name IS NOT NULL AND name != ''"
        params = []
        if search_query:
            where_clause += " AND (name LIKE ? OR city LIKE ? OR state LIKE ?)"
            match_str = f"%{search_query}%"
            params.extend([match_str, match_str, match_str])
        
        if state_filter:
            where_clause += " AND state = ?"
            params.append(state_filter)
            
        if source_filter:
            source_list = [s.strip() for s in source_filter.split(',') if s.strip()]
            if source_list:
                source_clauses = []
                for s in source_list:
                    if s.lower() == 'planhub':
                        # PlanHub filter should include: source='PlanHub', source='planhub_enrichment', 
                        # and source='' or NULL (from GC directory scrape)
                        source_clauses.append("(source LIKE 'PlanHub%' OR source LIKE 'planhub%' OR source IS NULL OR source = '')")
                    else:
                        source_clauses.append("source LIKE ?")
                        params.append(f"{s}%")
                where_clause += f" AND ({' OR '.join(source_clauses)})"
        if type_filter:
            where_clause += " AND type = ?"
            params.append(type_filter)
            
        total_query = f"SELECT COUNT(DISTINCT TRIM(LOWER(name))) FROM companies {where_clause}"
        total = conn.execute(total_query, params).fetchone()[0]
        
        query = f"""
        SELECT id, name, type, phone, email, city, state, scraped_at, source, website, fax, trades
        FROM companies
        {where_clause}
        GROUP BY TRIM(LOWER(name))
        ORDER BY scraped_at DESC
        LIMIT ? OFFSET ?
        """
        rows = conn.execute(query, params + [page_size, page * page_size]).fetchall()
        companies_list = [dict(r) for r in rows]
    except Exception as e:
        print(f"Companies API error: {e}")
        total = 0
        companies_list = []

    conn.close()
    return jsonify({
        "total": total,
        "page": page,
        "page_size": page_size,
        "companies": companies_list
    })


# ── API: Project local contacts (from companies DB) ────────────────────
@app.route("/api/project/<int:project_id>/local-contacts")
def project_local_contacts(project_id):
    """Find contractors linked to this project.
    Priority: 1) Turso project_companies (actual bidders)
              2) Local SQLite project_companies
              3) State-matched fallback (area contractors)
    Supports pagination with ?page=0&page_size=50 params."""
    try:
        conn = get_db()
        page = int(request.args.get("page", 0))
        page_size = min(int(request.args.get("page_size", 50)), 200)

        proj = conn.execute("SELECT planhub_id, state, city FROM projects WHERE id = ?", (project_id,)).fetchone()
        if not proj:
            conn.close()
            return jsonify({"error": "Project not found"}), 404

        planhub_id = proj["planhub_id"]
        state = proj["state"] or ""
        city = proj["city"] or ""

        gcs = []
        subs = []
        total = 0
        source_type = "none"

        # ── Strategy 1: Query Turso cloud DB for project-specific subs ──
        project_subs_total = 0
        if planhub_id:
            project_subs_total = turso_count(
                "SELECT COUNT(*) FROM project_companies WHERE project_planhub_id = ?",
                [planhub_id]
            )

            if project_subs_total > 0:
                total = project_subs_total
                source_type = "project-linked"
                rows = turso_query("""
                    SELECT pc.contact_name, pc.role,
                           c.company_name, c.city, c.state, c.phone, c.email,
                           c.website, c.address
                    FROM project_companies pc
                    LEFT JOIN companies c ON pc.company_planhub_id = c.planhub_id
                    WHERE pc.project_planhub_id = ?
                    ORDER BY
                        CASE WHEN pc.contact_name IS NOT NULL AND pc.contact_name != '' THEN 0 ELSE 1 END,
                        CASE WHEN c.email IS NOT NULL AND c.email != '' THEN 0 ELSE 1 END,
                        CASE WHEN c.phone IS NOT NULL AND c.phone != '' THEN 0 ELSE 1 END
                    LIMIT ? OFFSET ?
                """, [planhub_id, page_size, page * page_size])

                for r in rows:
                    entry = {
                        "contact_name": r.get("contact_name") or "",
                        "company_name": r.get("company_name") or "",
                        "phone": r.get("phone") or "",
                        "email": r.get("email") or "",
                        "city": r.get("city") or "",
                        "state": r.get("state") or "",
                        "website": r.get("website") or "",
                        "address": r.get("address") or "",
                        "trade": "",
                        "role": r.get("role") or ""
                    }
                    role = (r.get("role") or "").lower()
                    if "general" in role or "gc" in role:
                        gcs.append(entry)
                    else:
                        subs.append(entry)

        # ── Strategy 2: Local SQLite project_companies fallback ──
        if total == 0 and planhub_id:
            pc_exists = conn.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='project_companies'").fetchone()
            if pc_exists:
                local_total = conn.execute(
                    "SELECT COUNT(*) FROM project_companies WHERE project_planhub_id = ?",
                    (planhub_id,)
                ).fetchone()[0]
                if local_total > 0:
                    total = local_total
                    project_subs_total = local_total
                    source_type = "project-linked"
                    # Detect columns
                    cols = {c[1] for c in conn.execute("PRAGMA table_info(companies)").fetchall()}
                    name_col = "company_name" if "company_name" in cols else "name"
                    rows = conn.execute(f"""
                        SELECT pc.contact_name, pc.role,
                               c.{name_col} AS co_name, c.phone, c.email,
                               c.website, c.city, c.state
                        FROM project_companies pc
                        LEFT JOIN companies c ON pc.company_planhub_id = c.planhub_id
                        WHERE pc.project_planhub_id = ?
                        LIMIT ? OFFSET ?
                    """, (planhub_id, page_size, page * page_size)).fetchall()
                    for r in rows:
                        entry = {
                            "contact_name": r["contact_name"] or "",
                            "company_name": r["co_name"] or "",
                            "phone": r["phone"] or "",
                            "email": r["email"] or "",
                            "city": r["city"] or "",
                            "state": r["state"] or "",
                            "website": r["website"] or "",
                            "address": "",
                            "trade": "",
                            "role": r["role"] or ""
                        }
                        role = (r["role"] or "").lower()
                        if "general" in role or "gc" in role:
                            gcs.append(entry)
                        else:
                            subs.append(entry)

        # ── Strategy 3: State-matched fallback (area contractors, NOT project-specific) ──
        area_total = 0
        if total == 0 and state:
            source_type = "state-matched"
            cols = {c[1] for c in conn.execute("PRAGMA table_info(companies)").fetchall()}
            name_col = "company_name" if "company_name" in cols else "name"
            contact_col = "contact_name" if "contact_name" in cols else "NULL"
            addr_col = "address" if "address" in cols else "NULL"

            # Create an abbreviation map locally to ensure we find 'NY' when state is 'New York'
            usa_states_map = {
                'alabama': 'al', 'alaska': 'ak', 'arizona': 'az', 'arkansas': 'ar', 'california': 'ca', 'colorado': 'co',
                'connecticut': 'ct', 'delaware': 'de', 'florida': 'fl', 'georgia': 'ga', 'hawaii': 'hi', 'idaho': 'id',
                'illinois': 'il', 'indiana': 'in', 'iowa': 'ia', 'kansas': 'ks', 'kentucky': 'ky', 'louisiana': 'la',
                'maine': 'me', 'maryland': 'md', 'massachusetts': 'ma', 'michigan': 'mi', 'minnesota': 'mn', 'mississippi': 'ms',
                'missouri': 'mo', 'montana': 'mt', 'nebraska': 'ne', 'nevada': 'nv', 'new hampshire': 'nh', 'new jersey': 'nj',
                'new mexico': 'nm', 'new york': 'ny', 'north carolina': 'nc', 'north dakota': 'nd', 'ohio': 'oh', 'oklahoma': 'ok',
                'oregon': 'or', 'pennsylvania': 'pa', 'rhode island': 'ri', 'south carolina': 'sc', 'south dakota': 'sd',
                'tennessee': 'tn', 'texas': 'tx', 'utah': 'ut', 'vermont': 'vt', 'virginia': 'va', 'washington': 'wa',
                'west virginia': 'wv', 'wisconsin': 'wi', 'wyoming': 'wy', 'district of columbia': 'dc'
            }
            search_state1 = state.strip().lower()
            search_state2 = usa_states_map.get(search_state1, search_state1)
            search_state3 = ""
            for k, v in usa_states_map.items():
                if v == search_state1:
                    search_state3 = k
                    break
            
            search_states = list(set([search_state1, search_state2, search_state3]))
            placeholders = ",".join(["?"] * len(search_states))

            total = conn.execute(f"""
                SELECT COUNT(*) FROM companies
                WHERE LOWER(state) IN ({placeholders}) AND {name_col} IS NOT NULL AND {name_col} != ''
            """, search_states).fetchone()[0]
            area_total = total

            rows = conn.execute(f"""
                SELECT {name_col} AS co_name, {contact_col} AS contact_name,
                       phone, email, city, state, website, {addr_col} AS address,
                    CASE WHEN LOWER(TRIM(city)) = LOWER(TRIM(?)) THEN 5 ELSE 0 END +
                    CASE WHEN email IS NOT NULL AND email != '' THEN 2 ELSE 0 END +
                    CASE WHEN phone IS NOT NULL AND phone != '' THEN 2 ELSE 0 END AS score
                FROM companies
                WHERE LOWER(state) IN ({placeholders}) AND {name_col} IS NOT NULL AND {name_col} != ''
                GROUP BY TRIM(LOWER({name_col}))
                ORDER BY score DESC
                LIMIT ? OFFSET ?
            """, (city, *search_states, page_size, page * page_size)).fetchall()


            for r in rows:
                entry = {
                    "contact_name": (r["contact_name"] or "") if r["contact_name"] else "",
                    "company_name": r["co_name"] or "",
                    "phone": r["phone"] or "",
                    "email": r["email"] or "",
                    "city": r["city"] or "",
                    "state": r["state"] or "",
                    "website": r["website"] or "",
                    "address": (r["address"] or "") if r["address"] else "",
                    "trade": "",
                    "role": ""
                }
                subs.append(entry)

        conn.close()

        return jsonify({
            "general_contractors": gcs,
            "subs": subs,
            "_gc_total": len(gcs),
            "_sub_total": len(subs),
            "_total": total,
            "_page": page,
            "_page_size": page_size,
            "_total_pages": (total + page_size - 1) // page_size if total > 0 else 0,
            "_source": source_type,
            "_project_state": state,
            "_project_city": city,
            "_project_subs_total": project_subs_total,
            "_area_total": area_total
        })
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


# ── API: Project CSV Export (server-side, all contractors) ──────────────
@app.route("/api/project/<int:project_id>/export-csv")
def project_export_csv(project_id):
    """Generate a clean, well-structured CSV with ALL project contractors.
    Fetches from Turso first (project-specific subs), falls back to local DB."""
    import csv
    import io
    
    try:
        conn = get_db()
        proj = conn.execute("SELECT * FROM projects WHERE id = ?", (project_id,)).fetchone()
        if not proj:
            conn.close()
            return jsonify({"error": "Project not found"}), 404
        
        p = dict(proj)
        planhub_id = p.get("planhub_id") or p.get("id")
        state = p.get("state") or ""
        city = p.get("city") or ""
        
        output = io.StringIO()
        writer = csv.writer(output, quoting=csv.QUOTE_ALL)
        
        # ═══════════════════════════════════════════
        # Section 1: Project Information
        # ═══════════════════════════════════════════
        writer.writerow(["PROJECT INFORMATION", "", "", "", ""])
        writer.writerow(["", "", "", "", ""])
        writer.writerow(["Project Name", p.get("project") or ""])
        writer.writerow(["Status", p.get("status") or ""])
        writer.writerow(["Address", p.get("location") or ""])
        writer.writerow(["City", city])
        writer.writerow(["State", state])
        writer.writerow(["ZIP", p.get("zip") or ""])
        writer.writerow(["Region", p.get("zone_name") or ""])
        writer.writerow(["", "", "", "", ""])
        writer.writerow(["Bid Date", p.get("bid_date") or ""])
        writer.writerow(["Building Use", p.get("building_use") or ""])
        writer.writerow(["Construction Type", p.get("construction_type") or ""])
        writer.writerow(["Project Type", p.get("project_type") or ""])
        writer.writerow(["Value Range", p.get("value_range") or ""])
        writer.writerow(["Negotiated Work", p.get("negotiated_work") or ""])
        writer.writerow(["Source", p.get("source") or ""])
        writer.writerow(["PlanHub ID", planhub_id])
        writer.writerow(["", "", "", "", ""])
        writer.writerow(["", "", "", "", ""])
        
        # ═══════════════════════════════════════════
        # Section 2: Contractors (ALL, no pagination cap)
        # ═══════════════════════════════════════════
        all_contractors = []
        source_type = "none"
        
        # Strategy 1: Turso project_companies (actual bidders)
        if planhub_id:
            total = turso_count(
                "SELECT COUNT(*) FROM project_companies WHERE project_planhub_id = ?",
                [planhub_id]
            )
            if total > 0:
                source_type = "project-linked"
                # Fetch ALL subs in one go (no pagination limit for CSV)
                all_contractors = turso_query("""
                    SELECT pc.contact_name, pc.role,
                           c.company_name, c.city, c.state, c.phone, c.email,
                           c.website, c.address
                    FROM project_companies pc
                    LEFT JOIN companies c ON pc.company_planhub_id = c.planhub_id
                    WHERE pc.project_planhub_id = ?
                    ORDER BY c.company_name ASC
                """, [planhub_id])
        
        # Strategy 2: Local SQLite project_companies
        if not all_contractors and planhub_id:
            pc_exists = conn.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='project_companies'").fetchone()
            if pc_exists:
                local_rows = conn.execute("""
                    SELECT pc.contact_name, pc.role,
                           c.company_name AS company_name, c.city, c.state, c.phone, c.email,
                           c.website
                    FROM project_companies pc
                    LEFT JOIN companies c ON pc.company_planhub_id = c.planhub_id
                    WHERE pc.project_planhub_id = ?
                    ORDER BY c.company_name ASC
                """, (planhub_id,)).fetchall()
                if local_rows:
                    source_type = "project-linked"
                    all_contractors = [dict(r) for r in local_rows]
        
        # Strategy 3: Cached contacts JSON on project
        if not all_contractors:
            contacts_json = p.get("contacts")
            if contacts_json:
                try:
                    parsed = json.loads(contacts_json)
                    if parsed:
                        source_type = "enriched-contacts"
                        all_contractors = parsed
                except:
                    pass
        
        # Strategy 4: State-matched fallback
        if not all_contractors and state:
            source_type = "state-matched"
            cols = {c[1] for c in conn.execute("PRAGMA table_info(companies)").fetchall()}
            name_col = "company_name" if "company_name" in cols else "name"
            contact_col = "contact_name" if "contact_name" in cols else "NULL"
            addr_col = "address" if "address" in cols else "NULL"
            
            local_rows = conn.execute(f"""
                SELECT {name_col} AS company_name, {contact_col} AS contact_name,
                       phone, email, city, state, website, {addr_col} AS address
                FROM companies
                WHERE state = ? AND {name_col} IS NOT NULL AND {name_col} != ''
                GROUP BY TRIM(LOWER({name_col}))
                ORDER BY
                    CASE WHEN LOWER(TRIM(city)) = LOWER(TRIM(?)) THEN 0 ELSE 1 END,
                    CASE WHEN email IS NOT NULL AND email != '' THEN 0 ELSE 1 END,
                    {name_col} ASC
                LIMIT 5000
            """, (state, city)).fetchall()
            all_contractors = [dict(r) for r in local_rows]
        
        conn.close()
        
        # Write contractor section
        label = f"SUBCONTRACTORS BIDDING ON THIS PROJECT ({len(all_contractors)} total)" if source_type == "project-linked" else (
            f"ENRICHED CONTACTS ({len(all_contractors)} total)" if source_type == "enriched-contacts" else
            f"AREA CONTRACTORS IN {state} ({len(all_contractors)} total — not project-specific)"
        )
        writer.writerow([label, "", "", "", "", "", "", "", ""])
        writer.writerow(["", "", "", "", ""])
        writer.writerow(["#", "Company Name", "Contact Name", "Role", "Phone", "Email", "City", "State", "Address", "Website"])
        
        for idx, c in enumerate(all_contractors, 1):
            if isinstance(c, dict):
                writer.writerow([
                    idx,
                    c.get("company_name") or c.get("title") or c.get("name") or c.get("cName") or "",
                    c.get("contact_name") or c.get("name") or "",
                    c.get("role") or c.get("company_type") or "",
                    c.get("phone") or "",
                    c.get("email") or "",
                    c.get("city") or c.get("cCity") or "",
                    c.get("state") or c.get("cState") or "",
                    c.get("address") or "",
                    c.get("website") or ""
                ])
        
        # Generate response
        csv_content = output.getvalue()
        clean_name = "".join(c if c.isalnum() or c in " -_" else "_" for c in (p.get("project") or "project"))
        clean_name = clean_name.strip().replace(" ", "_")[:60]
        
        return Response(
            csv_content,
            mimetype="text/csv",
            headers={
                "Content-Disposition": f'attachment; filename="BlueJax_Scout_{clean_name}_{planhub_id}.csv"',
                "Content-Type": "text/csv; charset=utf-8"
            }
        )
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


# ── API: Project detail (live proxy from PlanHub) ──────────────────────
@app.route("/api/project/<int:project_id>/live")
def project_detail_live(project_id):
    """Fetch fresh project details and ALL contractor lists from PlanHub API.
    Paginates through the contractor list to ensure every GC and Sub is returned.
    NOTE: Only fires for projects in the auth token's covered zones (TX).
    Other states skip straight to the local-contacts state-matched fallback."""
    try:
        # Look up the real PlanHub project ID AND state from our DB
        conn = get_db()
        row = conn.execute("SELECT planhub_id, state FROM projects WHERE id = ?", (project_id,)).fetchone()
        conn.close()
        if not row:
            return jsonify({"error": "Project not found"}), 404
        api_project_id = row["planhub_id"] if row and row["planhub_id"] else project_id
        project_state = (row["state"] or "").strip().upper()

        # Only use ScrapeOps live proxy for TX projects (auth token zone)
        # Other states get served by the local-contacts state-matched fallback instead
        tx_aliases = {"TX", "TEXAS"}
        if project_state not in tx_aliases:
            return jsonify({"error": "Non-TX project — use local-contacts fallback", "_skip_reason": "out_of_zone"}), 404

        # Step 1: Fetch initial details
        payload = {
            "project_id": api_project_id,
            "track_project_view": False
        }
        resp = scrapeops_post(f"{API_BASE}/project-leads/get-details", payload, timeout=30)
        if resp.status_code != 200:
            return jsonify({"error": f"PlanHub API error {resp.status_code}", "text": resp.text}), resp.status_code

        data = resp.json().get("result", {})

        # Step 2: Paginate contractors if there are more than returned
        # PlanHub returns total counts but only first ~30 per page
        gc_total = data.get("total_gc_count", 0) or data.get("gc_count", 0) or 0
        sub_total = data.get("total_sub_count", 0) or data.get("sub_count", 0) or 0
        gcs = data.get("general_contractors", data.get("gc_list", []))
        subs = data.get("subs", data.get("sub_list", []))

        # Fetch remaining GC pages
        if gc_total > len(gcs) and len(gcs) > 0:
            page_size = 30  # PlanHub forces max 30 per page generally
            page = 2
            while len(gcs) < gc_total and page < 6:  # Safety cap (150 max)
                try:
                    page_payload = {
                        "project_id": api_project_id,
                        "track_project_view": False,
                        "gc_page": page,
                        "gc_page_size": page_size,
                        "contractor_type": "gc"
                    }
                    pr = scrapeops_post(f"{API_BASE}/project-leads/get-details", page_payload, timeout=30)
                    if pr.status_code == 200:
                        pd = pr.json().get("result", {})
                        new_gcs = pd.get("general_contractors", pd.get("gc_list", []))
                        if not new_gcs:
                            break
                        # Deduplicate by company_id
                        existing_ids = {g.get("company_id") or g.get("id") for g in gcs}
                        for gc in new_gcs:
                            gc_id = gc.get("company_id") or gc.get("id")
                            if gc_id not in existing_ids:
                                gcs.append(gc)
                                existing_ids.add(gc_id)
                        if len(new_gcs) < 5:
                            break
                    else:
                        break
                    page += 1
                except Exception:
                    break

        # Fetch remaining Sub pages  
        if sub_total > len(subs) and len(subs) > 0:
            page_size = 30
            page = 2
            while len(subs) < sub_total and page < 8: # Cap at 240 subs
                try:
                    page_payload = {
                        "project_id": api_project_id,
                        "track_project_view": False,
                        "sub_page": page,
                        "sub_page_size": page_size,
                        "contractor_type": "sub"
                    }
                    pr = scrapeops_post(f"{API_BASE}/project-leads/get-details", page_payload, timeout=30)
                    if pr.status_code == 200:
                        pd = pr.json().get("result", {})
                        new_subs = pd.get("subs", pd.get("sub_list", []))
                        if not new_subs:
                            break
                        existing_ids = {s.get("company_id") or s.get("id") for s in subs}
                        for sub in new_subs:
                            sub_id = sub.get("company_id") or sub.get("id")
                            if sub_id not in existing_ids:
                                subs.append(sub)
                                existing_ids.add(sub_id)
                        if len(new_subs) < page_size:
                            break
                    else:
                        break
                    page += 1
                except Exception:
                    break

        # Update the data with the complete lists
        data["general_contractors"] = gcs
        data["subs"] = subs
        data["_gc_loaded"] = len(gcs)
        data["_gc_total"] = gc_total
        data["_sub_loaded"] = len(subs)
        data["_sub_total"] = sub_total

        # ── Cache contacts back to DB so they survive redeployments ──
        try:
            contacts_to_cache = []
            for g in gcs:
                contacts_to_cache.append({
                    "title": g.get("company_name") or g.get("name", ""),
                    "name": g.get("contact_name") or g.get("name", ""),
                    "company_type": "General Contractor",
                    "phone": g.get("phone", ""),
                    "email": g.get("email", ""),
                    "address": f'{g.get("city", "")}, {g.get("state", "")}',
                    "website": g.get("website", ""),
                    "fax": g.get("fax", ""),
                    "trades": g.get("trade", "") or g.get("trade_name", ""),
                    "awarded": g.get("awarded", False)
                })
            for s in subs:
                contacts_to_cache.append({
                    "title": s.get("company_name") or s.get("name", ""),
                    "name": s.get("contact_name") or s.get("name", ""),
                    "company_type": "Subcontractor",
                    "phone": s.get("phone", ""),
                    "email": s.get("email", ""),
                    "address": f'{s.get("city", "")}, {s.get("state", "")}',
                    "website": s.get("website", ""),
                    "fax": s.get("fax", ""),
                    "trades": s.get("trade", "") or s.get("trade_name", "")
                })
            if contacts_to_cache:
                cache_conn = get_db()
                cache_conn.execute("UPDATE projects SET contacts=? WHERE id=?",
                    (json.dumps(contacts_to_cache), project_id))
                cache_conn.commit()
                cache_conn.close()
        except Exception as cache_err:
            print(f"Warning: Could not cache contacts for project {project_id}: {cache_err}")

        return jsonify(data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ── API: Export CSV ─────────────────────────────────────────────────────
@app.route("/api/export-companies")
def export_companies_csv():
    conn = get_db()
    q = request.args.get("q", "").strip()
    state = request.args.get("state", "").strip()
    type_val = request.args.get("type", "").strip()
    source = request.args.get("source", "").strip()

    where_clauses = ["1=1"]
    params = []
    
    if q:
        where_clauses.append("(name LIKE ? OR city LIKE ? OR email LIKE ?)")
        lq = f"%{q}%"
        params.extend([lq, lq, lq])
    if state:
        where_clauses.append("state = ?")
        params.append(state)
    if type_val:
        where_clauses.append("type = ?")
        params.append(type_val)
    if source and source.lower() != "all":
        # Handle multiple sources
        sources = [s.strip() for s in source.split(",") if s.strip()]
        if sources:
            source_clauses = []
            for s in sources:
                source_clauses.append("source LIKE ?")
                params.append(f"{s}%")
            where_clauses.append(f"({' OR '.join(source_clauses)})")

    where_sql = " AND ".join(where_clauses)
    
    rows = conn.execute(
        f"SELECT id, name, type, address, city, state, zip, phone, email, website, source, scraped_at FROM companies WHERE {where_sql} ORDER BY name ASC",
        params
    ).fetchall()
    conn.close()

    import io, csv
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["ID", "Company Name", "Trade/Type", "Address", "City", "State", "ZIP", "Phone", "Email", "Website", "Source", "Date Scraped"])
    for r in rows:
        writer.writerow(list(r))

    return Response(
        output.getvalue(),
        mimetype="text/csv",
        headers={"Content-Disposition": "attachment;filename=planhub_companies.csv"}
    )

@app.route("/api/export")
def export_csv():
    conn = get_db()
    sort_by = request.args.get("sort", "date_created")
    sort_dir = request.args.get("dir", "DESC")
    allowed_sorts = ["date_created", "project", "location", "status", "bid_date"]
    if sort_by not in allowed_sorts:
        sort_by = "date_created"
    if sort_dir.upper() not in ("ASC", "DESC"):
        sort_dir = "DESC"

    where_sql, params = build_filter_query(request.args)
    
    rows = conn.execute(
        f"SELECT id, project, location, city, state, zip, status, bid_date, date_created, zone_name, value_range, building_use, construction_type, project_type, negotiated_work, gc_selected, contacts FROM projects {where_sql} ORDER BY {sort_by} {sort_dir}",
        params
    ).fetchall()
    conn.close()

    import io, csv
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["ID", "Project", "Location", "City", "State", "ZIP", "Status", "Bid Date", "Date Created", "Zone", "Value Range", "Building Use", "Construction Type", "Project Type", "Negotiated", "GC Selected", "Contact Titles", "Contact Count"])
    for r in rows:
        row_data = list(r)
        # Parse contacts JSON for readable output
        contacts_raw = row_data[-1] or "[]"
        try:
            contacts = json.loads(contacts_raw)
            titles = "; ".join(c.get("title", "") for c in contacts if c.get("title"))
            count = len(contacts)
        except:
            titles = ""
            count = 0
        row_data[-1] = titles  # Replace raw JSON with readable titles
        row_data.append(count)
        writer.writerow(row_data)

    return Response(
        output.getvalue(),
        mimetype="text/csv",
        headers={"Content-Disposition": "attachment;filename=planhub_projects.csv"}
    )


# ── API: Scrape runs history ───────────────────────────────────────────
@app.route("/api/runs")
def scrape_runs():
    conn = get_db()
    rows = conn.execute("SELECT * FROM scrape_runs ORDER BY id DESC LIMIT 20").fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])


# ── API: Accounts List ─────────────────────────────────────────────────
@app.route("/api/accounts")
def list_accounts():
    accounts_data = []
    
    # Standard Accounts
    acct_path = os.path.join(os.path.dirname(__file__), "accounts.json")
    if os.path.exists(acct_path):
        try:
            with open(acct_path) as f:
                accts = json.load(f)
                for a in accts:
                    a["file"] = "accounts.json"
                    accounts_data.append(a)
        except: pass

    # Supplier Accounts
    sup_path = os.path.join(os.path.dirname(__file__), "supplier_accounts.json")
    if os.path.exists(sup_path):
        try:
            with open(sup_path) as f:
                sups = json.load(f)
                for a in sups:
                    a["file"] = "supplier_accounts.json"
                    accounts_data.append(a)
        except: pass

    return jsonify({"accounts": accounts_data})


# ── API: States summary (for map) ──────────────────────────────────────
@app.route("/api/states")
def states_summary():
    conn = get_db()
    rows = conn.execute("""
        SELECT state_id, COUNT(*) as count,
            MIN(date_created) as oldest,
            MAX(date_created) as newest
        FROM projects
        GROUP BY state_id
        ORDER BY count DESC
    """).fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])


# ── API: Value Ranges summary (for filters) ────────────────────────────
@app.route("/api/values")
def value_ranges():
    conn = get_db()
    rows = conn.execute("SELECT value_range, COUNT(*) as count FROM projects WHERE value_range IS NOT NULL AND value_range != '' GROUP BY value_range ORDER BY count DESC").fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])


# ── API: Building Use summary (for filters) ────────────────────────────
@app.route("/api/building-uses")
def building_uses():
    conn = get_db()
    rows = conn.execute("SELECT building_use, COUNT(*) as count FROM projects WHERE building_use IS NOT NULL AND building_use != '' GROUP BY building_use ORDER BY count DESC").fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])



# ── API: Remote enrichment push ─────────────────────────────────────────
@app.route("/api/enrich/push", methods=["POST"])
def enrich_push():
    """Accept pre-enriched project data from external clients (e.g., local machine)."""
    body = request.json
    if not body:
        return jsonify({"error": "No data"}), 400
    
    planhub_id = body.get("planhub_id")
    contacts_data = body.get("contacts")  # JSON string or list
    project_name = body.get("name", "Unknown")
    
    if not planhub_id or contacts_data is None:
        return jsonify({"error": "planhub_id and contacts required"}), 400
    
    # Normalize contacts to JSON string
    if isinstance(contacts_data, list):
        contacts_json = json.dumps(contacts_data)
    else:
        contacts_json = contacts_data
    
    conn = get_db()
    try:
        # Build dynamic UPDATE with contacts + optional metadata fields
        update_parts = ["contacts = ?"]
        update_params = [contacts_json]
        
        # Apply metadata backfill if provided
        metadata = body.get("metadata", {})
        allowed_meta_fields = {
            "building_use", "construction_type", "project_type", "value_range",
            "zone_name", "state_id", "negotiated_work", "gc_selected", "status",
            "state", "zip"
        }
        meta_applied = []
        for field, val in metadata.items():
            if field in allowed_meta_fields and val:
                update_parts.append(f"{field} = ?")
                update_params.append(str(val) if not isinstance(val, str) else val)
                meta_applied.append(field)
        
        # Try with enriched_at, fall back to without
        try:
            update_parts.append("enriched_at = datetime('now')")
            update_sql = f"UPDATE projects SET {', '.join(update_parts)} WHERE planhub_id = ?"
            update_params.append(planhub_id)
            cursor = conn.execute(update_sql, update_params)
            
            # If the update affected 0 rows, the project doesn't exist in the DB! We must INSERT it.
            if cursor.rowcount == 0:
                conn.execute('''
                    INSERT INTO projects (planhub_id, project, contacts, state, zip, enriched_at)
                    VALUES (?, ?, ?, ?, ?, datetime('now'))
                ''', (planhub_id, project_name, contacts_json, body.get("metadata", {}).get("state", ""), body.get("metadata", {}).get("zip", "")))
        except Exception as e:
            # enriched_at column may not exist — rebuild without it
            update_parts_no_ts = [p for p in update_parts if "enriched_at" not in p]
            update_params_no_ts = update_params[:-1]  # Remove the planhub_id we appended
            update_sql = f"UPDATE projects SET {', '.join(update_parts_no_ts)} WHERE planhub_id = ?"
            update_params_no_ts.append(planhub_id)
            cursor = conn.execute(update_sql, update_params_no_ts)
            
            if cursor.rowcount == 0:
                conn.execute('''
                    INSERT INTO projects (planhub_id, project, contacts, state, zip)
                    VALUES (?, ?, ?, ?, ?)
                ''', (planhub_id, project_name, contacts_json, body.get("metadata", {}).get("state", ""), body.get("metadata", {}).get("zip", "")))
        
        # Also store companies if provided
        companies = body.get("companies", [])
        for c in companies:
            if not isinstance(c, dict):
                continue
            conn.execute('''
                INSERT OR REPLACE INTO companies 
                (id, name, type, phone, email, address, city, state, zipcode,
                 website, fax, trades, source, company_size, logo, latitude, longitude, scraped_at) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
            ''', (
                c.get("id", ""), c.get("name", ""), c.get("type", ""),
                c.get("phone", ""), c.get("email", ""),
                c.get("address", ""), c.get("city", ""), c.get("state", ""),
                c.get("zipcode", ""), c.get("website", ""), c.get("fax", ""),
                c.get("trades", ""), "remote_enrichment",
                c.get("company_size", ""), c.get("logo", ""),
                c.get("latitude", ""), c.get("longitude", ""),
            ))
        
        conn.commit()
        
        # Check how many contacts were stored
        count = len(json.loads(contacts_json)) if contacts_json != "[]" else 0
        return jsonify({
            "status": "ok",
            "planhub_id": planhub_id,
            "name": project_name,
            "contacts_count": count,
            "companies_stored": len(companies),
            "metadata_applied": meta_applied
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()


# ── API: Form-based receive (for iPhone bookmarklet CSP bypass) ─────────
@app.route("/api/receive", methods=["POST", "GET"])
def receive_form():
    """Accept project data via form POST (bypasses browser CSP restrictions).
    Data comes as a 'd' form field containing JSON array of projects."""
    try:
        raw = request.form.get("d") or request.args.get("d") or ""
        if not raw:
            return "<html><body><script>parent.postMessage('no-data','*')</script></body></html>"
        
        projects = json.loads(raw)
        if not isinstance(projects, list):
            projects = [projects]
        
        conn = get_db()
        stored = 0
        for p in projects:
            pid = p.get("id") or p.get("planhub_id") or ""
            name = p.get("n") or p.get("name") or "Unknown"
            contacts = p.get("contacts", [])
            contacts_json = json.dumps(contacts) if isinstance(contacts, list) else "[]"
            
            try:
                cursor = conn.execute(
                    "UPDATE projects SET project = ?, contacts = ?, enriched_at = datetime('now') WHERE planhub_id = ?",
                    (name, contacts_json, str(pid))
                )
                if cursor.rowcount == 0:
                    conn.execute(
                        "INSERT INTO projects (planhub_id, project, contacts, state, zip, enriched_at) VALUES (?, ?, ?, ?, ?, datetime('now'))",
                        (str(pid), name, contacts_json, p.get("loc", ""), p.get("zip", ""))
                    )
                stored += 1
            except Exception:
                pass
        
        conn.commit()
        conn.close()
        
        return "<html><body>OK:" + str(stored) + "<script>parent.postMessage('stored:" + str(stored) + "','*')</script></body></html>"
    except Exception as e:
        return "<html><body>ERR:" + str(e) + "</body></html>"

# ── API: Pixel tracking (image-based CSP bypass) ───────────────────────
@app.route("/api/px")
def pixel_track():
    """Accept project data via GET (image pixel tracking, bypasses CSP)."""
    import re
    pid = request.args.get("id", "")
    raw = request.args.get("t", "")
    gc_data = request.args.get("g", "")
    if not pid:
        return "", 204
    
    print(f"[PX] id={pid} gc={gc_data} raw_len={len(raw)} raw_preview={raw[:200]}", flush=True)
    
    # Build contacts from GC data and raw text
    contacts = []
    
    # Parse GC data: "CompanyName|UserName|CompanyId"
    gc_company = ""
    gc_contact = ""
    gc_company_id = ""
    if gc_data:
        parts = gc_data.split("|")
        gc_company = parts[0] if len(parts) > 0 else ""
        gc_contact = parts[1] if len(parts) > 1 else ""
        gc_company_id = parts[2] if len(parts) > 2 else ""
        if gc_company:
            contacts.append({"gc_company": gc_company, "gc_contact": gc_contact, "gc_company_id": gc_company_id})
    
    # Parse emails and phones from raw text
    if raw:
        emails = list(set(re.findall(r'[\w.+-]+@[\w.-]+\.[a-zA-Z]{2,}', raw)))
        phones = list(set(re.findall(r'\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}', raw)))
        for e in emails:
            if not e.endswith('.png') and not e.endswith('.jpg'):
                contacts.append({"email": e})
        for p in phones:
            contacts.append({"phone": p})
    
    contacts_json = json.dumps(contacts)
    project_name = request.args.get("n", "Project " + str(pid))
    
    conn = get_db()
    try:
        cursor = conn.execute(
            "UPDATE projects SET contacts = ?, project = CASE WHEN project LIKE 'Project %' THEN ? ELSE project END, enriched_at = datetime('now') WHERE planhub_id = ?",
            (contacts_json, project_name, str(pid))
        )
        if cursor.rowcount == 0:
            conn.execute(
                "INSERT INTO projects (planhub_id, project, contacts, enriched_at) VALUES (?, ?, ?, datetime('now'))",
                (str(pid), project_name, contacts_json)
            )
        conn.commit()
    except Exception as e:
        print(f"[PX] DB error: {e}", flush=True)
    finally:
        conn.close()
    
    # Return 1x1 transparent GIF
    return Response(
        b'GIF89a\x01\x00\x01\x00\x80\x00\x00\xff\xff\xff\x00\x00\x00!\xf9\x04\x00\x00\x00\x00\x00,\x00\x00\x00\x00\x01\x00\x01\x00\x00\x02\x02D\x01\x00;',
        mimetype='image/gif'
    )


# -- API: Scout Inbox (generic bookmarklet data receiver) ----------------
@app.route('/api/scout/inbox', methods=['POST', 'OPTIONS'])
def scout_inbox():
    """Accept any JSON payload from iPhone bookmarklets (sendBeacon, fetch, etc).
    Stores raw payloads in scout_inbox table for later processing."""
    if request.method == 'OPTIONS':
        return '', 204
    try:
        raw = request.get_data(as_text=True)
        if not raw or raw.strip() == '':
            return jsonify({'error': 'empty payload'}), 400
        try:
            payload = json.loads(raw)
        except json.JSONDecodeError:
            payload = {'raw': raw}
        source = 'unknown'
        if isinstance(payload, dict):
            source = payload.get('source', 'bookmarklet')
        conn = get_db()
        conn.execute("""CREATE TABLE IF NOT EXISTS scout_inbox (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            payload TEXT, source TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)""")
        conn.execute('INSERT INTO scout_inbox (payload, source) VALUES (?, ?)', (raw, source))
        conn.commit()
        count = conn.execute('SELECT COUNT(*) FROM scout_inbox').fetchone()[0]
        conn.close()
        print(f'[SCOUT_INBOX] +1 from {source} | total={count} | size={len(raw)}b', flush=True)
        return jsonify({'status': 'ok', 'total': count, 'size': len(raw)}), 201
    except Exception as e:
        print(f'[SCOUT_INBOX] Error: {e}', flush=True)
        return jsonify({'error': str(e)}), 500


@app.route('/api/scout/inbox', methods=['GET'])
def scout_inbox_list():
    """List scout inbox items."""
    limit = request.args.get('limit', 50, type=int)
    offset = request.args.get('offset', 0, type=int)
    conn = get_db()
    try:
        conn.execute("""CREATE TABLE IF NOT EXISTS scout_inbox (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            payload TEXT, source TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)""")
        rows = conn.execute(
            'SELECT id, source, length(payload) as size, created_at FROM scout_inbox ORDER BY id DESC LIMIT ? OFFSET ?',
            (limit, offset)
        ).fetchall()
        total = conn.execute('SELECT COUNT(*) FROM scout_inbox').fetchone()[0]
        return jsonify({'items': [dict(r) for r in rows], 'total': total})
    finally:
        conn.close()


# ── API: Enrichment status ──────────────────────────────────────────────
@app.route("/api/enrich/test-proxy")
def test_proxy():
    """Diagnostic: test ScrapeOps from Railway container. Use ?test=1|2|3|4"""
    import time as _time
    
    test_num = request.args.get('test', '4')
    
    conn = get_db()
    row = conn.execute("SELECT key_value FROM api_keys WHERE status='active' LIMIT 1").fetchone()
    conn.close()
    
    api_key = row[0] if row else None
    auth_token = os.environ.get("PLANHUB_AUTH_TOKEN", "")
    
    headers = {
        'authorization': f'auth_token {auth_token}',
        'content-type': 'application/json',
        'accept': 'application/json',
        'origin': 'https://generalcontractor.planhub.com',
        'referer': 'https://generalcontractor.planhub.com/',
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
    
    start = _time.time()
    try:
        if test_num == '1' and api_key:
            # ScrapeOps GET
            r = http_requests.get('https://proxy.scrapeops.io/v1/', params={
                'api_key': api_key, 'url': 'https://api.planhub.com/api/v1/company/100/profile', 'keep_headers': 'true'
            }, headers=headers, timeout=60)
            test_name = "ScrapeOps GET"
        elif test_num == '2' and api_key:
            # ScrapeOps POST
            r = http_requests.post('https://proxy.scrapeops.io/v1/', params={
                'api_key': api_key, 'url': 'https://api.planhub.com/api/v1/project-leads/get-details', 'keep_headers': 'true'
            }, headers=headers, json={'project_id': 6603622, 'track_project_view': False}, timeout=60)
            test_name = "ScrapeOps POST"
        elif test_num == '3':
            # Direct GET
            r = http_requests.get('https://api.planhub.com/api/v1/company/100/profile', headers=headers, timeout=30)
            test_name = "Direct GET"
        else:
            # Direct POST
            r = http_requests.post('https://api.planhub.com/api/v1/project-leads/get-details', headers=headers, json={'project_id': 6603622, 'track_project_view': False}, timeout=30)
            test_name = "Direct POST"
        
        return jsonify({
            "test": test_name,
            "status": r.status_code,
            "time": round(_time.time() - start, 1),
            "response": r.text[:500],
            "has_data": "result" in r.text and ("name" in r.text or "profile" in r.text),
            "token_last8": auth_token[-8:]
        })
    except Exception as e:
        return jsonify({
            "test": test_num,
            "error": str(e),
            "time": round(_time.time() - start, 1),
            "token_last8": auth_token[-8:]
        })

@app.route("/api/enrich/status")
def enrich_status():
    conn = get_db()
    total = conn.execute("SELECT COUNT(*) FROM projects WHERE planhub_id IS NOT NULL AND bid_date >= DATE('now')").fetchone()[0]
    enriched = conn.execute(
        "SELECT COUNT(*) FROM projects WHERE planhub_id IS NOT NULL AND bid_date >= DATE('now') AND contacts IS NOT NULL AND contacts != '' AND contacts != '[]'"
    ).fetchone()[0]
    # Recent enrichment activity (last 10 enriched)
    recent = conn.execute(
        "SELECT id, project, state, contacts FROM projects WHERE contacts IS NOT NULL AND contacts != '' AND contacts != '[]' ORDER BY enriched_at DESC, rowid DESC LIMIT 5"
    ).fetchall()
    conn.close()
    recent_list = []
    for r in recent:
        try:
            c = json.loads(r[3]) if r[3] else []
            recent_list.append({"id": r[0], "project": r[1], "state": r[2], "contacts": len(c)})
        except: pass
    # Get persistent status from DB
    db_status = {}
    try:
        s_conn = get_db()
        rows = s_conn.execute("SELECT key, value FROM scraper_status").fetchall()
        s_conn.close()
        for r in rows:
            val = r["value"]
            # Try to cast numeric values
            if r["key"] in ["enrich_running", "enrich_progress", "enrich_total", "enrich_errors"]:
                try: val = int(val)
                except: val = 0
            elif r["key"] == "enrich_speed":
                try: val = float(val)
                except: val = 0.0
            
            # Map back to legacy field names for UI compatibility
            clean_key = r["key"].replace("enrich_", "")
            if clean_key == "running": val = bool(val)
            db_status[clean_key] = val
    except: pass

    return jsonify({
        "total": total,
        "enriched": enriched,
        "remaining": total - enriched,
        "percent": round(enriched / total * 100, 1) if total else 0,
        "recent": recent_list,
        **db_status
    })



# ── API: Enrichment live logs ───────────────────────────────────────────
@app.route("/api/enrich/logs")
def enrich_logs():
    since = int(request.args.get("since", 0))
    # Query logs from DB to ensure cross-worker synchronization
    conn = get_db()
    rows = conn.execute("SELECT id, timestamp, line FROM scraper_logs WHERE id > ? ORDER BY id ASC LIMIT 100", (since,)).fetchall()
    conn.close()
    
    lines = [f"[{r['timestamp']}] {r['line']}" for r in rows]
    new_cursor = rows[-1]["id"] if rows else since
    
    return jsonify({"lines": lines, "cursor": new_cursor})

#  API: Trigger enrichment  (with live log streaming)
@app.route("/api/enrich/start", methods=["POST"])
def enrich_start():
    global enrichment_process
    if get_scraper_status("running") == "1":
        return jsonify({"error": "Enrichment already running"}), 409

    
    body = request.json or {}
    batch = body.get("batch")
    target_state = body.get("state")
    
    def run_enrich():
        global enrichment_process
        import subprocess, shutil, time as _time
        try:
            python_cmd = shutil.which("node") or "node"
            cmd = [python_cmd, "browser_enrich.mjs"] 
            if batch:
                cmd += ["--batch", str(batch)]
            if target_state:
                cmd += ["--states", str(target_state)]
            
            # Clear previous logs at start of new run
            conn = get_db()
            conn.execute("DELETE FROM scraper_logs WHERE type='enrichment'")
            conn.commit()
            conn.close()
            
            set_scraper_status("running", "1")
            set_scraper_status("progress", "0")
            set_scraper_status("total", "0")
            set_scraper_status("errors", "0")
            set_scraper_status("current_project", "")
            set_scraper_status("current_index", "0")
            set_scraper_status("speed", "0")
            set_scraper_status("started_at", str(_time.time()))
            
            initial_msg = f"🚀 Starting enrichment (batch={batch}, state={target_state or 'all'})"
            _t = _time.strftime('%H:%M:%S')
            conn = get_db()
            conn.execute("INSERT INTO scraper_logs (timestamp, line, type) VALUES (?, ?, ?)", (_t, initial_msg, "enrichment"))
            conn.commit()
            conn.close()

            enrichment_process = subprocess.Popen(
                cmd, cwd=os.path.dirname(os.path.abspath(__file__)),
                stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
                env={**os.environ, "PYTHONIOENCODING": "utf-8", "PYTHONUNBUFFERED": "1"},
                text=True, bufsize=1, encoding='utf-8', errors='replace'
            )
            # Store PID in DB so any Gunicorn worker can kill it on stop
            set_scraper_status("pid", str(enrichment_process.pid))
            
            # Stream output into log table and parse progress
            log_batch = []
            last_flush = _time.time()
            
            def flush_logs(batch):
                if not batch: return
                try:
                    conn = get_db()
                    for i in range(5):
                        try:
                            # Batch insert logs
                            conn.executemany("INSERT INTO scraper_logs (timestamp, line, type) VALUES (?, ?, ?)", batch)
                            conn.commit()
                            break
                        except sqlite3.OperationalError as e:
                            if "locked" in str(e).lower():
                                _time.sleep(0.1 * (i + 1))
                                continue
                            raise
                    conn.close()
                except Exception as e:
                    print(f"Error flushing logs to DB: {e}")

            for line in enrichment_process.stdout:
                try:
                    line = line.rstrip()
                    if not line:
                        continue
                    
                    # Accumulate for batch DB write
                    _t = _time.strftime('%H:%M:%S')
                    log_batch.append((_t, line, "enrichment"))
                    
                    if len(log_batch) >= 10 or (_time.time() - last_flush > 5):
                        flush_logs(log_batch)
                        log_batch = []
                        last_flush = _time.time()
                    
                    if 'projects to enrich' in line:
                        try:
                            total_found = int(line.strip().split()[0])
                            set_scraper_status("total", total_found)
                        except: pass
                    elif 'Progress:' in line:
                        try:
                            parts = line.split('Progress:')[1].strip()
                            idx_total = parts.split('(')[0].strip()
                            idx = int(idx_total.split('/')[0])
                            set_scraper_status("current_index", idx)
                            set_scraper_status("progress", idx)
                            
                            started_at_str = get_scraper_status("started_at", "0")
                            started_at = float(started_at_str) if started_at_str else 0
                            elapsed = _time.time() - started_at
                            if elapsed > 0:
                                speed = round(idx / (elapsed / 60), 1)
                                set_scraper_status("speed", speed)
                        except: pass
                    elif 'ERR' in line:
                        try:
                            cur_errs = int(get_scraper_status("errors", "0"))
                            set_scraper_status("errors", cur_errs + 1)
                        except: pass
                    elif line.startswith('  ['):
                        try:
                            proj_part = line.split(']')[1].strip()
                            set_scraper_status("current_project", proj_part[:60])
                            if '[' in line and ']' in line:
                                idx_part = line.split('[')[1].split(']')[0]
                                if '/' in idx_part:
                                    set_scraper_status("current_index", int(idx_part.split('/')[0]))
                        except: pass
                except Exception as line_err:
                    print(f"Log reader line error: {line_err}")
                    continue
            
            # Final flush
            flush_logs(log_batch)
            log_batch = []

            enrichment_process.wait()
            _t = _time.strftime('%H:%M:%S')
            exit_msg = f"✅ Enrichment process exited (code={enrichment_process.returncode})"
            conn = get_db()
            conn.execute("INSERT INTO scraper_logs (timestamp, line, type) VALUES (?, ?, ?)", (_t, exit_msg, "enrichment"))
            conn.commit()
            conn.close()
        except Exception as e:
            _t = _time.strftime('%H:%M:%S')
            err_msg = f"❌ Error: {str(e)}"
            conn = get_db()
            conn.execute("INSERT INTO scraper_logs (timestamp, line, type) VALUES (?, ?, ?)", (_t, err_msg, "enrichment"))
            conn.commit()
            conn.close()
        finally:
            set_scraper_status("running", "0")
            set_scraper_status("current_project", "")
            enrichment_process = None

    
    threading.Thread(target=run_enrich, daemon=True).start()
    return jsonify({"status": "started", "batch": batch, "state": target_state})


@app.route("/api/enrich/stop", methods=["POST"])
def enrich_stop():
    global enrichment_process
    if get_scraper_status("running") != "1":
        return jsonify({"error": "Enrichment is not running"}), 400

    # Try in-memory handle first (same worker), then fall back to DB PID (cross-worker)
    killed = False
    if enrichment_process:
        try:
            enrichment_process.terminate()
            killed = True
        except Exception:
            pass
        enrichment_process = None

    if not killed:
        stored_pid = get_scraper_status("pid")
        if stored_pid:
            try:
                os.kill(int(stored_pid), signal.SIGTERM)
                killed = True
            except (OSError, ValueError):
                pass

    set_scraper_status("running", "0")
    set_scraper_status("pid", "")
    _t = _time.strftime('%H:%M:%S')
    stop_msg = f"⏹ Enrichment stopped by user (killed={killed})"
    conn = get_db()
    conn.execute("INSERT INTO scraper_logs (timestamp, line, type) VALUES (?, ?, ?)", (_t, stop_msg, "enrichment"))
    conn.commit()
    conn.close()
    return jsonify({"status": "stopped", "killed": killed})



# ── API: ScrapeOps API Key management ──────────────────────────────────
@app.route("/api/config/scrapeops", methods=["GET"])
def get_scrapeops_keys():
    conn = get_db()
    
    # Auto-migrate legacy key from config.json into DB if DB is empty
    count = conn.execute("SELECT COUNT(*) FROM api_keys WHERE provider='scrapeops'").fetchone()[0]
    legacy_key = _config.get("scrapeops_api_key", SCRAPEOPS_API_KEY)
    if count == 0 and legacy_key:
        from datetime import datetime as dt, timezone as tz
        now_iso = dt.now(tz.utc).isoformat()
        try:
            conn.execute("INSERT INTO api_keys (provider, key_value, status, added_at) VALUES (?, ?, ?, ?)", 
                         ("scrapeops", legacy_key, "active", now_iso))
            conn.commit()
        except: pass
        
    rows = conn.execute("SELECT id, key_value, status, added_at, COALESCE(credits_used, 0) as credits_used FROM api_keys WHERE provider='scrapeops' ORDER BY added_at DESC").fetchall()
    conn.close()
    
    keys_data = []
    for r in rows:
        key_val = r["key_value"]
        masked = key_val[:4] + "****" + key_val[-4:] if len(key_val) > 8 else "(invalid)"
        keys_data.append({
            "id": r["id"],
            "masked_key": masked,
            "status": r["status"],
            "credits_used": r["credits_used"],
            "added_at": r["added_at"]
        })
    
    return jsonify({"keys": keys_data})

@app.route("/api/config/scrapeops", methods=["POST"])
def add_scrapeops_key_via_config():
    body = request.json or {}
    new_key = body.get("api_key", "").strip()
    if not new_key:
        return jsonify({"error": "API key is required"}), 400
    
    from datetime import datetime as dt, timezone as tz
    now_iso = dt.now(tz.utc).isoformat()

    conn = get_db()
    try:
        conn.execute("INSERT INTO api_keys (provider, key_value, status, added_at, credits_used) VALUES (?, ?, ?, ?, 0)", 
                     ("scrapeops", new_key, "active", now_iso))
        conn.commit()
    except sqlite3.IntegrityError:
        conn.close()
        return jsonify({"error": "This key is already added"}), 409
    except Exception as e:
        conn.close()
        return jsonify({"error": f"Database error: {str(e)}"}), 500
    
    conn.close()
    return jsonify({"status": "added"})

@app.route("/api/config", methods=["GET"])
def get_config():
    # Strip sensitive fields before returning config
    safe_config = {k: v for k, v in _config.items() if k not in ('auth_token', 'password', 'scrapeops_api_key')}
    return jsonify(safe_config)


import subprocess
import os
import signal
import sys

@app.route("/api/scraper/start", methods=["POST"])
def start_scraper():
    conn = get_db()
    try:
        # Check if already running
        running = conn.execute("SELECT id, pid FROM scrape_runs WHERE status='running'").fetchone()
        if running and running["pid"]:
            # Verify if process is genuinely alive
            try:
                os.kill(running["pid"], 0)
                return jsonify({"status": "error", "message": f"Scraper currently running at PID {running['pid']}."}), 400
            except OSError:
                # Process not running, mark as dead
                conn.execute("UPDATE scrape_runs SET status='dead' WHERE id=?", (running["id"],))
                conn.commit()
                
        # Get requested script (scraper = Discovery, enrichment = Enrichment)
        req = request.get_json() or {}
        script_type = req.get("type", "scraper")
        script_file = "scraper.py" if script_type == "discovery" else "local_enrich.py"
        
        # Launch background process with full environment inheritance
        process = subprocess.Popen([sys.executable, script_file], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, env=os.environ)
        
        return jsonify({"status": "success", "message": f"Launched {script_file}", "pid": process.pid})
    finally:
        conn.close()

@app.route("/api/scraper/stop", methods=["POST"])
def stop_scraper():
    conn = get_db()
    try:
        running = conn.execute("SELECT id, pid FROM scrape_runs WHERE status='running'").fetchall()
        killed = 0
        for run in running:
            if run["pid"]:
                try:
                    os.kill(run["pid"], signal.SIGTERM)
                    killed += 1
                except OSError:
                    pass
            from datetime import datetime, timezone
            conn.execute("UPDATE scrape_runs SET status='aborted', finished_at=? WHERE id=?", 
                         (datetime.now(timezone.utc).isoformat(), run["id"]))
        conn.commit()
        return jsonify({"status": "success", "message": f"Killed {killed} processes."})
    finally:
        conn.close()

@app.route("/api/scraper/status", methods=["GET"])
def scraper_status():
    conn = get_db()
    try:
        running = conn.execute("SELECT id, pid, started_at FROM scrape_runs WHERE status='running' ORDER BY id DESC LIMIT 1").fetchone()
        
        is_alive = False
        pid = None
        if running and running["pid"]:
            try:
                os.kill(running["pid"], 0)
                is_alive = True
                pid = running["pid"]
            except OSError:
                # Mark as dead
                conn.execute("UPDATE scrape_runs SET status='dead' WHERE id=?", (running["id"],))
                conn.commit()
                
        # Also get latest heartbeat from scraper_health
        health = conn.execute("SELECT name, status, last_heartbeat, details FROM scraper_health WHERE id='planhub_gc_scraper'").fetchone()
        
        return jsonify({
            "is_running": is_alive,
            "pid": pid,
            "health": dict(health) if health else None
        })
    finally:
        conn.close()

@app.route("/api/trigger-scrape", methods=["POST"])
def add_scrapeops_key():
    body = request.json or {}
    new_key = body.get("api_key", "").strip()
    if not new_key:
        return jsonify({"error": "API key is required"}), 400
        
    from datetime import datetime as dt, timezone as tz
    now_iso = dt.now(tz.utc).isoformat()

    conn = get_db()
    try:
        conn.execute("INSERT INTO api_keys (provider, key_value, status, added_at) VALUES (?, ?, ?, ?)", 
                     ("scrapeops", new_key, "active", now_iso))
        conn.commit()
    except sqlite3.IntegrityError:
        conn.close()
        return jsonify({"error": "This key is already added"}), 409
    except Exception as e:
        conn.close()
        return jsonify({"error": f"Database error: {str(e)}"}), 500
        
    conn.close()
    return jsonify({"status": "added"})

@app.route("/api/config/scrapeops/<int:key_id>", methods=["DELETE"])
def delete_scrapeops_key(key_id):
    conn = get_db()
    conn.execute("DELETE FROM api_keys WHERE id=? AND provider='scrapeops'", (key_id,))
    conn.commit()
    conn.close()
    return jsonify({"status": "deleted"})


# NOTE: Duplicate /api/companies route removed — the primary one is at companies_dir() above (line ~516)
# with full filtering, deduplication, and source support.


# ── API: Top Contractors (aggregated from contacts) ────────────────────
@app.route("/api/top-contractors")
def top_contractors():
    conn = get_db()
    rows = conn.execute(
        "SELECT contacts FROM projects WHERE contacts IS NOT NULL AND contacts != '' AND contacts != '[]' LIMIT 5000"
    ).fetchall()
    conn.close()

    company_counts = {}
    for row in rows:
        try:
            contacts = json.loads(row[0])
            for c in contacts:
                name = c.get("title") or c.get("name") or ""
                ctype = c.get("company_type", "")
                if name and len(name) > 2:
                    key = name.strip()
                    if key not in company_counts:
                        company_counts[key] = {"name": key, "type": ctype, "count": 0, "has_phone": 0, "has_email": 0}
                    company_counts[key]["count"] += 1
                    if c.get("phone"):
                        company_counts[key]["has_phone"] += 1
                    if c.get("email"):
                        company_counts[key]["has_email"] += 1
        except:
            pass

    sorted_companies = sorted(company_counts.values(), key=lambda x: x["count"], reverse=True)
    return jsonify(sorted_companies[:25])


# ── API: Recent projects (for ticker) ──────────────────────────────────
@app.route("/api/recent")
def recent_projects():
    conn = get_db()
    rows = conn.execute(
        "SELECT id, project, location, status, date_created FROM projects ORDER BY date_created DESC LIMIT 10"
    ).fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])


# ── API: State counts (for heatmap) ───────────────────────────────────
@app.route("/api/state-counts")
def state_counts():
    conn = get_db()
    rows = conn.execute("""
        SELECT state, COUNT(*) as count
        FROM projects
        WHERE state IS NOT NULL AND state != ''
        GROUP BY state
        ORDER BY count DESC
    """).fetchall()
    conn.close()
    return jsonify([{"state": r[0], "count": r[1]} for r in rows])


# ── API: Health check ──────────────────────────────────────────────────
@app.route("/api/health")
def health():
    try:
        conn = get_db()
        count = conn.execute("SELECT COUNT(*) FROM projects").fetchone()[0]
        # Check active status from DB
        enrich_running = get_scraper_status("running", "0") == "1"
        conn.close()
        return jsonify({
            "status": "healthy",
            "db_connected": True,
            "project_count": count,
            "enrich_active": enrich_running,
            "db_path": DB_PATH,
            "timestamp": _time.time()
        })
    except Exception as e:
        return jsonify({
            "status": "unhealthy", 
            "db_connected": False,
            "error": str(e)
        }), 500



# ── API: Scrapers Health ───────────────────────────────────────────────
@app.route("/api/scrapers/health")
def scrapers_health():
    """Returns the status and last heartbeat of all tracked scrapers."""
    conn = get_db()
    rows = conn.execute("SELECT * FROM scraper_health ORDER BY last_heartbeat DESC").fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])


@app.route("/api/scrapers/heartbeat", methods=["POST"])
def scrapers_heartbeat():
    """Receives a heartbeat from a scraper to update its status."""
    data = request.json
    if not data or "id" not in data:
        return jsonify({"error": "Missing scraper 'id'"}), 400
    
    scraper_id = data["id"]
    name = data.get("name", scraper_id)
    status = data.get("status", "running")
    details = data.get("details", "")
    now_iso = datetime.now(timezone.utc).isoformat() if "datetime" in globals() else ""
    
    # We will import datetime locally if not in globals
    if not now_iso:
        from datetime import datetime, timezone
        now_iso = datetime.now(timezone.utc).isoformat()

    conn = get_db()
    conn.execute("""
        INSERT INTO scraper_health (id, name, status, last_heartbeat, details)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET 
            name=excluded.name,
            status=excluded.status,
            last_heartbeat=excluded.last_heartbeat,
            details=excluded.details
    """, (scraper_id, name, status, now_iso, json.dumps(details) if isinstance(details, dict) else details))
    conn.commit()
    conn.close()
    
    return jsonify({"status": "ok", "id": scraper_id})



# ── API: Timeline (monthly project creation trends) ───────────────────
@app.route("/api/timeline")
def timeline():
    conn = get_db()
    rows = conn.execute("""
        SELECT strftime('%Y-%m', date_created) as month, COUNT(*) as count
        FROM projects
        WHERE date_created IS NOT NULL AND date_created != ''
        GROUP BY month
        ORDER BY month DESC
        LIMIT 24
    """).fetchall()
    conn.close()
    result = [{"month": r[0], "count": r[1]} for r in rows]
    result.reverse()
    return jsonify(result)


# ── API: Bid calendar (upcoming bids grouped by week) ─────────────────
@app.route("/api/bid-calendar")
def bid_calendar():
    conn = get_db()
    
    # Inherit advanced global filtering from the core query builder
    args_dict = dict(request.args)
    # Note: base query already enforces bid_date >= date('now'), no need for min_days=0 default
    where_sql, params = build_filter_query(args_dict)
    
    where_extra = ""
    if where_sql:
        where_extra = " AND " + where_sql.replace("WHERE ", "", 1)
    
    limit = int(args_dict.get("limit", 100))
    page = int(args_dict.get("page", 0))
    offset = page * limit
    
    count_query = f"SELECT COUNT(*) FROM projects WHERE bid_date IS NOT NULL AND bid_date != '' AND SUBSTR(REPLACE(bid_date, '/', '-'), 1, 10) >= date('now') {where_extra}"
    total = conn.execute(count_query, params).fetchone()[0]
    
    query = f"""
        SELECT id, project, location, city, state, state_id, zip, bid_date, status, 
               building_use, construction_type, project_type, value_range, source, 
               negotiated_work, gc_selected, zone_name, date_created, contacts
        FROM projects
        WHERE bid_date IS NOT NULL AND bid_date != '' AND SUBSTR(REPLACE(bid_date, '/', '-'), 1, 10) >= date('now')
        {where_extra}
        ORDER BY bid_date ASC
        LIMIT ? OFFSET ?
    """
    params.extend([limit, offset])
    rows = conn.execute(query, params).fetchall()
    conn.close()
    
    import math
    total_pages = math.ceil(total / limit) if limit > 0 else 1
    return jsonify({
        "data": [dict(r) for r in rows],
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": total_pages
    })


# ── API: Value range distribution ─────────────────────────────────────
@app.route("/api/value-distribution")
def value_distribution():
    conn = get_db()
    rows = conn.execute("""
        SELECT value_range, COUNT(*) as count
        FROM projects
        WHERE value_range IS NOT NULL AND value_range != ''
        GROUP BY value_range
        ORDER BY count DESC
    """).fetchall()
    conn.close()
    return jsonify([{"range": r[0], "count": r[1]} for r in rows])


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8080))
    if os.environ.get("DEBUG", "0") == "1":
        app.run(host="0.0.0.0", port=port, debug=True)
    else:
        from waitress import serve
        print(f"[waitress] Serving on http://0.0.0.0:{port}", flush=True)
        serve(app, host="0.0.0.0", port=port, threads=4)

@app.route('/api/snapshot')
def get_snapshot():
    return Response(get_scraper_status('iphone_dom_snapshot', 'NOT FOUND'), mimetype='text/html')

