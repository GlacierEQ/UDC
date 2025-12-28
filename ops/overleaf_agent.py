import asyncio
import logging
import os
from browser_automator import browser_automator

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("overleaf-agent")

class OverleafAgent:
    """
    Automates Overleaf interactions for fluid document generation.
    """
    
    def __init__(self):
        self.browser = browser_automator
        self.base_url = "https://www.overleaf.com"
        
    async def login(self, email: str, password: str):
        """Logs into Overleaf."""
        logger.info("🔑 Logging into Overleaf...")
        await self.browser.navigate(f"{self.base_url}/login")
        
        # Check if already logged in
        if "login" not in await self.browser.page.url:
            logger.info("✅ Already logged in.")
            return

        await self.browser.type('input[name="email"]', email)
        await self.browser.type('input[name="password"]', password)
        await self.browser.click('button[type="submit"]')
        await self.browser.page.wait_for_url("**/project")
        logger.info("✅ Login successful.")

    async def create_project(self, project_name: str) -> str:
        """Creates a new blank project and returns its URL."""
        logger.info(f"✨ Creating project: {project_name}")
        await self.browser.navigate(f"{self.base_url}/project")
        
        await self.browser.click('button.btn-primary.new-project-button')
        await self.browser.click('a.menu-item-blank-project')
        
        # Wait for modal and type name
        await self.browser.page.wait_for_selector('input[name="projectName"]')
        await self.browser.type('input[name="projectName"]', project_name)
        await self.browser.click('button.btn-primary.modal-create-project-button')
        
        await self.browser.page.wait_for_url("**/project/*")
        project_url = self.browser.page.url
        logger.info(f"✅ Project created: {project_url}")
        return project_url

    async def inject_latex(self, latex_code: str):
        """Injects LaTeX code into the editor."""
        logger.info("📝 Injecting LaTeX code...")
        
        # This is tricky in Overleaf's Ace/CodeMirror editor.
        # We'll try a brute force approach: select all and type.
        # A better way might be to use the clipboard or specific editor APIs if exposed.
        
        # Wait for editor to load
        await self.browser.page.wait_for_selector('.ace_editor')
        
        # Focus editor
        await self.browser.click('.ace_editor')
        
        # Select All (Cmd+A / Ctrl+A)
        modifier = "Meta" if os.uname().sysname == "Darwin" else "Control"
        await self.browser.page.keyboard.press(f"{modifier}+A")
        await self.browser.page.keyboard.press("Backspace")
        
        # Type new code (chunked to avoid timeouts)
        await self.browser.page.keyboard.insert_text(latex_code)
        logger.info("✅ LaTeX injected.")

    async def compile_pdf(self):
        """Triggers compilation."""
        logger.info("⚙️ Compiling PDF...")
        # Click Recompile button
        await self.browser.click('.recompile-button')
        # Wait for compilation to finish (check for logs or success indicator)
        # This is a simplification; robust waiting would check for the 'compiling' class removal
        await asyncio.sleep(5) 
        logger.info("✅ Compilation triggered.")

    async def download_pdf(self, download_path: str):
        """Downloads the compiled PDF."""
        logger.info("⬇️ Downloading PDF...")
        async with self.browser.page.expect_download() as download_info:
            await self.browser.click('.pdf-download-btn')
        
        download = await download_info.value
        await download.save_as(download_path)
        logger.info(f"✅ PDF saved to {download_path}")

# Singleton
overleaf_agent = OverleafAgent()
