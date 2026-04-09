"""
HubSpot Active List Creator — Omnis Reach Automation
=====================================================
Creates HubSpot Active (Dynamic) lists via HubSpot's internal API.
Supports natural language → filter conversion.

Execution Flow:
  1. Read parameters from AUTOMATION_PARAMS env var (set by Node.js)
  2. Load session cookies (hs_cookies.json or Chrome profile extraction)
  3. Auto-detect portal ID from session
  4. Convert natural-language description to HubSpot filterBranch
  5. Create the active list via internal API
  6. Report result via stdout markers

Communication with Node.js:
  - stdout [HUBSPOT_AI_QUESTION]<text>  → pauses script, shows modal in UI
  - stdin  <user response>              → resumes script with user's answer
  - stdout [SUCCESS]<json>              → signals successful completion
  - stdout [ERROR]<message>             → signals failure

Parameters (via AUTOMATION_PARAMS env var as JSON):
  - name          : List name
  - description   : Natural language description (auto-converted to filters)
  - objectType    : "0-1" (Contacts), "0-2" (Companies), "0-3" (Deals)
  - filterBranch  : Explicit filter JSON (overrides description)
"""

import os
import sys
import json
import re
import time
import requests
from pathlib import Path
from datetime import datetime, timedelta


# ─── Config ───────────────────────────────────────────────────────────────────

SCRIPT_DIR   = Path(__file__).parent.absolute()
COOKIE_FILE  = SCRIPT_DIR / "hs_cookies.json"
BASE_URL     = "https://app.hubspot.com"


# ─── Known HubSpot property → operationType mapping ──────────────────────────

PROPERTY_TYPES = {
    # Contact info
    "email":               "MULTISTRING",
    "firstname":           "MULTISTRING",
    "lastname":            "MULTISTRING",
    "phone":               "MULTISTRING",
    "company":             "MULTISTRING",
    "jobtitle":            "MULTISTRING",
    "city":                "MULTISTRING",
    "state":               "MULTISTRING",
    "country":             "MULTISTRING",
    "zip":                 "MULTISTRING",
    "website":             "MULTISTRING",
    # Lifecycle / status
    "lifecyclestage":      "ENUMERATION",
    "hs_lead_status":      "ENUMERATION",
    "hs_persona":          "ENUMERATION",
    # Email engagement
    "hs_email_open":       "NUMBER",
    "hs_email_click":      "NUMBER",
    "hs_email_bounce":     "NUMBER",
    "num_contacted_notes": "NUMBER",
    "hs_email_open_count": "NUMBER",
    "hs_email_click_count":"NUMBER",
    # Dates
    "hs_email_last_open_date":  "TIME_RANGED",
    "hs_email_last_click_date": "TIME_RANGED",
    "createdate":               "TIME_RANGED",
    "lastmodifieddate":         "TIME_RANGED",
    "closedate":                "TIME_RANGED",
    "hs_last_sales_activity_timestamp": "TIME_RANGED",
    # Deal
    "amount":              "NUMBER",
    "dealstage":           "ENUMERATION",
}


# ═════════════════════════════════════════════════════════════════════════════
#  NATURAL LANGUAGE → FILTER CONVERSION
# ═════════════════════════════════════════════════════════════════════════════

def nl_to_filter_branch(description, object_type="0-1"):
    """
    Convert a plain-English description into a HubSpot filterBranch.
    Supports "OR" to separate groups; conditions within a group are AND.
    """
    desc_lower = description.lower()
    groups = re.split(r'\bor\b', desc_lower)

    filter_branches = []
    for group in groups:
        group = group.strip()
        filters = _parse_conditions(group, object_type)
        if filters:
            filter_branches.append({
                "filterBranchType": "AND",
                "filterBranches": [],
                "filters": filters
            })

    return {
        "filterBranchType": "OR",
        "filters": [],
        "filterBranches": filter_branches if filter_branches else [_default_filter()]
    }


