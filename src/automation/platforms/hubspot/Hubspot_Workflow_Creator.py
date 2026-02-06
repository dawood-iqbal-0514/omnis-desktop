import time
from pathlib import Path
from DrissionPage import ChromiumPage, ChromiumOptions
from DrissionPage.common import Keys


HOME_DIR = Path.home()
PROFILE_PATH = HOME_DIR / "OmnisReach_Profiles" / "hubspot" / "default"

WORKFLOW_AI_TEXT = "Create a workflow that sends an email when a contact is created. You can write any name for the workflow"


def click_new_chat_button(page):
    page.wait.load_start()
    if page.ele('xpath://div[@class="EmptyStateLayout__AnimatedContainer-hSDUgC dGEDbI"]'):
        print("✓ Already New Chat")
        return True
    btn = page.ele('xpath://button[@data-test-id="new-thread-button"]')
    if btn:
        btn.click(by_js=True)
        print("✓ Clicked 'New Chat' button")
        page.wait.load_start()
        return True
    return False


def open_assistant_sidebar(page, i = 0):
    print("\nOpening Assistant sidebar...")
    page.wait.load_start()
    print("Page fully loaded, looking for Assistant sidebar button...")

    # Check if we're already in the chat sidebar
    if page.ele('xpath://div[@data-test-id="chat-header"]'):
        click_new_chat_button(page)
        return True
    
    # Find and click the Assistant sidebar button
    btn = page.ele('#hs-global-toolbar-copilot-list-item')
    if btn:
        btn.click(by_js=True)
        page.wait.load_start()
        click_new_chat_button(page)
        print("✓ Assistant sidebar opened")
        return True
    else:
        if i < 3:
            print("⚠ Assistant sidebar button not found, refreshing and retrying...")
            page.refresh()
            open_assistant_sidebar(page, i + 1)
        else:
            print("⚠ Could not find Assistant sidebar button after multiple attempts.")
            return False


def type_in_ai_prompt(page, text):

    page.wait.load_start()

    text_box = page.ele('xpath://div[@data-editor-body-container="true"]')
    if text_box:
        print("✓ Found AI prompt input box via selector")
        text_box.click(by_js=True)
        page.actions.key_down(Keys.CONTROL).type('a').key_up(Keys.CONTROL).type(Keys.BACKSPACE)
        text_box.input(text + Keys.ENTER)
        print("✓ Text entered and submitted via direct input and AI generated response")
        return True
    else:
        print("⚠ Could not find AI prompt input box")
        return False


def get_response(page, timeout=120, check_interval=2):
    """Get the latest AI response from chat messages."""
    start_time = time.time()
    
    while time.time() - start_time < timeout:
        try:
            messages = page.eles('xpath://div[@data-test-id="chat-message"]')
            
            if messages and len(messages) > 0:
                last_message = messages[-1]
                response_text = last_message.text.strip()
                
                if response_text and len(response_text) > 20:
                    return response_text
        except Exception as e:
            print(f"Debug: Error getting response - {e}")
            pass
        
        time.sleep(check_interval)
    
    print("⏱ Timeout waiting for AI response")
    return None





def create_browser():
    # Configure Options with existing profile
    options = ChromiumOptions()
    profile_path_str = str(PROFILE_PATH)
    options.set_paths(user_data_path=profile_path_str)
    page = ChromiumPage(options)
    print(f"Browser launched with profile: {profile_path_str}")
    return page


def main():
    
    print("--- Starting HubSpot Workflow Automation ---")
    
    page = create_browser()
    
    print("\nNavigating to HubSpot...")
    page.get('https://app.hubspot.com/')
    time.sleep(2)

    if open_assistant_sidebar(page):
        
        if type_in_ai_prompt(page, WORKFLOW_AI_TEXT):
            
            print("\n[LISTENING] Waiting for initial response...\n")
            time.sleep(10)
            response = get_response(page)
            
            if response:
                print(f"\n📌 AI: {response}\n")
                
                for iteration in range(1, 4):
                    print(f"\n--- Iteration {iteration}/3 ---")
                    try:
                        user_input = input("Your response: ").strip()
                        
                        if not user_input:
                            print("Skipping empty response...")
                            continue

                        print(f"✓ Sending your response to AI...")
                        type_in_ai_prompt(page, user_input)
                        
                        print("[LISTENING] Waiting for response...\n")
                        time.sleep(10)
                        ai_response = get_response(page)
                        if ai_response:
                            print(f"\n📌 AI: {ai_response}\n")
                        else:
                            print("No response received from AI")
                    except KeyboardInterrupt:
                        print("\n\nConversation stopped by user.")
                        break
            else:
                print("No initial response received from AI")
    else:
        print("\n⚠ Could not open Assistant sidebar")


if __name__ == "__main__":
    main()
