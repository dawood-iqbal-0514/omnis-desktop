"""
GoHighLevel Automation using DrissionPage - Fixed Profile Path
"""

import os
import time
from pathlib import Path
from DrissionPage import ChromiumPage, ChromiumOptions

# --- FIXED PATH LOGIC ---
# Get the directory where THIS script is located
SCRIPT_DIR = Path(__file__).parent.absolute()

# Create a folder named 'Chrome_Profiles' right next to this script
PROFILES_ROOT = SCRIPT_DIR / "Chrome_Profiles"
CLIENT_PROFILE_PATH = PROFILES_ROOT / "gohighlevel"


def create_browser():
    """Create and configure a ChromiumPage browser instance with persistent profile."""
    
    # 1. Create the directory if it doesn't exist
    if not CLIENT_PROFILE_PATH.exists():
        print(f"Creating new profile directory at: {CLIENT_PROFILE_PATH}")
        CLIENT_PROFILE_PATH.mkdir(parents=True, exist_ok=True)
    else:
        print(f"Found existing profile directory at: {CLIENT_PROFILE_PATH}")

    # 2. Configure Options
    options = ChromiumOptions()
    
    # CRITICAL: Convert Path object to string for DrissionPage
    profile_path_str = str(CLIENT_PROFILE_PATH)
    
    # Method A: The DrissionPage helper
    options.set_user_data_path(profile_path_str)
    
    # Method B: The explicit argument (Safety net)
    options.set_argument('--user-data-dir', profile_path_str)
    
    # Use a specific internal profile (keeps "Default" clean)
    options.set_argument('--profile-directory', 'Default')
    
    # Essential for isolation
    options.auto_port()
    
    # Launch
    try:
        page = ChromiumPage(options)
        return page
    except Exception as e:
        print(f"\nError launching browser: {e}")
        print("Tip: Make sure you don't have this specific Chrome profile open elsewhere.")
        raise e


def main():
    print("--- Starting GoHighLevel Automation ---")
    print(f"Profile Path: {CLIENT_PROFILE_PATH}")
    
    page = create_browser()
    
    # Navigate to verify login state
    page.get('https://app.gohighlevel.com/')
    
    # Check if we need to log in
    if "login" in page.url or "signup" in page.url:
        print("\n>> PLEASE LOG IN MANUALLY NOW <<")
        print("Once you log in, the cookies will be saved to the folder above.")
        print("Waiting 60 seconds for you to log in...")
        
        # Simple wait loop to detect login
        for i in range(60):
            if "dashboard" in page.url or "location" in page.url or "settings" in page.url:
                print("Login detected! Saving profile...")
                break
            time.sleep(1)
    else:
        print("\n>> ALREADY LOGGED IN! <<")
        print("The profile successfully loaded your previous session.")

    print(f"Current Title: {page.title}")
    
    # Keep open briefly to verify
    time.sleep(2)
    page.quit()
    print("Browser closed. Profile data saved.")


if __name__ == "__main__":
    main()
