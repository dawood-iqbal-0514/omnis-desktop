"""
HubSpot List (Segment) AI Automation
Targeting the 'Choose who you'd like to segment' page.
"""

import time
import re
import os
from pathlib import Path
from DrissionPage import ChromiumPage, ChromiumOptions

# Setup paths - same as login automation
HOME_DIR = Path.home()
PROFILES_ROOT = HOME_DIR / "OmnisReach_Profiles" / "hubspot"
USE_SYSTEM_PROFILE = False

# --- CONFIGURATION ---
USER_PROMPT = "Contacts who have clicked a marketing email in the last 7 days"
LIST_NAME = "Recent Email Engagers (AI)"
ACCOUNT_ID = "50845045"


def get_profile_path(account_id=None):
    """Get the profile path for a specific account ID."""
    if account_id:
        return PROFILES_ROOT / account_id
    return PROFILES_ROOT / "default"


def _pick_existing_profile_dir():
    if not PROFILES_ROOT.exists():
        return None
    candidates = [p for p in PROFILES_ROOT.iterdir() if p.is_dir()]
    if not candidates:
        return None
    # Prefer numeric account folders; otherwise use most recently modified
    numeric = [p for p in candidates if p.name.isdigit()]
    pool = numeric if numeric else candidates
    return max(pool, key=lambda p: p.stat().st_mtime)


def get_browser(account_id=ACCOUNT_ID):
    """Launches browser with the saved session."""
    if account_id:
        profile_dir = get_profile_path(account_id)
    else:
        profile_dir = _pick_existing_profile_dir() or get_profile_path("default")

    if not profile_dir.exists():
        print(f"⚠ Profile directory not found: {profile_dir}")
        print("Please run login automation first to create the profile.")
        return None, None

    co = ChromiumOptions()
    co.set_user_data_path(str(profile_dir))
    co.set_argument('--disable-blink-features=AutomationControlled')
    co.auto_port()
    
    page = ChromiumPage(co)
    print(f"Browser launched with profile: {profile_dir}")
    return page, profile_dir

def get_portal_id(page, max_wait_seconds=120):
    try:
        # Wait for URL to stabilize (ignore login redirects)
        page.wait.url_change('login', exclude=True)
    except Exception:
        pass

    start = time.time()
    while time.time() - start < max_wait_seconds:
        url = page.url
        match = re.search(r'app\.hubspot\.com/\w+/(\d+)', url)
        if match:
            return match.group(1)
        match = re.search(r'[?&]portalId=(\d+)', url)
        if match:
            return match.group(1)
        time.sleep(1)
    return None

def create_segment_with_ai(prompt, list_name, account_id=ACCOUNT_ID):
    page, profile_dir = get_browser(account_id)
    if not page:
        return
    
    # 1. Open HubSpot
    print(">> Opening HubSpot...")
    page.get('https://app.hubspot.com/')
    
    # 2. Get Portal ID
    portal_id = get_portal_id(page)
    if not portal_id:
        print("!! Could not detect Portal ID. Please log in manually.")
        return

    # 3. Go directly to the "Create Segment" page
    # This URL matches the page in your screenshot/HTML
    segment_url = f"https://app.hubspot.com/contacts/{portal_id}/objectLists/create"
    print(f">> Navigating to: {segment_url}")
    page.get(segment_url)
    
    # 4. Wait for the header "Choose who you'd like to segment"
    # This confirms the page has fully loaded (from your HTML)
    if not page.ele('text:Choose who you\'d like to segment', timeout=15):
        print("!! Page took too long to load.")
        return

    # 5. Select "Contacts"
    # We click the specific card found in your HTML
    print(">> Selecting 'Contacts'...")
    time.sleep(2)  # Wait for page to fully render before clicking
    contact_card = page.ele('text:Contacts')
    if contact_card:
        try:
            contact_card.click()
        except Exception as e:
            print(f"Click failed: {e}. Trying with JavaScript...")
            page.run_js("document.querySelector('[role=\"button\"]')?.click()")
    else:
        print("!! Could not find 'Contacts' card.")
        return

    # 6. Find the AI Textarea
    # Using the exact placeholder from your HTML
    print(f">> Entering Prompt: '{prompt}'")
    ai_box = page.ele('tag:textarea@@placeholder:Example prompt') or page.ele('tag:textarea')
    
    if ai_box:
        ai_box.input(prompt)
        time.sleep(1) # Short pause to simulate typing
        
        # 7. Trigger the AI (Hit Enter or Click Generate)
        # In this UI, hitting Enter inside the box usually triggers generation
        print(">> Triggering AI...")
        page.actions.type('\n') 
        
        # Wait for the AI to "think" (Spinner or UI change)
        time.sleep(4) 
        
        # 8. Click "Next"
        # The HTML shows the button has text "Next" inside a span
        print(">> Clicking Next...")
        next_btn = page.ele('text:Next')
        if next_btn:
            next_btn.click()
        else:
            print("!! 'Next' button not active. AI might still be thinking.")
            return

        # 9. Name the List (The final step)
        print(f">> Naming list: '{list_name}'")
        # Wait for the name input to slide in
        name_input = page.wait.ele('tag:input@@type:text', timeout=10)
        if name_input:
            name_input.clear()
            name_input.input(list_name)
            
            # 10. Click "Create list" (or Save)
            # Uncomment the next line to actually save it in your account
            # page.ele('text:Save list').click()
            print("SUCCESS: List created (Draft Mode). Check your browser.")
            
    else:
        print("!! Could not find the AI text box.")

    # Keep browser open so you can see the result
    time.sleep(5)
    page.quit()

if __name__ == "__main__":
    create_segment_with_ai(USER_PROMPT, LIST_NAME, account_id=ACCOUNT_ID)