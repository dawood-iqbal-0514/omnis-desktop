from DrissionPage import ChromiumOptions, ChromiumPage
from DrissionPage.common import Keys
import time
import os
import sys

# Get credentials from environment variables
email = os.getenv('HUBSPOT_EMAIL', '')
password = os.getenv('HUBSPOT_PASSWORD', '')

if not email or not password:
    print("Error: HUBSPOT_EMAIL and HUBSPOT_PASSWORD environment variables are required", file=sys.stderr)
    sys.exit(1)

# Get profile path from environment or use default
profile_path_str = os.getenv('HUBSPOT_PROFILE_PATH', os.path.join(os.path.expanduser('~'), 'OmnisReach_Profiles', 'hubspot', 'default'))

# Configure browser options
options = ChromiumOptions()

# Set profile path
profile_path_str = str(profile_path_str)  # Ensure it's a string
options.set_paths(user_data_path=profile_path_str)


options.auto_port()

page = ChromiumPage(options)
time.sleep(0.5)
    
print(f"Browser launched successfully with profile: {profile_path_str}")

page.clear_cache()
page.get("https://app.hubspot.com/login")

username_input = page.ele('xpath://input[@type="email"]')
username_input.input(email + Keys.ENTER)

time.sleep(1)

remember_checkbox = page.ele('xpath://input[@type="checkbox" and @id="remember"]')
if remember_checkbox:
    checked_attr = remember_checkbox.attr('checked')
    aria_checked = remember_checkbox.attr('aria-checked')
    if checked_attr not in ('true', 'checked') and aria_checked != 'true':
        parent_label = page.ele('xpath://label[.//input[@id="remember"]]')
        if parent_label:
            parent_label.click()

sign_in_password = page.ele('xpath://button[@id="passwordBtn"]')
sign_in_password.click()

time.sleep(1)

password_input = page.ele('xpath://input[@type="password"]')
password_input.input(password + Keys.ENTER)

time.sleep(2)

two_fa_appeared = False

two_fa_url = page.url
if two_fa_url.startswith("https://app.hubspot.com/login/two-factor"):
    two_fa_appeared = True
    # Output marker to stdout so Node.js can detect it
    print("[2FA_REQUEST] Enter the OTP sent to your email:", flush=True)
    sys.stdout.flush()
    
    # Read token from stdin (provided by Node.js)
    try:
        otp = sys.stdin.readline().strip()
        if not otp:
            print("Error: No 2FA token provided", file=sys.stderr)
            page.quit()
            sys.exit(1)
        
        otp_input = page.ele('xpath://input[@type="text" or @name="code"]')
        if otp_input:
            otp_input.input(otp + Keys.ENTER)
        else:
            print("Error: Could not find 2FA input field", file=sys.stderr)
            page.quit()
            sys.exit(1)
        
        time.sleep(2)
        
        # Check if remember me button exists and click it
        remember_me = page.ele('xpath://button[@data-test-id="2fa-remember-me-button"]')
        if remember_me:
            remember_me.click()
            time.sleep(1)
    except Exception as e:
        print(f"Error during 2FA: {e}", file=sys.stderr)
        page.quit()
        sys.exit(1)

# Check if login was successful
time.sleep(2)
final_url = page.url
if "app.hubspot.com" in final_url and "login" not in final_url.lower():
    print("[SUCCESS] Login successful!")
    page.quit()
    sys.exit(0)
else:
    print("[ERROR] Login failed - still on login page", file=sys.stderr)
    page.quit()
    sys.exit(1)