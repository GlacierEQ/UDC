import asyncio
import logging
import json
from browser_automator import browser_automator

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("glaciereq-scanner")

async def scan_repos():
    print("🕵️‍♂️ --- Scanning Glaciereq Repositories ---")
    
    try:
        # Launch visible to see what's happening
        await browser_automator.start(headless=False)
        
        # Navigate to repositories tab
        url = "https://github.com/orgs/glaciereq/repositories"
        await browser_automator.navigate(url)
        
        # Wait for list to load
        await browser_automator.page.wait_for_selector('#org-repositories')
        
        # Extract repos using JS
        repos = await browser_automator.page.evaluate("""() => {
            const items = document.querySelectorAll('#org-repositories li');
            return Array.from(items).map(item => {
                const nameEl = item.querySelector('a[itemprop="name codeRepository"]');
                const descEl = item.querySelector('p[itemprop="description"]');
                return {
                    name: nameEl ? nameEl.innerText.trim() : "Unknown",
                    url: nameEl ? nameEl.href : "",
                    description: descEl ? descEl.innerText.trim() : "No description"
                };
            });
        }""")
        
        print(f"\n✅ Found {len(repos)} repositories:")
        for repo in repos:
            print(f"- {repo['name']}: {repo['description']}")
            
        # Save to file for the "bulk edit" script
        with open("glaciereq_manifest.json", "w") as f:
            json.dump(repos, f, indent=2)
            
        print("\n💾 Saved manifest to glaciereq_manifest.json")
        
    except Exception as e:
        print(f"❌ Scan Failed: {e}")
    finally:
        await browser_automator.close()

if __name__ == "__main__":
    asyncio.run(scan_repos())
