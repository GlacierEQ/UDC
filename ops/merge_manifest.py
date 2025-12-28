import json
import os

def create_manifest():
    repos = []
    seen_urls = set()

    for filename in ["repos_user.json", "repos_org.json"]:
        if os.path.exists(filename):
            try:
                with open(filename, "r") as f:
                    data = json.load(f)
                    if isinstance(data, list):
                        for r in data:
                            if r["html_url"] not in seen_urls:
                                repos.append({
                                    "name": r["name"],
                                    "url": r["html_url"],
                                    "description": r.get("description", "No description")
                                })
                                seen_urls.add(r["html_url"])
            except Exception as e:
                print(f"Error reading {filename}: {e}")

    print(f"Found {len(repos)} unique repositories.")
    
    with open("glaciereq_manifest.json", "w") as f:
        json.dump(repos, f, indent=2)

if __name__ == "__main__":
    create_manifest()
