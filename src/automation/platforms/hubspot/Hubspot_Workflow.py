"""
HubSpot Workflow AI Automation using DrissionPage with XPath-based response tracking
"""

import os
import re
import time
from pathlib import Path
from DrissionPage import ChromiumPage, ChromiumOptions

# Setup paths - assumes Hubspot_Auto_Login.py has already set up the profile
HOME_DIR = Path.home()
PROFILE_PATH = HOME_DIR / "OmnisReach_Profiles" / "hubspot" / "default"

# Configuration
WORKFLOW_AI_TEXT = "Create a workflow that sends an email when a contact is created. You can write any name for the workflow"

# Global XPath div index tracker (2, 4, 6, 8, etc. for responses)
_last_response_div_index = 0


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


def create_browser():
    """Create browser instance using existing profile (assumes Hubspot_Auto_Login.py has already logged in)."""
    
    # Configure Options with existing profile
    options = ChromiumOptions()
    profile_path_str = str(PROFILE_PATH)
    options.set_user_data_path(profile_path_str)
    
    # Disable automation flags
    options.set_argument('--disable-blink-features=AutomationControlled')
    
    try:
        page = ChromiumPage(options)
        print(f"Browser launched with profile: {profile_path_str}")
        return page
    except Exception as e:
        print(f"Error launching browser: {e}")
        raise e


def main():
    global _last_response_div_index
    
    # Reset div index for fresh run
    _last_response_div_index = 0  # Will become 2 after first message, 4 after second, etc.
    
    print("--- Starting HubSpot Workflow Automation ---")
    
    # Create browser with existing logged-in profile
    page = create_browser()
    
    # Navigate to HubSpot home
    print("\nNavigating to HubSpot...")
    page.get('https://app.hubspot.com/')
    time.sleep(2)
    
    print(f"Current URL: {page.url}")
    print(f"Current Title: {page.title}")

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
    
    # Keep browser open for workflow automation
    print("\n" + "="*50)
    print("Workflow automation completed.")
    print("="*50)


if __name__ == "__main__":
    main()
