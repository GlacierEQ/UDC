import json
import os
import subprocess

def bulk_harvest():
    print("🚜 --- Bulk Harvesting Glaciereq ---")
    
    if not os.path.exists("glaciereq_manifest.json"):
        print("❌ Manifest not found. Run scan_glaciereq.py first.")
        return

    with open("glaciereq_manifest.json", "r") as f:
        repos = json.load(f)
        
    target_dir = os.path.expanduser("~/glaciereq_harvest")
    if not os.path.exists(target_dir):
        os.makedirs(target_dir)
        
    print(f"📂 Target Directory: {target_dir}")
    print(f"📦 Found {len(repos)} repositories to harvest.")
    
    for repo in repos:
        name = repo['name']
        url = repo['url']
        repo_path = os.path.join(target_dir, name)
        
        if os.path.exists(repo_path):
            print(f"⏭️  Skipping {name} (Already exists)")
        else:
            print(f"⬇️  Cloning {name}...")
            try:
                subprocess.run(["git", "clone", url, repo_path], check=True)
                print(f"✅ Cloned {name}")
            except subprocess.CalledProcessError:
                print(f"❌ Failed to clone {name}")
                
    print("\n✨ Harvest Complete!")

if __name__ == "__main__":
    bulk_harvest()