def _parse_conditions(text, object_type="0-1"):
    """Parse a single AND-group of conditions from natural language."""
    filters = []

    # ── Email opened in last N days ──
    m = re.search(r'open(?:ed)?\s+(?:an?\s+)?email\s+in\s+(?:the\s+)?last\s+(\d+)\s+days?', text)
    if m:
        filters.append(_time_range_filter("hs_email_last_open_date", int(m.group(1))))

    # ── Email clicked in last N days ──
    m = re.search(r'click(?:ed)?\s+(?:an?\s+)?email\s+in\s+(?:the\s+)?last\s+(\d+)\s+days?', text)
    if m:
        filters.append(_time_range_filter("hs_email_last_click_date", int(m.group(1))))

    # ── Opened email (no timeframe) ──
    if re.search(r'open(?:ed)?\s+(?:an?\s+)?email', text) and not any(f['property'] == 'hs_email_last_open_date' for f in filters):
        filters.append(_number_filter("hs_email_open_count", "IS_GREATER_THAN", 0))

    # ── Clicked email (no timeframe) ──
    if re.search(r'click(?:ed)?\s+(?:an?\s+)?email', text) and not any(f['property'] == 'hs_email_last_click_date' for f in filters):
        filters.append(_number_filter("hs_email_click_count", "IS_GREATER_THAN", 0))

    # ── Created in last N days ──
    m = re.search(r'creat(?:ed)?\s+in\s+(?:the\s+)?last\s+(\d+)\s+days?', text)
    if m:
        filters.append(_time_range_filter("createdate", int(m.group(1))))

    # ── Modified in last N days ──
    m = re.search(r'(?:modif|updat)(?:ied|ed)?\s+in\s+(?:the\s+)?last\s+(\d+)\s+days?', text)
    if m:
        filters.append(_time_range_filter("lastmodifieddate", int(m.group(1))))

    # ── City ──
    m = re.search(r'(?:from|in|city(?:\s+is)?)\s+([A-Za-z\s]+?)(?:\s+who|\s+and|\s+with|$)', text)
    if m and not any(kw in text[:m.start()] for kw in ['email', 'click', 'open', 'stage', 'lifecycle']):
        city = m.group(1).strip().title()
        if len(city) > 1:
            filters.append(_string_filter("city", "IS_ANY_OF", [city]))

    # ── Country ──
    m = re.search(r'country\s+(?:is\s+)?([A-Za-z\s]+?)(?:\s+who|\s+and|\s+with|$)', text)
    if m:
        filters.append(_string_filter("country", "IS_ANY_OF", [m.group(1).strip().title()]))

    # ── State / Region ──
    m = re.search(r'state\s+(?:is\s+)?([A-Za-z\s]+?)(?:\s+who|\s+and|\s+with|$)', text)
    if m:
        filters.append(_string_filter("state", "IS_ANY_OF", [m.group(1).strip().title()]))

    # ── Lead status (check BEFORE lifecycle stage to avoid "lead" keyword collision) ──
    has_lead_status = False
    status_map = {
        "new": "NEW", "open": "OPEN", "in progress": "IN_PROGRESS",
        "open deal": "OPEN_DEAL", "unqualified": "UNQUALIFIED",
        "attempted": "ATTEMPTED_TO_CONTACT", "connected": "CONNECTED",
        "bad timing": "BAD_TIMING"
    }
    for keyword, value in status_map.items():
        if f"status is {keyword}" in text or f"lead status {keyword}" in text:
            filters.append(_enum_filter("hs_lead_status", "IS_ANY_OF", [value]))
            has_lead_status = True
            break

    # ── Lifecycle stage (use word boundary to avoid matching "lead" inside "lead status") ──
    if not has_lead_status or "lifecycle" in text or "stage" in text:
        stage_map = {
            "marketing qualified": "marketingqualifiedlead",
            "sales qualified": "salesqualifiedlead",
            "mql": "marketingqualifiedlead",
            "sql": "salesqualifiedlead",
            "subscriber": "subscriber",
            "opportunity": "opportunity",
            "customer": "customer",
            "evangelist": "evangelist",
            "other": "other",
            "lead": "lead",
        }
        for keyword, value in stage_map.items():
            pattern = r'(?:lifecycle\s+stage|stage)\s+(?:is\s+)?' + re.escape(keyword) + r'\b'
            if re.search(pattern, text):
                filters.append(_enum_filter("lifecyclestage", "IS_ANY_OF", [value]))
                break

    # ── Email address contains ──
    m = re.search(r'email\s+(?:address\s+)?contains?\s+["\']?([^\s"\']+)["\']?', text)
    if m:
        filters.append(_string_filter("email", "CONTAINS", [m.group(1)]))

    # ── Job title contains ──
    m = re.search(r'job\s+title\s+(?:contains?|is)\s+["\']?([^"\']+?)["\']?(?:\s+and|\s+with|$)', text)
    if m:
        filters.append(_string_filter("jobtitle", "CONTAINS", [m.group(1).strip()]))

    # ── Company name contains ──
    m = re.search(r'company\s+(?:name\s+)?(?:contains?|is)\s+["\']?([^"\']+?)["\']?(?:\s+and|\s+with|$)', text)
    if m:
        filters.append(_string_filter("company", "CONTAINS", [m.group(1).strip()]))

    # ── First / last name ──
    m = re.search(r'first\s+name\s+(?:is|=)\s+["\']?([^"\']+?)["\']?(?:\s|$)', text)
    if m:
        filters.append(_string_filter("firstname", "IS_ANY_OF", [m.group(1).strip().title()]))

    m = re.search(r'last\s+name\s+(?:is|=)\s+["\']?([^"\']+?)["\']?(?:\s|$)', text)
    if m:
        filters.append(_string_filter("lastname", "IS_ANY_OF", [m.group(1).strip().title()]))

    # ── Deal amount greater/less than (only for Deals: 0-3) ──
    if object_type == "0-3":
        m = re.search(r'amount\s+(?:is\s+)?(?:greater|more|above|over)\s+(?:than\s+)?(\d+)', text)
        if m:
            filters.append(_number_filter("amount", "IS_GREATER_THAN", int(m.group(1))))

        m = re.search(r'amount\s+(?:is\s+)?(?:less|under|below)\s+(?:than\s+)?(\d+)', text)
        if m:
            filters.append(_number_filter("amount", "IS_LESS_THAN", int(m.group(1))))

    return filters


