"""
Pulls live selling prices straight from the internal POS admin
(pos.rodalink.com) article master, so the All Stock section can show a real
price instead of "Hubungi toko" for anything the POS has priced -- even if
the master stock xlsx export left it blank.

Uses /admin/article/all (the full company-wide article master -- its total
count matches the master stock xlsx exactly), NOT /admin/outlet-stock/all-new
(which only lists articles this specific outlet is allowed to order, a much
narrower set that turned out to have zero overlap with the unpriced items).

Requires a logged-in POS session, passed in via environment variables (never
hardcode these -- they're short-lived credentials, not something to commit):

  POS_COOKIE      the full Cookie header value (XSRF-TOKEN=...; laravel_session=...)
  POS_XSRF_TOKEN  the X-XSRF-TOKEN header value (decoded, not the cookie's raw form)

Grab both from your browser's devtools Network tab on an authenticated
pos.rodalink.com admin page (any XHR request works -- e.g. the outlet-stock
"new" page). They expire with your POS session, so re-copy them if this
starts returning 401s.
"""

import argparse
import json
import os
import sys
import time

import requests

ENDPOINT = "https://pos.rodalink.com/admin/article/all"
PAGE_SIZE = 1000


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
        "search": "",
        "sort": "description",
        "order": "asc",
        "limit": PAGE_SIZE,
        "offset": 0,
        "brand": "",
        "merchandiseCategory": "",
        "warehouse": warehouse,
        "rp_type": "all",
        "type": "",
        "tier": "",
        "stockState": "all",
        "blockStatus": 0,
        "isOnCreateReplenishment": "false",
    }

    rows: list[dict] = []
    total = None
    while total is None or params["offset"] < total:
        resp = requests.get(ENDPOINT, headers=headers, params=params, timeout=30)
        resp.raise_for_status()
        data = resp.json()
        if total is None:
            total = data["total"]
            print(f"[fetch_pos_prices] {total} articles reported by POS")
        rows.extend(data["rows"])
        print(f"[fetch_pos_prices] fetched {len(rows)}/{total}")
        params["offset"] += PAGE_SIZE
        time.sleep(0.2)  # be polite to the admin backend
    return rows


def build(output_path: str, warehouse: str) -> None:
    cookie = os.environ.get("POS_COOKIE")
    xsrf_token = os.environ.get("POS_XSRF_TOKEN")
    if not cookie or not xsrf_token:
        print("[fetch_pos_prices] set POS_COOKIE and POS_XSRF_TOKEN env vars "
              "(copy from an authenticated pos.rodalink.com request)", file=sys.stderr)
        sys.exit(1)

    rows = fetch_all(cookie, xsrf_token, warehouse)

    prices: dict[str, float] = {}
    for row in rows:
        price = row.get("price") or row.get("retail_price")
        if price is None:
            continue
        try:
            value = float(price)
        except (TypeError, ValueError):
            continue
        if value > 0:
            prices[str(row["id"])] = value

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(prices, f, ensure_ascii=False, indent=2)
    print(f"[fetch_pos_prices] wrote {len(prices)} article prices to {output_path}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", default="data/pos_prices.json")
    parser.add_argument("--warehouse", default="0001")
    args = parser.parse_args()
    build(args.output, args.warehouse)
