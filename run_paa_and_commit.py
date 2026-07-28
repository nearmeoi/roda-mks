import os
import time
import subprocess

pid_to_wait = 2044

def is_running(pid):
    try:
        output = subprocess.check_output(f'tasklist /FI "PID eq {pid}"', shell=True).decode()
        return str(pid) in output
    except Exception:
        return False

def main():
    print(f"Waiting for bike scraping process (PID {pid_to_wait}) to finish...")
    while is_running(pid_to_wait):
        time.sleep(10)

    print("Bike scraping finished! Starting PAA scraping...")
    
    url_file = os.path.join("data", "catalog_product_urls.json")
    if os.path.exists(url_file):
        os.remove(url_file)
        print("Deleted old URLs cache. Will crawl all categories including PAA.")

    print("Running scrape_catalog...")
    subprocess.run(["python", "-u", "-m", "pipeline.scrape_catalog"])

    print("Building final dataset...")
    subprocess.run([
        "python", "-m", "pipeline.build_dataset", 
        "--xlsx", "Outlet I311 Stock 25-Jul-2026 12_55_24.xlsx"
    ])

    print("Committing and pushing to origin main...")
    subprocess.run(["git", "add", "data/products.json", "web/lib/products.json", "data/catalog_partial.json", "data/catalog_scraped.json", "data/catalog_product_urls.json"])
    subprocess.run(["git", "commit", "-m", "chore: automated scraping completion and sync for bikes and PAA"])
    subprocess.run(["git", "push", "origin", "main"])

    print("All tasks completed automatically!")

if __name__ == "__main__":
    main()