# ─── Filter builders ──────────────────────────────────────────────────────────

def _string_filter(prop, operator, values):
    return {
        "filterType": "PROPERTY",
        "property": prop,
        "operation": {
            "operationType": "MULTISTRING",
            "operator": operator,
            "values": values,
            "includeObjectsWithNoValueSet": False
        }
    }

def _enum_filter(prop, operator, values):
    return {
        "filterType": "PROPERTY",
        "property": prop,
        "operation": {
            "operationType": "ENUMERATION",
            "operator": operator,
            "values": values,
            "includeObjectsWithNoValueSet": False
        }
    }

def _number_filter(prop, operator, value):
    return {
        "filterType": "PROPERTY",
        "property": prop,
        "operation": {
            "operationType": "NUMBER",
            "operator": operator,
            "value": value,
            "includeObjectsWithNoValueSet": False
        }
    }

def _time_range_filter(prop, days_back):
    return {
        "filterType": "PROPERTY",
        "property": prop,
        "operation": {
            "operationType": "TIME_RANGED",
            "operator": "IS_BETWEEN",
            "propertyParser": "UPDATED_AT",
            "lowerBoundEndpointBehavior": "INCLUSIVE",
            "upperBoundEndpointBehavior": "INCLUSIVE",
            "includeObjectsWithNoValueSet": False,
            "lowerBoundTimePoint": {
                "timeType": "INDEXED",
                "timezoneSource": "CUSTOM",
                "zoneId": "US/Eastern",
                "indexReference": {
                    "referenceType": "TODAY"
                },
                "offset": {
                    "days": -days_back
                }
            },
            "upperBoundTimePoint": {
                "timeType": "INDEXED",
                "timezoneSource": "CUSTOM",
                "zoneId": "US/Eastern",
                "indexReference": {
                    "referenceType": "NOW"
                }
            }
        }
    }

def _default_filter():
    return {
        "filterBranchType": "AND",
        "filterBranches": [],
        "filters": [_string_filter("email", "CONTAINS", ["@"])]
    }


# ═════════════════════════════════════════════════════════════════════════════
#  HUBSPOT INTERNAL API CLIENT
# ═════════════════════════════════════════════════════════════════════════════

