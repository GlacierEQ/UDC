import asyncio
import os
import getpass
from overleaf_agent import overleaf_agent

async def main():
    print("📄 --- Overleaf Automation CLI ---")
    
    email = os.environ.get("OVERLEAF_EMAIL")
    if not email:
        email = input("Enter Overleaf Email: ")
        
    password = os.environ.get("OVERLEAF_PASSWORD")
    if not password:
        password = getpass.getpass("Enter Overleaf Password: ")
        
    project_name = input("Enter new project name (e.g., 'My Paper'): ")
    
    print("\n🚀 Starting Agent...")
    try:
        await overleaf_agent.browser.start(headless=False) # Run visible so user can see
        await overleaf_agent.login(email, password)
        await overleaf_agent.create_project(project_name)
        
        print("\n✅ Project created! The browser is open.")
        print("You can now use 'overleaf_agent.inject_latex()' to write content.")
        
        # Keep open for a bit or wait for user input to close
        input("\nPress Enter to close the browser...")
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
    finally:
        await overleaf_agent.browser.close()

if __name__ == "__main__":
    asyncio.run(main())
