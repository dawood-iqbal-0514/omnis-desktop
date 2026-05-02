"""
GHL (GoHighLevel) Login Script — DrissionPage
Automated login with 2FA support.

Communication markers (read by loginScriptExecutor.js):
  [2FA_REQUEST] <message>   — 2FA needed, message shown to user
  [ERROR] <message>         — login failed
  [SUCCESS] <message>       — login succeeded

Environment variables:
  GHL_EMAIL         — GHL account email
  GHL_PASSWORD      — GHL account password
  GHL_LOCATION_ID   — GHL sub-account / location ID
  GHL_PROFILE_PATH  — persistent Chrome profile directory
"""

import os
import sys
import json
import time
from pathlib import Path

SCRIPT_DIR = Path(__file__).parent.resolve()
COOKIE_FILE = SCRIPT_DIR / "ghl_cookies.json"

GHL_LOGIN_URL = "https://app.gohighlevel.com/"


# ─── Helpers ──────────────────────────────────────────────────────────────────

def err(msg):
    print(f"[ERROR] {msg}", file=sys.stderr, flush=True)


def extract_and_save_cookies(page, location_id=None):
    """Extract GHL-related cookies and save to JSON."""
    try:
        cookies_list = page.cookies()
        cookies_dict = {}
        for cookie in cookies_list:
            name = cookie.get("name", "")
            value = cookie.get("value", "")
            domain = cookie.get("domain", "")
            if "gohighlevel" in domain or "highlevel" in domain or "leadconnector" in domain:
                if name and value:
                    cookies_dict[name] = value
        if location_id:
            cookies_dict["_omnis_location_id"] = location_id
        with open(COOKIE_FILE, "w") as f:
            json.dump(cookies_dict, f, indent=2)
        print(f"[Cookies] Saved {len(cookies_dict)} cookies to {COOKIE_FILE.name}", flush=True)
    except Exception as e:
        print(f"[Cookies] Warning: Could not save cookies: {e}", flush=True)


def is_logged_in(url, location_id):
    """Check if the current URL indicates a logged-in state."""
    lower = url.lower()
    if "login" in lower or "sign" in lower or "/oauth" in lower:
        return False
    if "?url=" in url:
        return False
    if location_id and f"/location/{location_id}" in url:
        return True
    if "dashboard" in lower or "/location/" in lower:
        return True
    return False


def extract_page_message(page):
    """Extract heading and paragraph text from the current page for 2FA prompt."""
    parts = []
    for tag in ["h1", "h2", "h3"]:
        try:
            el = page.ele(f"css:{tag}", timeout=1)
            if el and el.text.strip():
                parts.append(el.text.strip())
                break
        except Exception:
            pass
    try:
        p = page.ele("css:p", timeout=1)
        if p and p.text.strip():
            parts.append(p.text.strip())
    except Exception:
        pass
    return " — ".join(parts) if parts else ""


# ─── Main ─────────────────────────────────────────────────────────────────────