class HubSpotListsAPI:
    """Handles all communication with HubSpot's internal lists API."""

    def __init__(self, portal_id=None, email=None, password=None):
        self.session = requests.Session()
        self.portal_id = portal_id
        self.email = email
        self.password = password
        self._load_cookies()

        # Auto-detect portal ID if not provided
        if not self.portal_id:
            self.portal_id = self._detect_portal_id()

    # ── Cookie management ──────────────────────────────────────────────────

    def _load_cookies(self):
        """Load cookies from hs_cookies.json."""
        cookie_path = COOKIE_FILE

        # Also check AUTOMATION_PARAMS for a custom cookie path
        params = _get_params()
        if params.get("cookiePath"):
            cookie_path = Path(params["cookiePath"])

        if not cookie_path.exists():
            print(f"[ERROR] Cookie file not found: {cookie_path}", file=sys.stderr)
            print("[ERROR] No saved HubSpot session found. Please log into HubSpot first using the 'Connect' button in Platform Settings. The login process automatically saves session cookies for API scripts.", file=sys.stderr)
            sys.exit(1)

        with open(cookie_path, "r") as f:
            cookies = json.load(f)

        for name, value in cookies.items():
            self.session.cookies.set(name, value, domain="app.hubspot.com")

        print(f"[Auth] Loaded {len(cookies)} cookies.")

    def _save_cookies(self):
        """Persist refreshed cookies back to file."""
        cookies = {c.name: c.value for c in self.session.cookies}
        with open(COOKIE_FILE, "w") as f:
            json.dump(cookies, f, indent=2)

    def _csrf(self):
        return self.session.cookies.get("hubspotapi-csrf", "")

    def _headers(self):
        return {
            "X-HubSpot-CSRF-hubspotapi": self._csrf(),
            "X-HS-Referer": f"{BASE_URL}/contacts/{self.portal_id}/objectLists",
            "Referer": f"{BASE_URL}/contacts/{self.portal_id}/objectLists",
            "User-Agent": "Mozilla/5.0",
        }

    def _default_params(self, extra=None):
        p = {
            "portalId": self.portal_id,
            "clienttimeout": "14000",
            "hs_static_app": "segments-ui",
            "hs_static_app_version": "2.55060"
        }
        if extra:
            p.update(extra)
        return p

    # ── Portal auto-detection ──────────────────────────────────────────────

    def _detect_portal_id(self):
        """Auto-detect portal ID from saved cookies or session."""
        # Method 1: Read from _omnis_portal_id saved by login script
        portal = self.session.cookies.get("_omnis_portal_id")
        if portal:
            print(f"[Auth] Detected portal ID from saved session: {portal}")
            # Remove it from session cookies (it's not a real cookie)
            self.session.cookies.set("_omnis_portal_id", None)
            return portal

        # Method 2: Ask user
        print("[HUBSPOT_AI_QUESTION]Could not detect your HubSpot portal ID. Please provide your portal ID (found in HubSpot URL after /contacts/):", flush=True)
        sys.stdout.flush()
        portal_id = sys.stdin.readline().strip()
        return portal_id

    # ── Auto-relogin ─────────────────────────────────────────────────────

    def _relogin(self):
        """Programmatically re-login when session expires."""
        if not self.email or not self.password:
            print("[Auth] Session expired and no credentials for auto-refresh.", file=sys.stderr)
            print("[ERROR] HubSpot session expired. Please log in again via the login automation.", file=sys.stderr)
            sys.exit(1)
        print("[Auth] Session expired - re-logging in...")
        self.session.get(f"{BASE_URL}/login")
        self.session.post(
            f"{BASE_URL}/login",
            data={"email": self.email, "password": self.password},
            allow_redirects=True
        )
        self._save_cookies()
        print("[Auth] Re-login successful.")

    # ── API request helper ─────────────────────────────────────────────────

    def _request(self, method, path, retry=True, **kwargs):
        url = f"{BASE_URL}{path}"
        kwargs.setdefault("headers", {}).update(self._headers())
        if "params" not in kwargs:
            kwargs["params"] = self._default_params()

        resp = self.session.request(method, url, **kwargs)

        # Session expired — re-login and retry once
        if resp.status_code == 401 and retry:
            self._relogin()
            kwargs["headers"].update(self._headers())
            resp = self.session.request(method, url, **kwargs)

        return resp

    # ── List Operations ────────────────────────────────────────────────────

    def create_list(self, name, filter_branch, object_type="0-1"):
        """
        Create an active (DYNAMIC) list.

        Args:
            name:           List display name
            filter_branch:  HubSpot filterBranch dict
            object_type:    "0-1" = Contacts, "0-2" = Companies, "0-3" = Deals
        """
        payload = {
            "name": name,
            "objectTypeId": object_type,
            "processingType": "DYNAMIC",
            "filterBranch": filter_branch
        }

        resp = self._request("POST", "/api/crm/v3/lists", json=payload)

        if resp.status_code == 200:
            data = resp.json()
            lst = data.get("list", data)
            return {
                "success": True,
                "listId": lst.get("listId"),
                "name": lst.get("name"),
                "processingStatus": lst.get("processingStatus"),
                "createdAt": lst.get("createdAt"),
                "viewUrl": f"https://app.hubspot.com/contacts/{self.portal_id}/objectLists/{lst.get('listId')}/filters/edit"
            }
        else:
            error_text = resp.text[:500]
            return {
                "success": False,
                "error": f"Create failed ({resp.status_code}): {error_text}"
            }

    def get_list(self, list_id):
        """Get list details by ID."""
        resp = self._request("GET", f"/api/crm/v3/lists/{list_id}")
        if resp.status_code == 200:
            return resp.json().get("list", resp.json())
        resp.raise_for_status()

    def update_list_filters(self, list_id, filter_branch):
        """Update the filters on an existing list."""
        resp = self._request("PUT", f"/api/crm/v3/lists/{list_id}/update-list-filters",
                             json={"filterBranch": filter_branch})
        if resp.status_code == 200:
            return resp.json()
        resp.raise_for_status()

    def delete_list(self, list_id):
        """Delete a list by ID."""
        resp = self._request("DELETE", f"/api/crm/v3/lists/{list_id}")
        return resp.status_code == 204

    def find_list_by_name(self, name):
        """Search for a list by name."""
        resp = self._request("POST", "/api/crm/v3/lists/search",
                             json={"query": name, "count": 10, "offset": 0})
        if resp.status_code == 200:
            data = resp.json()
            for lst in data.get("lists", []):
                if lst.get("name", "").lower() == name.lower():
                    return lst
        return None


