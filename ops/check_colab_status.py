import asyncio
import os
from processing_orchestrator import processing_orchestrator

async def main():
    print("☁️ --- Colab Bridge Status Check ---")
    
    url = os.environ.get("COLAB_BRIDGE_URL")
    if not url:
        print("❌ COLAB_BRIDGE_URL is not set in your environment.")
        print("Please run the 'colab_bridge.py' script in Google Colab and set the URL.")
        return

    print(f"Target URL: {url}")
    print("Pinging...")
    
    try:
        # Simple execution test
        result = await processing_orchestrator.execute_code("print('Hello from Antigravity!')", backend="colab")
        
        if result.get("status") == "success":
            print("\n✅ Connection Successful!")
            print(f"Output from Colab: {result.get('stdout').strip()}")
        else:
            print("\n⚠️ Connection Failed or Error returned.")
            print(f"Result: {result}")
            
    except Exception as e:
        print(f"\n❌ Connection Error: {e}")

if __name__ == "__main__":
    asyncio.run(main())
