"""
Snapshots the outlet code -> name mapping from the internal POS admin
(pos.rodalink.com), so cross-outlet stock lookups can show a real outlet
name/city instead of a raw code like "I259". This list changes rarely, so
it's fetched occasionally and cached rather than requested on every lookup.

Requires a logged-in POS session, passed in via environment variables (never
hardcode these -- they're short-lived credentials, not something to commit):

  POS_COOKIE      the full Cookie header value (XSRF-TOKEN=...; laravel_session=...)
  POS_XSRF_TOKEN  the X-XSRF-TOKEN header value (decoded, not the cookie's raw form)

Grab both from your browser's devtools Network tab on an authenticated
pos.rodalink.com admin page. They expire with your POS session, so re-copy
them if this starts returning 401s.
"""

import argparse
import json
import os
import sys

import requests

ENDPOINT = "https://pos.rodalink.com/admin/outlet/all"


def fetch_outlets(cookie: str, xsrf_token: str) -> list[dict]:
    headers = {
        "accept": "application/json, text/javascript, */*; q=0.01",
        "referer": "https://pos.rodalink.com/admin/outlet-stock/new",
        "x-requested-with": "XMLHttpRequest",
        "x-xsrf-token": xsrf_token,
        "cookie": cookie,
    }
    resp = requests.get(ENDPOINT, headers=headers, params={"type": "withhq"}, timeout=30)
    resp.raise_for_status()
    return resp.json()["rows"]


def build(output_path: str) -> None:
    cookie = os.environ.get("POS_COOKIE")
    xsrf_token = os.environ.get("POS_XSRF_TOKEN")
    if not cookie or not xsrf_token:
        print("[fetch_pos_outlets] set POS_COOKIE and POS_XSRF_TOKEN env vars "
              "(copy from an authenticated pos.rodalink.com request)", file=sys.stderr)
        sys.exit(1)

    rows = fetch_outlets(cookie, xsrf_token)

    outlets = {
        row["id"]: {
            "name": row["display_name"],
            "city": row.get("city"),
            "active": bool(row.get("active")),
        }
        for row in rows
    }

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(outlets, f, ensure_ascii=False, indent=2)
    print(f"[fetch_pos_outlets] wrote {len(outlets)} outlets to {output_path}")

    # Served as a static asset and fetched lazily on the client, same
    # pattern as all_stock.json -- not statically imported anywhere server-side.
    web_json_path = os.path.join("web", "public", "pos_outlets.json")
    if os.path.exists(os.path.dirname(web_json_path)):
        with open(web_json_path, "w", encoding="utf-8") as f:
            json.dump(outlets, f, ensure_ascii=False, indent=2)
        print(f"[fetch_pos_outlets] synced {len(outlets)} outlets to {web_json_path}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", default="data/pos_outlets.json")
    args = parser.parse_args()
    build(args.output)
