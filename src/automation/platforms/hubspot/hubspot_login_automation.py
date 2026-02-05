"""
HubSpot Workflow AI Automation using DrissionPage with XPath-based response tracking
"""

import os
import re
import time
from pathlib import Path
from DrissionPage import ChromiumPage, ChromiumOptions

# Setup paths
HOME_DIR = Path.home()
PROFILES_ROOT = HOME_DIR / "OmnisReach_Profiles" / "hubspot"
USE_SYSTEM_PROFILE = False

# Configuration
WORKFLOW_AI_TEXT = "Create a workflow that sends an email when a contact is created. You can write any name for the workflow"

# Global XPath div index tracker (2, 4, 6, 8, etc. for responses)
_last_response_div_index = 0


def extract_account_id(url):
    """Extract the HubSpot account ID from the URL."""
    # Pattern matches URLs like:
    # https://app.hubspot.com/workflows/50845045/view/default
    # https://app.hubspot.com/contacts/50845045/
    # https://app.hubspot.com/reports-dashboard/50845045/view/123
    # https://app.hubspot.com/home-beta?portalId=50845045
    # https://app.hubspot.com/user-preferences/security?setup2faFromNudge=...portalId%3D50845045
    match = re.search(r'portalId(?:%3D|=)(\d+)', url)
    if match:
        return match.group(1)
    match = re.search(r'app\.hubspot\.com/[^/]+/(\d+)', url)
    if match:
        return match.group(1)
    return None


def get_profile_path(account_id=None):
    """Get the profile path for a specific account ID."""
    if account_id:
        return PROFILES_ROOT / account_id
    return PROFILES_ROOT / "default"


def click_new_chat_button(page, timeout=10):
    """Click the 'Start a new chat' button to begin a fresh conversation."""
    time.sleep(1)  # Let sidebar fully render
    
    # Try multiple selectors for the new chat button
    selectors = [
        '[data-test-id="new-thread-button"]',
        '[aria-label="Start a new chat"]',
        'button[data-test-id="new-thread-button"]'
    ]
    
    for sel in selectors:
        try:
            btn = page.ele(sel, timeout=3)
            if btn:
                btn.click()
                print("✓ Clicked 'New Chat' button")
                time.sleep(1)  # Wait for new chat to initialize
                return True
        except Exception:
            continue
    
    # Try JavaScript approach
    try:
        result = page.run_js("""
            let btn = document.querySelector('[data-test-id="new-thread-button"]');
            if (!btn) {
                btn = document.querySelector('[aria-label="Start a new chat"]');
            }
            if (btn) {
                btn.click();
                return {success: true};
            }
            
            // Try within iframes
            let iframes = document.querySelectorAll('iframe');
            for (let iframe of iframes) {
                try {
                    let doc = iframe.contentDocument || iframe.contentWindow.document;
                    if (!doc) continue;
                    
                    let btn = doc.querySelector('[data-test-id="new-thread-button"]');
                    if (!btn) {
                        btn = doc.querySelector('[aria-label="Start a new chat"]');
                    }
                    if (btn) {
                        btn.click();
                        return {success: true};
                    }
                } catch(e) {}
            }
            return {success: false};
        """)
        
        if result.get('success'):
            print("✓ Clicked 'New Chat' button (via JS)")
            time.sleep(1)
            return True
    except Exception:
        pass
    
    print("⚠ Could not find 'New Chat' button (continuing anyway...)")
    return False


