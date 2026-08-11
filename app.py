from flask import Flask, render_template, request, jsonify
import os, requests, math, re
from datetime import datetime, timezone

app = Flask(__name__)
AWC_BASE = "https://aviationweather.gov/api/data"

def awc_get(endpoint, params):
    headers = {"User-Agent": "AeroPerformance/1.0 contact=operator"}
    r = requests.get(f"{AWC_BASE}/{endpoint}", params=params, headers=headers, timeout=15)
    r.raise_for_status()
    return r.text, r.headers.get("content-type","")

@app.get("/")
def index():
    return render_template("index.html")

@app.get("/api/weather")
def weather():
    ids = request.args.get("ids","").upper().strip()
    if not ids:
        return jsonify({"error":"ids required"}), 400
    ids = ",".join(re.findall(r"[A-Z0-9]{3,4}", ids))[:120]
    out = {}
    for name, endpoint in [("metar","metar"),("taf","taf")]:
        try:
            txt, ctype = awc_get(endpoint, {"ids": ids, "format": "json"})
            try:
                out[name] = requests.models.complexjson.loads(txt)
            except Exception:
                out[name] = txt
        except Exception as e:
            out[name] = {"error": str(e)}
    out["as_of"] = datetime.now(timezone.utc).isoformat()
    return jsonify(out)

@app.get("/api/notams")
def notams():
    locations = request.args.get("locations","").upper().strip()
    api_url = os.getenv("NOTAM_API_URL","").strip()
    token = os.getenv("NOTAM_API_TOKEN","").strip()
    if not api_url:
        return jsonify({
            "mode":"search-fallback",
            "locations": locations,
            "message":"FAA/NMS API is not configured on this deployment. Use the official FAA NOTAM Search link or configure NOTAM_API_URL / NOTAM_API_TOKEN.",
            "search_url":"https://notams.aim.faa.gov/notamSearch/"
        })
    try:
        headers = {"Accept":"application/json"}
        if token:
            headers["Authorization"] = f"Bearer {token}"
        r = requests.get(api_url, params={"locations": locations}, headers=headers, timeout=20)
        r.raise_for_status()
        ct = r.headers.get("content-type","")
        data = r.json() if "json" in ct else {"raw":r.text}
        return jsonify({"mode":"api","data":data})
    except Exception as e:
        return jsonify({"mode":"api-error","error":str(e)}), 502

@app.get("/health")
def health():
    return jsonify({"ok": True})

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.getenv("PORT","5000")), debug=True)
