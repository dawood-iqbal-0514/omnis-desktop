from DrissionPage import ChromiumOptions, ChromiumPage
from DrissionPage.common import Keys
import time
import os
import sys
import json
import traceback
from pathlib import Path

SCRIPT_DIR = Path(__file__).parent.absolute()
COOKIE_FILE = SCRIPT_DIR / "hs_cookies.json"

# Cookies needed for internal API calls (lists, workflows, etc.)
REQUIRED_COOKIES = {
    "hubspotapi-csrf",
    "csrf.app",
    "hubspotutk",
    "hs_login_email",
    "hs_login_metadata",
    "hubspotapi-prefs",
    "__hs_cookie_cat_pref",
}


def err(msg):
    """Print to stderr so Node.js error parser picks it up."""
    print(f"ERROR: {msg}", file=sys.stderr, flush=True)


def extract_and_save_cookies(page, portal_url=None):
    """
    Extract session cookies from the browser after login and save to hs_cookies.json.
    These cookies are used by API-based automation scripts (ActiveList, Workflows, etc.)
    so they don't need to launch a browser.
    portal_url can be either a portal ID string or a URL containing the portal ID.
    """
    try:
        cookies_list = page.cookies()
        cookies_dict = {}

        for cookie in cookies_list:
            name = cookie.get("name", "")
            value = cookie.get("value", "")
            domain = cookie.get("domain", "")

            # Only capture hubspot.com cookies
            if "hubspot" in domain and name and value:
                cookies_dict[name] = value

        if not cookies_dict:
            print("[Cookies] Warning: No HubSpot cookies captured", file=sys.stderr)
            return

        # Ensure critical cookies are present
        has_csrf = "hubspotapi-csrf" in cookies_dict or "csrf.app" in cookies_dict
        if not has_csrf:
            print("[Cookies] Warning: CSRF token not found in cookies", file=sys.stderr)

        # Save portal ID (can be passed as direct ID or URL)
        if portal_url:
            import re
            if re.match(r'^\d{5,}$', str(portal_url)):
                cookies_dict["_omnis_portal_id"] = str(portal_url)
            else:
                match = re.search(r'/(\d{5,})(?:/|$|\?)', str(portal_url))
                if match:
                    cookies_dict["_omnis_portal_id"] = match.group(1)

        # Save to file
        with open(COOKIE_FILE, "w") as f:
            json.dump(cookies_dict, f, indent=2)

        print(f"[Cookies] Saved {len(cookies_dict)} cookies to {COOKIE_FILE.name}", flush=True)

    except Exception as e:
        print(f"[Cookies] Warning: Failed to extract cookies: {e}", file=sys.stderr)