def open_assistant_sidebar(page, timeout=10):
    """
    Click the Assistant button in the global toolbar to open ChatSpot sidebar.
    This is simpler than navigating to workflows.
    """
    print("\nOpening Assistant sidebar...")
    time.sleep(0.5)
    
    # Try multiple selectors for the Assistant button
    selectors = [
        '#hs-global-toolbar-copilot-list-item',
        '[data-test-id="hs-global-toolbar-copilot-list-item"]',
        '[aria-label="Open Assistant"]',
        'button[id="hs-global-toolbar-copilot-list-item"]'
    ]
    
    for sel in selectors:
        try:
            btn = page.ele(sel, timeout=3)
            if btn:
                btn.click()
                print("✓ Clicked 'Assistant' button")
                print("Waiting for sidebar to appear...")
                time.sleep(2)  # Wait for sidebar to fully render
                # Click new chat to start fresh conversation
                click_new_chat_button(page)
                return True
        except Exception:
            continue
    
    # Try JavaScript approach
    try:
        result = page.run_js("""
            let btn = document.querySelector('#hs-global-toolbar-copilot-list-item');
            if (!btn) {
                btn = document.querySelector('[data-test-id="hs-global-toolbar-copilot-list-item"]');
            }
            if (!btn) {
                btn = document.querySelector('[aria-label="Open Assistant"]');
            }
            if (btn) {
                btn.click();
                return {success: true};
            }
            return {success: false};
        """)
        
        if result.get('success'):
            print("✓ Clicked 'Assistant' button (via JS)")
            print("Waiting for sidebar to appear...")
            time.sleep(2)  # Wait for sidebar to fully render
            click_new_chat_button(page)
            return True
    except Exception:
        pass
    
    print("⚠ Could not find 'Assistant' button")
    return False


def type_in_ai_prompt(page, text, delay_seconds=2, timeout=20):
    """Wait, then type text into the AI prompt input and press Enter."""
    if not text:
        print("⚠ No search text provided.")
        return False

    print(f"\nWaiting {delay_seconds}s before typing search text...")
    time.sleep(delay_seconds)

    # The ChatSpot sidebar takes a moment to fully render
    time.sleep(0.5)

    # Use JavaScript to access the iframe's contenteditable element
    # The AI input is inside an iframe with a contenteditable div
    try:
        result = page.run_js(
            """
            // Step 1: Find and set text in contenteditable element
            let iframes = document.querySelectorAll('iframe');
            let found = false;
            let editable = null;
            
            for (let iframe of iframes) {
                try {
                    let doc = iframe.contentDocument || iframe.contentWindow.document;
                    if (!doc) continue;
                    
                    editable = doc.querySelector('[contenteditable="true"]');
                    if (editable) {
                        // Focus and ensure it's ready to receive text
                        editable.focus();
                        
                        // Clear any existing content first
                        editable.innerHTML = '';
                        editable.textContent = '';
                        
                        // Now set the text
                        editable.innerHTML = arguments[0];
                        editable.textContent = arguments[0];
                        
                        // Trigger input event to notify the app of the change
                        editable.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
                        editable.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
                        editable.dispatchEvent(new Event('textInput', { bubbles: true, cancelable: true }));
                        
                        found = true;
                        break;
                    }
                } catch(e) {
                    // Cross-origin iframes cannot be accessed
                }
            }
            
            // Fallback for main document
            if (!found) {
                editable = document.querySelector('[contenteditable="true"]');
                if (editable) {
                    editable.focus();
                    editable.innerHTML = '';
                    editable.textContent = '';
                    editable.innerHTML = arguments[0];
                    editable.dispatchEvent(new Event('input', { bubbles: true }));
                    editable.dispatchEvent(new Event('change', { bubbles: true }));
                    found = true;
                }
            }
            
            return { success: found, textSet: found ? arguments[0].length > 0 : false };
            """,
            text,
        )
        
        if not result.get('success'):
            print("⚠ Could not find AI prompt input.")
            return False
        
        if result.get('textSet'):
            print(f"✓ Text entered: '{text}'")
        
        # Wait a moment for the app to process the input
        time.sleep(0.3)
        
        # Now send the Enter key to submit
        print("Sending Enter key to submit...")
        submit_result = page.run_js(
            """
            // Find the contenteditable element again
            let iframes = document.querySelectorAll('iframe');
            let found = false;
            
            for (let iframe of iframes) {
                try {
                    let doc = iframe.contentDocument || iframe.contentWindow.document;
                    if (!doc) continue;
                    
                    let editable = doc.querySelector('[contenteditable="true"]');
                    if (editable) {
                        // Send keydown, keypress, and keyup events for Enter
                        const enterKeyDown = new KeyboardEvent('keydown', {
                            key: 'Enter',
                            code: 'Enter',
                            keyCode: 13,
                            which: 13,
                            bubbles: true,
                            cancelable: true
                        });
                        editable.dispatchEvent(enterKeyDown);
                        
                        const enterKeyPress = new KeyboardEvent('keypress', {
                            key: 'Enter',
                            code: 'Enter',
                            keyCode: 13,
                            which: 13,
                            bubbles: true,
                            cancelable: true
                        });
                        editable.dispatchEvent(enterKeyPress);
                        
                        const enterKeyUp = new KeyboardEvent('keyup', {
                            key: 'Enter',
                            code: 'Enter',
                            keyCode: 13,
                            which: 13,
                            bubbles: true,
                            cancelable: true
                        });
                        editable.dispatchEvent(enterKeyUp);
                        
                        found = true;
                        break;
                    }
                } catch(e) {
                    // Cross-origin iframe
                }
            }
            
            if (!found) {
                let mainEditable = document.querySelector('[contenteditable="true"]');
                if (mainEditable) {
                    const enterKeyDown = new KeyboardEvent('keydown', {
                        key: 'Enter',
                        code: 'Enter',
                        keyCode: 13,
                        bubbles: true
                    });
                    mainEditable.dispatchEvent(enterKeyDown);
                    found = true;
                }
            }
            
            return { submitSent: found };
            """
        )
        
        if submit_result.get('submitSent'):
            print("✓ AI prompt text entered and submitted.")
            # Wait for UI to process the new input before polling for response
            time.sleep(2)
            # After submitting, next response will be at div index + 2
            global _last_response_div_index
            _last_response_div_index += 2
            return True
        else:
            print("⚠ Could not send Enter key.")
            return False
            
    except Exception as e:
        print(f"⚠ Error typing into AI prompt: {e}")
        return False


