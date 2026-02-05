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
ACCOUNT_ID = "50845045"  # Your HubSpot account ID


def get_profile_path(account_id=None):
    """Get the profile path for a specific account ID."""
    if account_id:
        return PROFILES_ROOT / account_id
    return PROFILES_ROOT / "default"


def get_browser(account_id=ACCOUNT_ID):
    """Launches browser with the saved session."""
    profile_dir = get_profile_path(account_id)

    if not profile_dir.exists():
        print(f"⚠ Profile directory not found: {profile_dir}")
        print(f"Please run hubspot_login_automation.py first to create the profile.")
        return None, None

    print(f"✓ Using profile: {profile_dir}")
    co = ChromiumOptions()
    co.set_user_data_path(str(profile_dir))
    co.set_argument('--disable-blink-features=AutomationControlled')
    co.auto_port()
    
    page = ChromiumPage(co)
    print(f"Browser launched with profile: {profile_dir}")
    return page, profile_dir


def get_portal_id(page, max_wait_seconds=30):
    try:
        page.wait.url_change('login', exclude=True, timeout=5)
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
    page, profile_path = get_browser(account_id)
    
    if not page:
        print("Could not launch browser. Exiting.")
        return

    print("\n--- Starting HubSpot List Automation ---")
    print(f"Profile Path: {profile_path}")

    print(">> Opening HubSpot...")
    page.get('https://app.hubspot.com/')
    
    time.sleep(2)

    # Get portal ID
    portal_id = get_portal_id(page)
    if not portal_id:
        print("❌ Could not detect Portal ID. Profile might not be logged in.")
        print(f"Please ensure {profile_path} contains a valid HubSpot session.")
        page.quit()
        return

    print(f"✓ Portal ID detected: {portal_id}")

    segment_url = f"https://app.hubspot.com/contacts/{portal_id}/objectLists/create"
    print(f">> Navigating to: {segment_url}")
    page.get(segment_url)

    if not page.wait.ele('text:Choose who you\'d like to segment', timeout=15):
        print("❌ Page took too long to load.")
        page.quit()
        return

    print(">> Selecting 'Contacts'...")
    contact_card = page.ele('text:Contacts')
    if contact_card:
        contact_card.click()
    else:
        print("❌ Could not find 'Contacts' card.")
        page.quit()
        return

    print(f">> Entering Prompt: '{prompt}'")
    ai_box = page.ele('tag:textarea@@placeholder:Example prompt') or page.ele('tag:textarea')

    if ai_box:
        ai_box.input(prompt)
        time.sleep(1)

        print(">> Triggering AI...")
        page.actions.type('\n')

        time.sleep(4)

        print(">> Clicking Next...")
        next_btn = page.ele('text:Next')
        if next_btn:
            next_btn.click()
        else:
            print("❌ 'Next' button not active. AI might still be thinking.")
            page.quit()
            return

        print(f">> Naming list: '{list_name}'")
        name_input = page.wait.ele('tag:input@@type:text', timeout=10)
        if name_input:
            name_input.clear()
            name_input.input(list_name)

            print("✓ SUCCESS: List created (Draft Mode). Check your browser.")
    else:
        print("❌ Could not find the AI text box.")

    # Keep browser open so you can see the result
    time.sleep(5)
    page.quit()


if __name__ == "__main__":
    import sys
    account_id = sys.argv[1] if len(sys.argv) > 1 else ACCOUNT_ID
    create_segment_with_ai(USER_PROMPT, LIST_NAME, account_id=account_id)