try:
    email = os.getenv('HUBSPOT_EMAIL', '')
    password = os.getenv('HUBSPOT_PASSWORD', '')

    if not email or not password:
        err("HUBSPOT_EMAIL and HUBSPOT_PASSWORD environment variables are required")
        sys.exit(1)

    profile_path_str = os.getenv('HUBSPOT_PROFILE_PATH')
    if not profile_path_str:
        err("HUBSPOT_PROFILE_PATH environment variable is required")
        sys.exit(1)

    options = ChromiumOptions()
    options.set_paths(user_data_path=str(profile_path_str))
    options.auto_port()

    page = ChromiumPage(options)
    time.sleep(0.5)

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

    # Poll for 2FA/confirm redirect
    two_fa_appeared = False
    for i in range(15):
        time.sleep(1)
        current_url = page.url
        if (current_url.startswith("https://app.hubspot.com/login/two-factor")
                or current_url.startswith("https://app.hubspot.com/login/confirm-to-login")):
            two_fa_appeared = True
            time.sleep(3)  # Let the page fully render
            break
        if "app.hubspot.com" in current_url and "login" not in current_url.lower():
            break

    if two_fa_appeared:
        # Capture the instruction text HubSpot shows above the code input
        page_message = ""
        try:
            for tag in ['tag:h1', 'tag:h2', 'tag:h3']:
                heading = page.ele(tag, timeout=1)
                if heading and heading.text.strip():
                    page_message = heading.text.strip()
                    break
            paragraphs = page.eles('tag:p')
            for p in paragraphs:
                text = p.text.strip()
                if text and len(text) > 10 and 'cookie' not in text.lower():
                    if page_message:
                        page_message += "\n" + text
                    else:
                        page_message = text
                    break
        except BaseException:
            pass

        # Extract portal ID from 2FA URL (e.g. loginPortalId=50845045)
        import re as _re
        _2fa_url = page.url
        _portal_match = _re.search(r'loginPortalId=(\d+)', _2fa_url)
        if _portal_match:
            _early_portal_id = _portal_match.group(1)
            print(f"[Login] Got portal ID from 2FA URL: {_early_portal_id}", flush=True)
        else:
            _early_portal_id = None

        # Signal Node.js — include the page message after the marker
        print(f"[2FA_REQUEST] {page_message or 'Enter the verification code'}", flush=True)
        sys.stdout.flush()

        otp = sys.stdin.readline().strip()

        if not otp:
            err("No 2FA token provided — stdin returned empty string")
            page.quit()
            sys.exit(1)

        # Dismiss cookie consent banner if present (it can block clicks)
        try:
            cookie_decline = page.ele('#hs-eu-decline-button', timeout=2)
            if cookie_decline:
                cookie_decline.click()
                time.sleep(0.5)
        except BaseException:
            pass

        # Find OTP input by its exact ID
        otp_input = None
        try:
            otp_input = page.ele('#codeEntry', timeout=5)
        except BaseException:
            pass

        if not otp_input:
            err("Could not find OTP input #codeEntry")
            page.quit()
            sys.exit(1)

        otp_input.click()
        time.sleep(0.2)
        otp_input.input(otp)

        # Click the Continue button
        time.sleep(0.5)
        continue_btn = None
        try:
            continue_btn = page.ele('xpath://button[@type="submit"]', timeout=3)
        except BaseException:
            pass

        if continue_btn:
            continue_btn.click()
        else:
            otp_input.input(Keys.ENTER)

        # Wait for HubSpot to validate OTP and redirect
        time.sleep(5)

        # Check for remember-me button
        try:
            remember_me = page.ele('xpath://button[@data-test-id="2fa-remember-me-button"]', timeout=2)
            if remember_me:
                remember_me.click()
                time.sleep(1)
        except BaseException:
            pass

    # Final success check
    time.sleep(3)
    final_url = page.url

    if "app.hubspot.com" in final_url and "login" not in final_url.lower():
        import re as _re

        # Use portal ID captured from 2FA URL if available
        portal_id = _early_portal_id if '_early_portal_id' in dir() else None

        # Fallback: extract from current URL (after login redirect)
        if not portal_id:
            match = _re.search(r'/(\d{5,})(?:/|$|\?)', final_url)
            if match:
                portal_id = match.group(1)
                print(f"[Login] Got portal ID from redirect URL: {portal_id}", flush=True)

        # Fallback: navigate to /contacts which always has portal ID in URL
        if not portal_id:
            page.get("https://app.hubspot.com/contacts")
            time.sleep(5)
            match = _re.search(r'/(\d{5,})(?:/|$|\?)', page.url)
            if match:
                portal_id = match.group(1)
                print(f"[Login] Got portal ID from contacts URL: {portal_id}", flush=True)

        if not portal_id:
            print("[Login] WARNING: Could not detect portal ID from any method", file=sys.stderr, flush=True)

        if portal_id:
            print(f"[Cookies] Captured portal ID: {portal_id}", flush=True)

        # Extract and save session cookies + portal ID for API-based scripts
        extract_and_save_cookies(page, portal_url=portal_id)
        print("[SUCCESS] Login successful!", flush=True)
        page.quit()
        sys.exit(0)
    else:
        err(f"Login failed — still on login/auth page: {final_url}")
        page.quit()
        sys.exit(1)

except SystemExit:
    raise
except BaseException as e:
    err(f"Unhandled crash: {type(e).__name__}: {e}")
    err(traceback.format_exc())
    try:
        page.quit()
    except BaseException:
        pass
    sys.exit(1)