def get_ai_response(page, timeout=120, check_interval=2):
    """
    Wait for and extract AI response using XPath pattern.
    Each response appears at /html/body/div[4]/div/div[1]/div/div/div[2]/div/div[2]/div/div[1]/div/div/div[N]/div/div
    where N increases by 2 for each new response (2, 4, 6, 8, etc.)
    Polls silently - only prints when response is found.
    """
    global _last_response_div_index

    start_time = time.time()
    xpath_base = "/html/body/div[4]/div/div[1]/div/div/div[2]/div/div[2]/div/div[1]/div/div/div[{}]/div/div"
    
    stable_text = None
    stable_count = 0
    
    status_phrases = (
        "processing your request",
        "building workflow",
        "choosing workflow",
        "loading results",
        "getting results",
        "thinking",
    )

    while time.time() - start_time < timeout:
        try:
            # Build XPath for the expected next response
            xpath = xpath_base.format(_last_response_div_index)
            
            # Try to find the element
            try:
                element = page.ele(f'xpath:{xpath}', timeout=1)
                if element:
                    text = element.text.strip()
                    if text and len(text) > 20:
                        text_lower = text.lower()
                        if any(phrase in text_lower for phrase in status_phrases):
                            stable_text = None
                            stable_count = 0
                            time.sleep(check_interval)
                            continue
                        # Check if text is stable (not changing) - wait for rendering to complete
                        if text == stable_text:
                            stable_count += 1
                            if stable_count >= 2:  # Text hasn't changed for 2 checks
                                print(f"[RESPONSE] {text[:300]}...")
                                return text
                        else:
                            stable_text = text
                            stable_count = 0
                        continue
            except Exception:
                pass
            
            # Fallback: Try using JavaScript to get the text
            result = page.run_js(
                f"""
                try {{
                    let xpath = "{xpath}";
                    let element = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                    if (element) {{
                        return {{success: true, text: element.textContent || element.innerText || ''}};
                    }}
                }} catch(e) {{}}
                return {{success: false, text: ''}};
                """
            )
            
            if result.get('success'):
                text = result.get('text', '').strip()
                if text and len(text) > 20:
                    text_lower = text.lower()
                    if any(phrase in text_lower for phrase in status_phrases):
                        stable_text = None
                        stable_count = 0
                        time.sleep(check_interval)
                        continue
                    # Check if text is stable (not changing)
                    if text == stable_text:
                        stable_count += 1
                        if stable_count >= 2:
                            print(f"[RESPONSE] {text[:300]}...")
                            return text
                    else:
                        stable_text = text
                        stable_count = 0
                    continue

        except Exception:
            pass

        time.sleep(check_interval)

    return None


