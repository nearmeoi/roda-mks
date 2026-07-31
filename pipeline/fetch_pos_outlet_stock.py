"""
Bulk snapshot of per-outlet stock for every article, from the internal POS
admin (pos.rodalink.com). This replaces doing a live POS query on every
"Cek Outlet Lain" click in the app -- instead we fetch the whole table once
(paginated, same shape as fetch_pos_prices.py) and the app searches this
local snapshot. Keeps POS traffic to one controlled batch job instead of an
unpredictable number of live requests spread across the day.

Requires a logged-in POS session, passed in via environment variables (never
hardcode these -- they're short-lived credentials, not something to commit):

  POS_COOKIE      the full Cookie header value (XSRF-TOKEN=...; laravel_session=...)
  POS_XSRF_TOKEN  the X-XSRF-TOKEN header value (decoded, not the cookie's raw form)

Grab both from your browser's devtools Network tab on an authenticated
pos.rodalink.com admin page. They expire with your POS session, so re-copy
them if this starts returning 401s.

Run this occasionally (e.g. daily, or whenever you want fresher data) --
not on a tight automated schedule. It's ~14 requests over a few seconds,
the same volume as fetch_pos_prices.py, which has run without issue.
"""

import argparse
import json
import os
import sys
import time

import requests

ENDPOINT = "https://pos.rodalink.com/admin/outlet-stock/all-new"
PAGE_SIZE = 200

# Columns present on every row that aren't a per-outlet stock count.
NON_OUTLET_FIELDS = {
    "id", "description", "material_code", "mswarehouse_id", "msbrand_id",
    "brand", "msmerchandisecategory_id", "merch", "price", "avg_stock",
    "HQ", "BS",
}


def fetch_all(cookie: str, xsrf_token: str, warehouse: str) -> list[dict]:
    headers = {
        "accept": "application/json, text/javascript, */*; q=0.01",
        "content-type": "application/json",
        "referer": "https://pos.rodalink.com/admin/outlet-stock/new",
        "x-requested-with": "XMLHttpRequest",
        "x-xsrf-token": xsrf_token,
        "cookie": cookie,
    }
    params = {
        "sort": "description",
        "order": "asc",
        "limit": PAGE_SIZE,
        "offset": 0,
        "article": "",
        "brand": "",
        "merchandiseCategory": "",
        "outlet[]": "all",
        "warehouse": warehouse,
    }

    rows: list[dict] = []
    total = None
    while total is None or params["offset"] < total:
        for attempt in range(3):
            resp = requests.get(ENDPOINT, headers=headers, params=params, timeout=30)
            if resp.ok:
                break
            wait = 2 ** attempt  # 1s, 2s, 4s
            print(f"[fetch_pos_outlet_stock] offset={params['offset']} got {resp.status_code}, "
                  f"retrying in {wait}s ({attempt + 1}/3)")
            time.sleep(wait)
        resp.raise_for_status()
        data = resp.json()
        if total is None:
            total = data["total"]
            print(f"[fetch_pos_outlet_stock] {total} articles reported by POS")
        rows.extend(data["rows"])
        print(f"[fetch_pos_outlet_stock] fetched {len(rows)}/{total}")
        params["offset"] += PAGE_SIZE
        time.sleep(0.2)
    return rows


def build(output_path: str, warehouse: str) -> None:
    cookie = os.environ.get("POS_COOKIE")
    xsrf_token = os.environ.get("POS_XSRF_TOKEN")
    if not cookie or not xsrf_token:
        print("[fetch_pos_outlet_stock] set POS_COOKIE and POS_XSRF_TOKEN env vars "
              "(copy from an authenticated pos.rodalink.com request)", file=sys.stderr)
        sys.exit(1)

    rows = fetch_all(cookie, xsrf_token, warehouse)

    snapshot: dict[str, dict] = {}
    for row in rows:
        outlets = {
            key: value
            for key, value in row.items()
            if key not in NON_OUTLET_FIELDS and isinstance(value, (int, float)) and value > 0
        }
        if not outlets and not row.get("HQ") and not row.get("BS"):
            continue
        snapshot[str(row["id"])] = {
            "description": row["description"],
            "outlets": outlets,
            "HQ": row.get("HQ") or None,
            "BS": row.get("BS") or None,
        }

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(snapshot, f, ensure_ascii=False, indent=2)
    print(f"[fetch_pos_outlet_stock] wrote {len(snapshot)} articles with stock somewhere to {output_path}")

    # Served as a static asset and fetched lazily on the client, same
    # pattern as all_stock.json -- not statically imported anywhere server-side.
    web_json_path = os.path.join("web", "public", "pos_outlet_stock.json")
    if os.path.exists(os.path.dirname(web_json_path)):
        with open(web_json_path, "w", encoding="utf-8") as f:
            json.dump(snapshot, f, ensure_ascii=False, indent=2)
        print(f"[fetch_pos_outlet_stock] synced {len(snapshot)} articles to {web_json_path}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", default="data/pos_outlet_stock.json")
    parser.add_argument("--warehouse", default="0001")
    args = parser.parse_args()
    build(args.output, args.warehouse)
