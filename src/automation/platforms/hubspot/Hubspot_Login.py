from DrissionPage import ChromiumOptions, ChromiumPage
from DrissionPage.common import Keys
import time
import os
import sys
import traceback

def log(msg):
    """Print a timestamped debug line to stdout so Node.js can log it."""
    print(f"[DEBUG] {msg}", flush=True)

def err(msg):
    """Print to stderr so Node.js error parser picks it up."""
    print(f"ERROR: {msg}", file=sys.stderr, flush=True)


# Top-level BaseException wrapper — catches EVERYTHING including DrissionPage
# internal SystemExit/crashes that `except Exception` misses
try:

    # Get credentials from environment variables
    email = os.getenv('HUBSPOT_EMAIL', '')
    password = os.getenv('HUBSPOT_PASSWORD', '')

    if not email or not password:
        err("HUBSPOT_EMAIL and HUBSPOT_PASSWORD environment variables are required")
        sys.exit(1)

    # Get profile path from environment or use default
    default_profile_path = os.path.normpath(r"C:\Users\MDKG0514\OneDrive\Desktop\Portfolio\Dawood\OmnisReach\omnis-desktop\src\automation\chrome_profiles\Profile 1")
    profile_path_str = os.getenv('HUBSPOT_PROFILE_PATH', default_profile_path)

    # Configure browser options
    options = ChromiumOptions()
    profile_path_str = str(profile_path_str)
    options.set_paths(user_data_path=profile_path_str)
    options.auto_port()

    log("Launching browser...")
    page = ChromiumPage(options)
    time.sleep(0.5)
    log(f"Browser launched with profile: {profile_path_str}")

    page.clear_cache()
    page.get("https://app.hubspot.com/login")
    log("Navigated to HubSpot login page")

    username_input = page.ele('xpath://input[@type="email"]')
    username_input.input(email + Keys.ENTER)
    log("Email submitted")

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
    log("Password submitted")

    # Poll for 2FA redirect — HubSpot can take 3–8 seconds after password submit
    two_fa_appeared = False
    log("Waiting for page redirect after password...")
    for i in range(15):
        time.sleep(1)
        current_url = page.url
        log(f"Poll {i+1}/15 — current URL: {current_url}")
        if current_url.startswith("https://app.hubspot.com/login/two-factor"):
            two_fa_appeared = True
            log("2FA page detected! Waiting 3s for page to fully render...")
            time.sleep(3)
            break
        if "app.hubspot.com" in current_url and "login" not in current_url.lower():
            log("No 2FA required — already on dashboard")
            break

    if two_fa_appeared:
        # Signal Node.js that we need the OTP
        print("[2FA_REQUEST] Enter the OTP sent to your email:", flush=True)
        sys.stdout.flush()

        log("Waiting for OTP from Node.js stdin...")
        otp = sys.stdin.readline().strip()
        log(f"Received OTP from stdin — length: {len(otp)}, first chars: {otp[:2]}***")

        if not otp:
            err("No 2FA token provided — stdin returned empty string")
            page.quit()
            sys.exit(1)

        log(f"Current URL before element search: {page.url}")

        # --- Find the OTP input field with retries ---
        # HubSpot can lazy-render the input after the URL changes,
        # so retry every 2s for up to 5 attempts (10s total).
        otp_input = None
        selectors = [
            ("placeholder contains 'digit'", 'xpath://input[contains(@placeholder, "digit")]'),
            ("placeholder contains 'code'",  'xpath://input[contains(@placeholder, "code")]'),
            ("autocomplete=one-time-code",   'xpath://input[@autocomplete="one-time-code"]'),
            ("type=tel",    'xpath://input[@type="tel"]'),
            ("type=text",   'xpath://input[@type="text"]'),
            ("type=number", 'xpath://input[@type="number"]'),
            ("name=code",   'xpath://input[@name="code"]'),
        ]

        for attempt in range(5):
            log(f"Element search attempt {attempt+1}/5...")
            for label, selector in selectors:
                try:
                    found = page.ele(selector)
                    if found:
                        otp_input = found
                        log(f"  FOUND with: {label}")
                        break
                except BaseException as e:
                    log(f"  {label} raised: {type(e).__name__}: {e}")
                    continue
            if otp_input:
                break

            # Last resort — any visible input
            try:
                found = page.ele('tag:input')
                if found:
                    otp_input = found
                    log(f"  FOUND fallback input — type: {found.attr('type')}, placeholder: {found.attr('placeholder')}")
                    break
            except BaseException:
                pass

            log(f"  Not found — waiting 2s before retry...")
            time.sleep(2)

        if not otp_input:
            err("Could not find 2FA input field after 5 attempts (10s)")
            page.quit()
            sys.exit(1)

        # Type the OTP into the found field
        log("Clicking OTP input...")
        otp_input.click()
        time.sleep(0.2)

        log("Typing OTP into field...")
        otp_input.input(otp)
        log("OTP typed successfully")

        # Wait briefly for Continue button to enable
        time.sleep(0.5)

        # Click the Continue / Submit button instead of pressing Enter
        log("Looking for submit button...")
        continue_btn = None
        for btn_label, btn_selector in [
            ("text=Continue", 'xpath://button[contains(text(),"Continue")]'),
            ("text=continue", 'xpath://button[contains(text(),"continue")]'),
            ("type=submit",   'xpath://button[@type="submit"]'),
            ("text=Verify",   'xpath://button[contains(text(),"Verify")]'),
            ("text=Submit",   'xpath://button[contains(text(),"Submit")]'),
        ]:
            try:
                found = page.ele(btn_selector, timeout=2)
                if found:
                    continue_btn = found
                    log(f"  Found button: {btn_label} — text: '{found.text}'")
                    break
            except BaseException:
                continue

        if continue_btn:
            log("Clicking submit button...")
            continue_btn.click()
            log("Submit button clicked")
        else:
            log("No submit button found — pressing Enter on OTP field")
            otp_input.input(Keys.ENTER)
            log("Enter key sent")

        # Wait for HubSpot to validate OTP and redirect
        log("Waiting for post-OTP redirect (5s)...")
        time.sleep(5)

        # Check for remember-me button
        try:
            remember_me = page.ele('xpath://button[@data-test-id="2fa-remember-me-button"]', timeout=2)
            if remember_me:
                log("Clicking 'remember me' button")
                remember_me.click()
                time.sleep(1)
        except BaseException:
            pass

    # Final success check
    log("Checking final URL...")
    time.sleep(3)
    final_url = page.url
    log(f"Final URL: {final_url}")

    if "app.hubspot.com" in final_url and "login" not in final_url.lower():
        print("[SUCCESS] Login successful!", flush=True)
        page.quit()
        sys.exit(0)
    else:
        err(f"Login failed — still on login/auth page: {final_url}")
        page.quit()
        sys.exit(1)

except SystemExit:
    # Re-raise sys.exit() calls so exit codes propagate correctly
    raise
except BaseException as e:
    # Catch EVERYTHING else — DrissionPage internal crashes, segfaults in CDP wrapper, etc.
    err(f"Unhandled crash: {type(e).__name__}: {e}")
    err(traceback.format_exc())
    try:
        page.quit()
    except BaseException:
        pass
    sys.exit(1)