def create_browser(account_id=None):
    """Create and configure a ChromiumPage browser instance with persistent profile."""

    profile_path = get_profile_path(account_id)

    # 1. Create the directory if it doesn't exist (only for isolated profiles)
    if not USE_SYSTEM_PROFILE:
        if not profile_path.exists():
            print(f"Creating new profile directory at: {profile_path}")
            profile_path.mkdir(parents=True, exist_ok=True)
        else:
            print(f"Found existing profile directory at: {profile_path}")

    # 2. Configure Options
    options = ChromiumOptions()

    # CRITICAL: Convert Path object to string for DrissionPage
    profile_path_str = str(profile_path)
    # Set user data path
    options.set_user_data_path(profile_path_str)
    
    # Disable automation flags
    options.set_argument('--disable-blink-features=AutomationControlled')
    
    # Launch
    try:
        page = ChromiumPage(options)
        
        print(f"Browser launched.")
        print(f"Configured user data path: {profile_path_str}")
        
        return page, profile_path
    except Exception as e:
        print(f"\nError launching browser: {e}")
        print("Tip: Make sure you don't have this specific Chrome profile open elsewhere.")
        raise e


def main(account_id=None):
    global _last_response_div_index
    
    # Reset div index for fresh run
    _last_response_div_index = 0  # Will become 2 after first message, 4 after second, etc.
    
    print("--- Starting HubSpot Automation ---")
    
    # If no account_id provided, start with default profile
    page, profile_path = create_browser(account_id)
    
    print(f"Profile Path: {profile_path}")
    
    # Navigate to verify login state
    page.get('https://app.hubspot.com/')

    # Wait for page to fully load and redirect
    time.sleep(1.5)

    # If still redirecting, give it a bit more time
    if "redirect" in page.title.lower() or "home-beta" in page.url.lower():
        time.sleep(2)
    
    print(f"Current URL: {page.url}")
    print(f"Current Title: {page.title}")
    
    # Try to extract account ID from current URL
    detected_account_id = extract_account_id(page.url)

    # If account ID is still missing, navigate to contacts to obtain it
    if not detected_account_id:
        try:
            page.get('https://app.hubspot.com/contacts')
            time.sleep(2)
            detected_account_id = extract_account_id(page.url)
        except Exception:
            pass
    
    # Check if we need to log in - check both URL and title
    needs_login = (
        "login" in page.url.lower() or 
        "signup" in page.url.lower() or
        "login" in page.title.lower() or
        "sign in" in page.title.lower()
    )
    
    if needs_login:
        print("\n>> PLEASE LOG IN MANUALLY NOW <<")
        print("Once you log in, the cookies will be saved with your account ID.")
        print("Waiting 120 seconds for you to log in...")
        
        # Simple wait loop to detect login
        for i in range(120):
            current_url = page.url.lower()
            current_title = page.title.lower()
            
            # Try to extract account ID
            detected_account_id = extract_account_id(page.url)
            
            # Check if logged in (dashboard, reports, contacts, etc.)
            if any(x in current_url for x in ["dashboard", "reports", "contacts", "home", "workflows"]):
                print("\n✓ Login detected!")
                if detected_account_id:
                    print(f"✓ Account ID detected: {detected_account_id}")
                break
            
            # Also check if we're no longer on login page
            if "login" not in current_url and "signup" not in current_url and "login" not in current_title:
                print("\n✓ Login detected!")
                if detected_account_id:
                    print(f"✓ Account ID detected: {detected_account_id}")
                break
                
            time.sleep(1)
        else:
            print("\n✗ Login timeout - 120 seconds elapsed.")
    else:
        print("\n>> ALREADY LOGGED IN! <<")
        print("The profile successfully loaded your previous session.")
        if detected_account_id:
            print(f"✓ Account ID: {detected_account_id}")

    print(f"\nFinal URL: {page.url}")
    print(f"Final Title: {page.title}")
    
    # Extract final account ID
    final_account_id = extract_account_id(page.url)
    
    if final_account_id:
        print(f"\n✓ HubSpot Account ID: {final_account_id}")
        final_profile_path = get_profile_path(final_account_id)
        print(f"✓ Profile will be saved to: {final_profile_path}")
    else:
        final_profile_path = profile_path
        print(f"\n⚠ Could not detect account ID from URL")
        print(f"Profile will be saved to: {final_profile_path}")

    # Open Assistant sidebar (simpler than navigating to workflows)
    if open_assistant_sidebar(page):
        print("\n" + "="*60)
        print("AI Workflow Creation Starting")
        print("="*60)
        
        # Send initial message (short delay since we have fresh chat)
        if type_in_ai_prompt(page, WORKFLOW_AI_TEXT, delay_seconds=1):
            print("\n" + "="*60)
            print("AI Workflow Creation Starting")
            print("="*60)
            
            # Get initial response (wait to allow AI to render fully)
            print("\n[LISTENING] Waiting for initial response...\n")
            time.sleep(10)
            response = get_ai_response(page, timeout=120)
            
            if response:
                print(f"\n📌 AI: {response}\n")
                
                # Interactive conversation loop - 3 iterations
                for iteration in range(1, 4):
                    print(f"\n--- Iteration {iteration}/3 ---")
                    try:
                        user_input = input("Your response: ").strip()
                        
                        if not user_input:
                            print("Skipping empty response...")
                            continue
                        
                        # Send user's response to chatbot
                        print(f"✓ Sending your response to AI...")
                        type_in_ai_prompt(page, user_input)
                        
                        # Get AI's next response (wait to allow AI to render fully)
                        print("[LISTENING] Waiting for response...\n")
                        time.sleep(10)
                        ai_response = get_ai_response(page, timeout=120)
                        if ai_response:
                            print(f"\n📌 AI: {ai_response}\n")
                        else:
                            print("No response received from AI")
                    except KeyboardInterrupt:
                        print("\n\nConversation stopped by user.")
                        break
                
                print("\n" + "="*60)
                print("✓ CONVERSATION COMPLETED!")
                print("="*60)
            else:
                print("No initial response received from AI")
    else:
        print("\n⚠ Could not open Assistant sidebar")
    
    # Wait for user to confirm before closing
    print("\n" + "="*50)
    print("IMPORTANT: Press Enter ONLY after you're done.")
    print("The browser needs to close properly to save cookies.")
    print("="*50)
    input("\nPress Enter to close the browser and save session...")
    
    # Give Chrome time to sync cookies to disk
    print("Saving session data to disk...")
    time.sleep(2)
    
    page.quit()
    
    # Verify profile was saved
    time.sleep(0.5)
    profile_contents = list(profile_path.iterdir()) if profile_path.exists() else []
    print(f"\nProfile directory contains {len(profile_contents)} items.")
    if profile_contents:
        print("✓ Profile data saved successfully!")
    else:
        print("✗ WARNING: Profile directory is empty - cookies may not have saved.")
    
    print("Browser closed.")
    
    return final_account_id


if __name__ == "__main__":
    import sys
    # Allow passing account_id as command line argument
    account_id = sys.argv[1] if len(sys.argv) > 1 else None
    if account_id:
        print(f"Using provided account ID: {account_id}")
    main(account_id)