# ═════════════════════════════════════════════════════════════════════════════
#  PARAMETER HANDLING
# ═════════════════════════════════════════════════════════════════════════════

def _get_params():
    """Read parameters from AUTOMATION_PARAMS env var."""
    raw = os.environ.get("AUTOMATION_PARAMS", "{}")
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return {}


def _ask_user(question):
    """Ask user a question via the Omnis Reach UI (HUBSPOT_AI_QUESTION marker)."""
    print(f"[HUBSPOT_AI_QUESTION]{question}", flush=True)
    sys.stdout.flush()
    response = sys.stdin.readline().strip()
    return response


# ═════════════════════════════════════════════════════════════════════════════
#  MAIN EXECUTION
# ═════════════════════════════════════════════════════════════════════════════

def main():
    print("=" * 60)
    print(" HubSpot Active List Creator ".center(60))
    print("=" * 60)

    # ── Step 1: Read parameters ────────────────────────────────────────────
    params = _get_params()
    list_name    = params.get("name", "").strip()
    description  = params.get("description", "").strip()
    object_type  = params.get("objectType", "0-1")
    filter_branch = params.get("filterBranch")
    portal_id    = params.get("portalId")

    # ── Step 2: If missing params, ask user interactively ──────────────────
    if not description and not filter_branch:
        description = _ask_user(
            "What kind of active list would you like to create? "
            "Describe the contacts you want in natural language.\n\n"
            "Examples:\n"
            "- Contacts from New York who opened an email in the last 30 days\n"
            "- Leads with lifecycle stage customer\n"
            "- Contacts who clicked email in last 7 days OR lifecycle stage is lead\n"
            "- Company contains 'tech' and job title contains 'manager'"
        )
        if not description:
            print("[ERROR] No description provided. Aborting.")
            sys.exit(1)

    if not list_name:
        # Auto-generate name from description
        list_name = description[:60].strip().title()
        if len(description) > 60:
            list_name += "..."
        print(f"[Info] Auto-generated list name: '{list_name}'")

    # ── Step 3: Build filter branch ────────────────────────────────────────
    if not filter_branch and description:
        print(f"\n[Filters] Parsing: '{description}'")
        filter_branch = nl_to_filter_branch(description, object_type)

        total_filters = sum(
            len(b.get("filters", []))
            for b in filter_branch.get("filterBranches", [])
        )
        total_groups = len(filter_branch.get("filterBranches", []))
        print(f"[Filters] Generated {total_filters} filter(s) across {total_groups} group(s)")
        print(f"[Filters] {json.dumps(filter_branch, indent=2)}")

    if not filter_branch:
        filter_branch = {
            "filterBranchType": "OR",
            "filters": [],
            "filterBranches": [_default_filter()]
        }

    # ── Step 4: Initialize API client and create list ──────────────────────
    print(f"\n[API] Initializing HubSpot connection...")
    api = HubSpotListsAPI(portal_id=portal_id)

    print(f"[API] Creating active list: '{list_name}'")
    result = api.create_list(
        name=list_name,
        filter_branch=filter_branch,
        object_type=object_type
    )

    # ── Step 5: Report result ──────────────────────────────────────────────
    if result.get("success"):
        print(f"\n[OK] Active list created successfully!")
        print(f"   List ID     : {result['listId']}")
        print(f"   Name        : {result['name']}")
        print(f"   Status      : {result['processingStatus']}")
        print(f"   View in app : {result['viewUrl']}")
        print(f"\n[SUCCESS]{json.dumps(result)}")
    else:
        error_msg = result.get("error", "Unknown error")
        print(f"\n[FAIL] Failed to create list: {error_msg}", file=sys.stderr)
        print(f"[ERROR]{error_msg}")
        sys.exit(1)


if __name__ == "__main__":
    main()