def main():
    email = os.getenv("GHL_EMAIL", "").strip()
    password = os.getenv("GHL_PASSWORD", "").strip()
    location_id = os.getenv("GHL_LOCATION_ID", "").strip()
    profile_path_str = os.getenv("GHL_PROFILE_PATH", "").strip()

    if not email or not password:
        err("GHL_EMAIL and GHL_PASSWORD are required")
        sys.exit(1)

    # ── Launch browser ────────────────────────────────────────────────────────
    try:
        from DrissionPage import ChromiumPage, ChromiumOptions

        options = ChromiumOptions()
        if profile_path_str:
            profile_path = Path(profile_path_str)
            profile_path.mkdir(parents=True, exist_ok=True)
            options.set_paths(user_data_path=str(profile_path))
        options.auto_port()

        print("[Browser] Launching Chrome...", flush=True)
        page = ChromiumPage(options)
    except Exception as e:
        err(f"Failed to launch browser: {e}")
        sys.exit(1)

    try:
        # ── Navigate to GHL ──────────────────────────────────────────────────
        print(f"[Navigate] Opening {GHL_LOGIN_URL}", flush=True)
        page.get(GHL_LOGIN_URL)
        time.sleep(3)

        # ── Check if already logged in ───────────────────────────────────────
        if is_logged_in(page.url, location_id):
            print("[Login] Already logged in!", flush=True)
            extract_and_save_cookies(page, location_id)
            print("[SUCCESS] Already logged in!", flush=True)
            page.quit()
            sys.exit(0)

        # ── Fill email ───────────────────────────────────────────────────────
        print("[Login] Filling email...", flush=True)
        email_input = None
        for selector in [
            'xpath://input[@type="email"]',
            'xpath://input[@name="email"]',
            'xpath://input[contains(@placeholder,"email")]',
            'css:input[type="email"]',
        ]:
            try:
                email_input = page.ele(selector, timeout=3)
                if email_input:
                    break
            except Exception:
                pass

        if not email_input:
            err("Could not find email input field on GHL login page")
            page.quit()
            sys.exit(1)

        email_input.clear()
        email_input.input(email)
        time.sleep(1)

        # ── Fill password ────────────────────────────────────────────────────
        print("[Login] Filling password...", flush=True)
        password_input = None
        for selector in [
            'xpath://input[@type="password"]',
            'xpath://input[@name="password"]',
            'css:input[type="password"]',
        ]:
            try:
                password_input = page.ele(selector, timeout=3)
                if password_input:
                    break
            except Exception:
                pass

        if not password_input:
            # Maybe password is on the next page — click continue/next first
            try:
                submit_btn = page.ele('xpath://button[@type="submit"]', timeout=3)
                if submit_btn:
                    submit_btn.click()
                    time.sleep(3)
                # Try finding password again
                for selector in [
                    'xpath://input[@type="password"]',
                    'css:input[type="password"]',
                ]:
                    try:
                        password_input = page.ele(selector, timeout=5)
                        if password_input:
                            break
                    except Exception:
                        pass
            except Exception:
                pass

        if not password_input:
            err("Could not find password input field on GHL login page")
            page.quit()
            sys.exit(1)

        password_input.clear()
        password_input.input(password)
        time.sleep(1)

        # ── Click login / submit ─────────────────────────────────────────────
        print("[Login] Submitting...", flush=True)
        submit_btn = None
        for selector in [
            'xpath://button[@type="submit"]',
            'xpath://button[contains(text(),"Sign")]',
            'xpath://button[contains(text(),"Log")]',
            'css:button[type="submit"]',
        ]:
            try:
                submit_btn = page.ele(selector, timeout=3)
                if submit_btn:
                    break
            except Exception:
                pass

        if submit_btn:
            submit_btn.click()
        else:
            # Fallback: press Enter in password field
            from DrissionPage.common import Keys
            password_input.input(Keys.ENTER)

        time.sleep(5)

        # ── Detect 2FA ───────────────────────────────────────────────────────
        two_fa_detected = False
        for _ in range(15):
            current_url = page.url.lower()

            # URL-based 2FA detection
            if any(pattern in current_url for pattern in ["two-factor", "2fa", "verify", "otp", "mfa"]):
                two_fa_detected = True
                break

            # Element-based 2FA detection
            try:
                otp_input = page.ele(
                    'xpath://input[@type="tel" or @type="number" or '
                    'contains(@placeholder,"code") or contains(@placeholder,"otp") or '
                    'contains(@placeholder,"verification") or contains(@name,"otp") or '
                    'contains(@name,"code")]',
                    timeout=1,
                )
                if otp_input:
                    two_fa_detected = True
                    break
            except Exception:
                pass

            # Already logged in?
            if is_logged_in(page.url, location_id):
                break

            time.sleep(1)

        # ── Handle 2FA ───────────────────────────────────────────────────────
        if two_fa_detected:
            time.sleep(2)
            page_message = extract_page_message(page)
            print(f"[2FA_REQUEST] {page_message or 'Enter the verification code'}", flush=True)
            sys.stdout.flush()

            # Block until user provides token via stdin
            otp = sys.stdin.readline().strip()
            if not otp:
                err("No 2FA token provided")
                page.quit()
                sys.exit(1)

            print(f"[2FA] Submitting code...", flush=True)

            # Find OTP input
            otp_input = None
            for selector in [
                'xpath://input[@type="tel"]',
                'xpath://input[@type="number"]',
                'xpath://input[contains(@placeholder,"code")]',
                'xpath://input[contains(@placeholder,"otp")]',
                'xpath://input[contains(@placeholder,"verification")]',
                'xpath://input[contains(@name,"otp")]',
                'xpath://input[contains(@name,"code")]',
            ]:
                try:
                    otp_input = page.ele(selector, timeout=2)
                    if otp_input:
                        break
                except Exception:
                    pass

            if otp_input:
                otp_input.clear()
                otp_input.input(otp)
                time.sleep(1)

                # Click verify / submit
                verify_btn = None
                for selector in [
                    'xpath://button[@type="submit"]',
                    'xpath://button[contains(text(),"Verify")]',
                    'xpath://button[contains(text(),"Confirm")]',
                    'xpath://button[contains(text(),"Submit")]',
                ]:
                    try:
                        verify_btn = page.ele(selector, timeout=2)
                        if verify_btn:
                            break
                    except Exception:
                        pass

                if verify_btn:
                    verify_btn.click()
                else:
                    from DrissionPage.common import Keys
                    otp_input.input(Keys.ENTER)

                time.sleep(5)
            else:
                err("Could not find OTP input field")
                page.quit()
                sys.exit(1)

        # ── Verify login success ─────────────────────────────────────────────
        # Wait a bit and poll for redirect
        for _ in range(10):
            if is_logged_in(page.url, location_id):
                break
            time.sleep(2)

        final_url = page.url
        if is_logged_in(final_url, location_id):
            # Navigate to the specific location if location_id provided
            if location_id and f"/location/{location_id}" not in final_url:
                target = f"https://app.gohighlevel.com/v2/location/{location_id}/dashboard"
                print(f"[Navigate] Going to location: {target}", flush=True)
                page.get(target)
                time.sleep(3)

            extract_and_save_cookies(page, location_id)
            print("[SUCCESS] Login successful!", flush=True)
            page.quit()
            sys.exit(0)
        else:
            err(f"Login failed — still on: {final_url}")
            page.quit()
            sys.exit(1)

    except Exception as e:
        err(f"Login error: {e}")
        try:
            page.quit()
        except Exception:
            pass
        sys.exit(1)


if __name__ == "__main__":
    main()
