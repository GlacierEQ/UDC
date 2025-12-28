import asyncio
import logging
from research_agent import research_agent
from overleaf_agent import overleaf_agent

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("master-orchestrator")

async def run_mission(topic: str):
    """
    Executes a full agentic mission:
    1. Research a topic using Comet Browser.
    2. Summarize the findings.
    3. (Optional) Create an Overleaf project with the findings.
    """
    print(f"\n🤖 --- AGENTIC MISSION START: {topic} ---")
    
    try:
        # 1. Initialize Browser (Single instance shared by agents)
        # We use research_agent's browser reference which is the singleton browser_automator
        await research_agent.browser.start(headless=False)
        
        # 2. Research Phase
        print(f"\n🔍 Phase 1: Researching '{topic}'...")
        results = await research_agent.search_google(topic)
        
        if not results:
            print("❌ No results found. Aborting.")
            return

        top_result = results[0]
        print(f"   Found: {top_result['title']}")
        print(f"   URL: {top_result['url']}")
        
        print("\n📖 Phase 2: Analyzing Content...")
        summary = await research_agent.summarize_page(top_result['url'])
        print(f"   Summary: {summary[:200]}...")
        
        # 3. Report Phase (Simulation)
        print("\n📝 Phase 3: Generating Report...")
        report = f"""
        \\documentclass{{article}}
        \\title{{Research Report: {topic}}}
        \\author{{Antigravity AI}}
        \\begin{{document}}
        \\maketitle
        \\section{{Introduction}}
        Automated research findings for {topic}.
        \\section{{Summary}}
        {summary}
        \\end{{document}}
        """
        print("   LaTeX Report Generated.")
        
        # 4. Overleaf Phase (Optional - requires credentials)
        # await overleaf_agent.login("email", "password")
        # await overleaf_agent.create_project(f"Research: {topic}")
        # await overleaf_agent.inject_latex(report)
        
        print("\n✅ MISSION COMPLETE. I am fully connected to Comet.")
        input("\nPress Enter to close the browser and end the session...")
        
    except Exception as e:
        print(f"\n❌ Mission Failed: {e}")
    finally:
        await research_agent.browser.close()

if __name__ == "__main__":
    # Example mission
    asyncio.run(run_mission("Latest breakthroughs in AI agents"))
