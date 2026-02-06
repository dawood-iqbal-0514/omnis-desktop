from DrissionPage import ChromiumPage
import time
import urllib.parse
import json
import os
import uuid
import re

# ==============================================================================
# CONFIGURATION
# ==============================================================================
TARGETS = [
    {"name": "Dawood Iqbal", "msg": "Hey Hanzla, this message was sent via the API because I remembered your ID!"}
]

DATABASE_FILE = "saved_leads.json"

# ==============================================================================
# HELPER: DATABASE MANAGEMENT
# ==============================================================================
def load_db():
    if os.path.exists(DATABASE_FILE):
        with open(DATABASE_FILE, 'r', encoding='utf-8') as f:
            try:
                return json.load(f)
            except:
                return {}
    return {}

def save_to_db(name, thread_url):
    try:
        # Extract ID from URL: .../thread/2-ZWR...==/
        if "/thread/" in thread_url and "/new" not in thread_url:
            thread_id_raw = thread_url.split('/thread/')[1].split('/')[0]
            thread_id = urllib.parse.unquote(thread_id_raw)
            
            db = load_db()
            db[name] = {
                "thread_id": thread_id,
                "full_url": thread_url,
                "timestamp": time.time()
            }
            
            with open(DATABASE_FILE, 'w', encoding='utf-8') as f:
                json.dump(db, f, indent=4)
            print(f"   💾 SAVED ID: {thread_id[:15]}...")
    except Exception as e:
        print(f"   ❌ Save Error: {e}")

# ==============================================================================
# 1. API SENDER (The Fast Path)
# ==============================================================================
def send_via_api(page, conversation_urn, text, self_urn):
    print(f"   ⚡ Sending via API to {conversation_urn[-15:]}...")
    
    # Generate Tracking Tokens
    origin_token = str(uuid.uuid4())
    cookies = page.cookies(all_info=True)
    jsessionid = next((c['value'].replace('"', '') for c in cookies if c['name'] == 'JSESSIONID'), '')

    # Binary Tracking ID Generator (Required for API)
    js_code = f"""
    function generateTrackingId() {{
        const array = new Uint8Array(16);
        window.crypto.getRandomValues(array);
        let binaryString = "";
        for (let i = 0; i < array.length; i++) {{
            binaryString += String.fromCharCode(array[i]);
        }}
        return binaryString;
    }}
    const payload = {{
        "message": {{
            "body": {{ "attributes": [], "text": "{text}" }},
            "renderContentUnions": [],
            "conversationUrn": "{conversation_urn}",
            "originToken": "{origin_token}"
        }},
        "mailboxUrn": "{self_urn}",
        "trackingId": generateTrackingId(),
        "dedupeByClientGeneratedToken": false
    }};
    return fetch("https://www.linkedin.com/voyager/api/voyagerMessagingDashMessengerMessages?action=createMessage", {{
        method: "POST",
        headers: {{
            "csrf-token": "{jsessionid}", 
            "x-restli-protocol-version": "2.0.0",
            "content-type": "text/plain;charset=UTF-8",
            "accept": "application/json"
        }},
        body: JSON.stringify(payload)
    }}).then(res => res.status);
    """
    try:
        status = page.run_js(js_code)
        if status in [200, 201]:
            print("   🚀 SUCCESS: Message Sent (API)")
            return True
        else:
            print(f"   ⚠️ API Failed: {status}")
            return False
    except Exception as e:
        print(f"   ❌ API Error: {e}")
        return False

# ==============================================================================
# 2. UI SENDER (The Harvest Path)
# ==============================================================================
def send_via_ui_harvester(page, text):
    try:
        # Find Box
        msg_box = page.ele('css:div[role="textbox"][contenteditable="true"]', timeout=5)
        if not msg_box:
            print("   ❌ Error: Message box not found.")
            return False

        # Type
        msg_box.click() 
        msg_box.clear()
        msg_box.input(text)
        
        # Wake up button
        page.run_js("arguments[0].dispatchEvent(new Event('input', { bubbles: true }));", msg_box)
        time.sleep(1.5) 

        # Click Send
        send_btn = page.ele('button[type="submit"].msg-form__send-button', timeout=3)
        if not send_btn:
            send_btn = page.ele('css:button[type="submit"]', timeout=2)
        
        if send_btn and send_btn.states.is_enabled:
            page.run_js("arguments[0].click();", send_btn)
            print("   🚀 Message Sent (UI)")
            return True
            
    except:
        return False
    return False

# ==============================================================================
# MAIN LOGIC
# ==============================================================================
def main():
    print("🤖 Starting OmnisReach (Smart Switching)...")
    browser = ChromiumPage()
    
    # 1. Connect & Capture Session (Required for API)
    if 'linkedin.com' not in browser.url:
        browser.get('https://www.linkedin.com/messaging/')
        time.sleep(3)
        
    # Get Self URN for API
    self_urn = None
    try:
        match = re.search(r'urn:li:fsd_profile:ACo[a-zA-Z0-9_-]+', browser.html)
        if match: self_urn = match.group(0)
    except: pass
    
    # 2. Load Database
    db = load_db()
    print(f"   📂 Loaded {len(db)} saved contacts from database.")

    for target in TARGETS:
        name = target['name']
        print(f"\n--- Processing: {name} ---")
        
        # === PATH A: API (Fast) ===
        if name in db:
            print("   💎 ID Found in Database! Skipping UI...")
            thread_id = db[name]['thread_id']
            # Construct URN
            # Note: API format usually needs URN tuple: (user, thread) or just thread depending on endpoint
            # Let's use the format that worked for us before: tuple
            convo_urn = f"urn:li:msg_conversation:({self_urn},{thread_id})"
            
            success = send_via_api(browser, convo_urn, target['msg'], self_urn)
            if not success:
                print("   ⚠️ API Failed. Falling back to UI path...")
                # Remove from DB if invalid?
                # del db[name]
            else:
                time.sleep(2)
                continue # Skip to next person

        # === PATH B: UI HARVESTER (Slow) ===
        print("   🔍 ID Not found. Starting UI Harvester...")
        
        # 1. Navigate to New Message
        browser.get("https://www.linkedin.com/messaging/thread/new/")
        time.sleep(2)

        # 2. Search & Select
        try:
            inp = browser.ele('css:input[placeholder="Type a name or multiple names"]', timeout=5)
            if inp:
                inp.click()
                inp.input(name)
                time.sleep(2)
                inp.input('\n') # Select
                time.sleep(4) # Wait for redirect/load
            else:
                print("   ❌ Search input missing.")
                continue
        except: continue

        # 3. Send
        sent = send_via_ui_harvester(browser, target['msg'])
        
        # 4. Harvest ID
        if sent:
            print("   👀 Harvesting URL...")
            time.sleep(3)
            current_url = browser.url
            if "thread/" in current_url:
                save_to_db(name, current_url)
                
        time.sleep(3)

    print("\n✅ Batch Complete.")

if __name__ == "__main__":
    main()