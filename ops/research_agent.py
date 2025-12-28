import asyncio
import logging
import urllib.parse
from typing import List, Dict, Any
from browser_automator import browser_automator

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("research-agent")

class ResearchAgent:
    """
    Agent capable of performing web research using the Comet Browser.
    """
    
    def __init__(self):
        self.browser = browser_automator
        
    async def search_google(self, query: str) -> List[Dict[str, str]]:
        """Performs a Google search and returns top results."""
        encoded_query = urllib.parse.quote(query)
        url = f"https://www.google.com/search?q={encoded_query}"
        
        logger.info(f"🔍 Searching Google for: {query}")
        await self.browser.navigate(url)
        
        # Extract results (titles and links)
        # Selectors might change, but this is a standard structure
        results = []
        
        # Wait for results to load
        try:
            await self.browser.page.wait_for_selector('div.g', timeout=5000)
            
            # Evaluate JS to extract data cleanly
            results = await self.browser.page.evaluate("""() => {
                const items = document.querySelectorAll('div.g');
                return Array.from(items).map(item => {
                    const titleEl = item.querySelector('h3');
                    const linkEl = item.querySelector('a');
                    if (titleEl && linkEl) {
                        return {
                            title: titleEl.innerText,
                            url: linkEl.href
                        };
                    }
                    return null;
                }).filter(item => item !== null);
            }""")
            
            logger.info(f"✅ Found {len(results)} results.")
            return results
            
        except Exception as e:
            logger.warning(f"⚠️ Error extracting results: {e}")
            return []

    async def summarize_page(self, url: str) -> str:
        """Navigates to a page and extracts main text."""
        logger.info(f"📖 Reading page: {url}")
        await self.browser.navigate(url)
        
        # Simple text extraction
        text = await self.browser.extract_text('body')
        # In a real agent, we'd use an LLM to summarize this text
        summary = text[:500] + "..." if len(text) > 500 else text
        return summary

# Singleton
research_agent = ResearchAgent()
