import asyncio
import logging
from typing import Optional, Dict, Any, List
from playwright.async_api import async_playwright, Browser, BrowserContext, Page

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("browser-automator")

class BrowserAutomator:
    """
    Controls the Comet Browser (or Chromium) using Playwright.
    Provides high-level automation capabilities for agentic workflows.
    """
    
    def __init__(self, binary_path: str = "/Applications/Comet.app/Contents/MacOS/Comet"):
        self.binary_path = binary_path
        self.playwright = None
        self.browser: Optional[Browser] = None
        self.context: Optional[BrowserContext] = None
        self.page: Optional[Page] = None
        
    async def start(self, headless: bool = False):
        """Launches the browser."""
        logger.info(f"🚀 Launching browser (Headless: {headless})...")
        
        # Verify binary exists
        import os
        if not os.path.exists(self.binary_path):
            logger.error(f"❌ Binary not found at {self.binary_path}")
            raise FileNotFoundError(f"Please set the correct chrome binary path. Could not find: {self.binary_path}")

        self.playwright = await async_playwright().start()
        
        try:
            # Try launching the specific binary (Comet)
            # Add User-Agent to avoid simple bot detection
            user_agent = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            
            # Use standard launch() which is more robust against custom startup pages than persistent_context
            self.browser = await self.playwright.chromium.launch(
                executable_path=self.binary_path,
                headless=headless,
                args=[
                    "--no-sandbox", 
                    "--disable-infobars", 
                    "--disable-blink-features=AutomationControlled",
                    "--ignore-certificate-errors",
                    "--no-first-run",
                    f"--user-agent={user_agent}"
                ]
            )
            
            # Create a context with the user agent
            self.context = await self.browser.new_context(
                user_agent=user_agent,
                viewport={"width": 1280, "height": 720},
                ignore_https_errors=True
            )
            self.page = await self.context.new_page()
            logger.info(f"✅ Launched Comet Browser from {self.binary_path}")
            
        except Exception as e:
            logger.error(f"❌ Failed to launch Comet: {e}")
            raise e

    async def navigate(self, url: str):
        """Navigates to a URL."""
        if not self.page:
            raise RuntimeError("Browser not started. Call start() first.")
        logger.info(f"🌐 Navigating to: {url}")
        await self.page.goto(url)
        await self.page.wait_for_load_state("networkidle")

    async def click(self, selector: str):
        """Clicks an element."""
        if not self.page:
            raise RuntimeError("Browser not started.")
        logger.info(f"🖱️ Clicking: {selector}")
        await self.page.click(selector)

    async def type(self, selector: str, text: str):
        """Types text into an element."""
        if not self.page:
            raise RuntimeError("Browser not started.")
        logger.info(f"⌨️ Typing into {selector}")
        await self.page.fill(selector, text)

    async def extract_text(self, selector: str) -> str:
        """Extracts text from an element."""
        if not self.page:
            raise RuntimeError("Browser not started.")
        return await self.page.inner_text(selector)

    async def get_title(self) -> str:
        """Gets page title."""
        if not self.page:
            raise RuntimeError("Browser not started.")
        return await self.page.title()

    async def screenshot(self, path: str):
        """Takes a screenshot."""
        if not self.page:
            raise RuntimeError("Browser not started.")
        logger.info(f"📸 Saving screenshot to {path}")
        await self.page.screenshot(path=path)

    async def close(self):
        """Closes the browser."""
        if self.context:
            await self.context.close()
        if self.browser:
            await self.browser.close()
        if self.playwright:
            await self.playwright.stop()
        logger.info("🛑 Browser closed.")

# Singleton for easy import
browser_automator = BrowserAutomator()
