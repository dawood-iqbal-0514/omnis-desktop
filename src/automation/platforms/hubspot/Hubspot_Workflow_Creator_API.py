"""
HubSpot Workflow Creator (API) — Omnis Reach Automation
========================================================
Creates HubSpot workflows by conversing with HubSpot's AI Assistant via API.
No browser required — uses HubSpot's internal Chirp RPC + Ably Realtime REST API.

Execution Flow:
  1. Read workflow parameters from AUTOMATION_PARAMS env var (set by Node.js)
  2. Load session cookies from hs_cookies.json
  3. Auto-detect portal ID from session
  4. Create/get a Copilot chat thread via Chirp RPC
  5. Get an Ably auth token for the thread channel
  6. Send workflow creation request to HubSpot AI via Ably REST
  7. Poll for AI responses via Ably channel history
  8. Auto-answer AI questions from parameters, or ask user via modal
  9. Continue conversation until workflow is created or error

Communication with Node.js:
  - stdout [HUBSPOT_AI_QUESTION]<text>  → pauses script, shows modal in UI
  - stdin  <user response>              → resumes script with user's answer
  - stdout [SUCCESS]<json>              → signals successful completion
  - stdout [ERROR]<message>             → signals failure

Parameters (via AUTOMATION_PARAMS env var as JSON):
  - description   : What the workflow should do (required)
  - workflowName  : Name for the workflow (optional, auto-generated if missing)
  - trigger       : Trigger event (optional, e.g. "new_contact_created")
  - email         : Email recipient for email actions (optional)
  - subject       : Email subject (optional)
  - body          : Email body (optional)
"""

import os
import sys
import json
import re
import time
import uuid
import requests
from pathlib import Path
from datetime import datetime


# ─── Config ───────────────────────────────────────────────────────────────────

SCRIPT_DIR   = Path(__file__).parent.absolute()
COOKIE_FILE  = SCRIPT_DIR / "hs_cookies.json"
BASE_URL     = "https://app.hubspot.com"
CHIRP_BASE   = "/api/chirp-frontend-app/v1/gateway"
ABLY_BASE    = "https://hubspot-na1.realtime.ably.net"

MAX_CONVERSATION_TURNS = 15
POLL_INTERVAL          = 3      # seconds between history polls
POLL_MAX_WAIT          = 90     # max seconds to wait for a single AI response
HISTORY_LOOKBACK       = 10     # number of recent messages to fetch


# ═════════════════════════════════════════════════════════════════════════════
#  HUBSPOT COPILOT API CLIENT
# ═════════════════════════════════════════════════════════════════════════════

class HubSpotCopilotAPI:
    """Communicates with HubSpot's AI Assistant via Chirp RPC + Ably REST API."""

    def __init__(self, portal_id=None):
        self.session = requests.Session()
        self.portal_id = portal_id
        self.thread_id = None
        self.ably_channel_id = None
        self.ably_token = None
        self.client_id = f"omnis-{uuid.uuid4().hex[:12]}"
        self._load_cookies()

        if not self.portal_id:
            self.portal_id = self._detect_portal_id()

    # ── Cookie management (same pattern as ActiveList creator) ────────────

    def _load_cookies(self):
        """Load cookies from hs_cookies.json."""
        cookie_path = COOKIE_FILE
        params = _get_params()
        if params.get("cookiePath"):
            cookie_path = Path(params["cookiePath"])

        if not cookie_path.exists():
            print(f"[ERROR]No saved HubSpot session found. Please log into HubSpot first using the 'Connect' button in Platform Settings.")
            sys.exit(1)

        with open(cookie_path, "r") as f:
            cookies = json.load(f)

        for name, value in cookies.items():
            self.session.cookies.set(name, value, domain="app.hubspot.com")

        print(f"[Auth] Loaded {len(cookies)} cookies.")

    def _csrf(self):
        return self.session.cookies.get("hubspotapi-csrf", "")

    def _detect_portal_id(self):
        """Auto-detect portal ID from saved cookies."""
        portal = self.session.cookies.get("_omnis_portal_id")
        if portal:
            print(f"[Auth] Detected portal ID from saved session: {portal}")
            self.session.cookies.set("_omnis_portal_id", None)
            return portal

        print("[HUBSPOT_AI_QUESTION]Could not detect your HubSpot portal ID. Please provide your portal ID (found in HubSpot URL):", flush=True)
        sys.stdout.flush()
        return sys.stdin.readline().strip()

    # ── Chirp RPC Gateway ─────────────────────────────────────────────────

    def _chirp_headers(self):
        return {
            "X-HubSpot-CSRF-hubspotapi": self._csrf(),
            "Content-Type": "application/json",
            "Accept": "application/json",
            "User-Agent": "Mozilla/5.0",
            "Referer": f"{BASE_URL}/",
        }

    def _chirp_params(self):
        return {
            "portalId": self.portal_id,
            "clienttimeout": "14000",
            "hs_static_app": "chatspot-widget-ui",
            "hs_static_app_version": "1.20420",
        }

    def get_or_create_thread(self):
        """
        Get the latest chat thread or create a new one.
        Returns thread data with id and ablyChannelId.
        """
        url = f"{BASE_URL}{CHIRP_BASE}/com.hubspot.copilot.rpc.v2.CopilotThreadsService/getLatestOrCreateNew"
        resp = self.session.post(url, headers=self._chirp_headers(),
                                 params=self._chirp_params(), json={})

        if resp.status_code == 401:
            print("[ERROR]HubSpot session expired. Please log in again via the login automation.")
            sys.exit(1)

        if resp.status_code != 200:
            print(f"[ERROR]Failed to get/create thread ({resp.status_code}): {resp.text[:300]}")
            sys.exit(1)

        data = resp.json()
        thread = data.get("data", {}).get("thread", {})
        self.thread_id = thread.get("id")
        self.ably_channel_id = thread.get("ablyChannelId")

        if not self.thread_id or not self.ably_channel_id:
            print(f"[ERROR]Invalid thread response: missing id or ablyChannelId")
            sys.exit(1)

        print(f"[Thread] ID: {self.thread_id}, Channel: {self.ably_channel_id}")
        return thread

    def create_ably_token(self):
        """
        Create an Ably auth token for the thread channel.
        Requires threadId (integer) and clientId (string).
        """
        url = f"{BASE_URL}{CHIRP_BASE}/com.hubspot.copilot.rpc.CopilotChatService/createAuthToken"
        payload = {
            "clientId": self.client_id,
            "threadId": self.thread_id,
        }

        resp = self.session.post(url, headers=self._chirp_headers(),
                                 params=self._chirp_params(), json=payload)

        if resp.status_code != 200:
            print(f"[ERROR]Failed to create Ably token ({resp.status_code}): {resp.text[:300]}")
            sys.exit(1)

        data = resp.json()
        self.ably_token = data.get("data", {}).get("token")

        if not self.ably_token:
            print(f"[ERROR]No token in response: {json.dumps(data)[:300]}")
            sys.exit(1)

        print(f"[Auth] Ably token obtained (length: {len(self.ably_token)})")
        return self.ably_token

    def refresh_token(self):
        """Refresh the Ably token (tokens expire after some time)."""
        print("[Auth] Refreshing Ably token...")
        self.create_ably_token()

    # ── Ably REST API ─────────────────────────────────────────────────────

    def _ably_headers(self):
        return {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.ably_token}",
        }

    def _channel_url(self):
        channel_encoded = requests.utils.quote(self.ably_channel_id, safe="")
        return f"{ABLY_BASE}/channels/{channel_encoded}/messages"

    def send_message(self, message_text):
        """
        Send a chat message to HubSpot AI via Ably REST publish.
        """
        chirp_message = {
            "__typename": "com.hubspot.copilot.models.chat.ChatRequest",
            "hidden": False,
            "message": message_text,
            "type": "CHAT",
            "context": {
                "contextItems": [],
                "files": [],
                "clientType": "DESKTOP",
                "locale": "en-us",
                "clientSurface": "EMBEDDED",
                "pageContext": {
                    "title": "Workflows",
                    "url": f"https://app.hubspot.com/workflows/{self.portal_id}",
                    "sourceHostApp": "crm-index-ui",
                    "screenshotSupported": False,
                },
                "collabMode": False,
                "chirpToolFqcns": [],
                "additionalToolSets": [
                    "com.hubspot.composable.ui.tools.rpc.ComposableUiTools"
                ],
                "appSearchScope": {
                    "type": "SELECTED_APPS",
                    "includedApps": [],
                },
                "skipMemoryProcessing": False,
            },
            "messageTracking": {
                "isSavedPrompt": False,
                "isTemplatePrompt": False,
                "promptInputMethod": "TYPED",
                "interactionSource": "crm-index-ui",
            },
        }

        payload = {
            "name": "user_message",
            "data": json.dumps({
                "chirpMessageJson": json.dumps(chirp_message),
                "chirpFingerprint": self.client_id,
            }),
        }

        resp = requests.post(self._channel_url(), headers=self._ably_headers(),
                             json=payload, timeout=15)

        if resp.status_code == 401 or resp.status_code == 403:
            # Token expired, refresh and retry
            self.refresh_token()
            resp = requests.post(self._channel_url(), headers=self._ably_headers(),
                                 json=payload, timeout=15)

        if resp.status_code not in (200, 201):
            error = resp.text[:300]
            print(f"[ERROR]Failed to send message ({resp.status_code}): {error}")
            sys.exit(1)

        result = resp.json()
        print(f"[Ably] Message sent: {result.get('messageId', 'unknown')}")
        return result

    def poll_for_response(self, after_timestamp=None):
        """
        Poll Ably channel history for the AI response.
        Waits until a 'copilot_response_message_end' event appears.
        Returns the full response text.
        """
        start_time = time.time()
        last_delta_text = ""

        while time.time() - start_time < POLL_MAX_WAIT:
            try:
                # Fetch recent messages from channel history
                params = {
                    "limit": str(HISTORY_LOOKBACK),
                    "direction": "backwards",
                }
                resp = requests.get(self._channel_url(), headers=self._ably_headers(),
                                    params=params, timeout=15)

                if resp.status_code == 401 or resp.status_code == 403:
                    self.refresh_token()
                    resp = requests.get(self._channel_url(), headers=self._ably_headers(),
                                        params=params, timeout=15)

                if resp.status_code != 200:
                    print(f"[Ably] History poll error ({resp.status_code}), retrying...",
                          file=sys.stderr)
                    time.sleep(POLL_INTERVAL)
                    continue

                messages = resp.json()
                if not isinstance(messages, list):
                    time.sleep(POLL_INTERVAL)
                    continue

                # Look for copilot_response_message_end (final complete response)
                for msg in messages:
                    name = msg.get("name", "")
                    timestamp = msg.get("timestamp", 0)

                    # Skip messages from before our send
                    if after_timestamp and timestamp < after_timestamp:
                        continue

                    if name == "copilot_response_message_end":
                        return self._extract_response_text(msg)

                # Show streaming progress from deltas
                for msg in reversed(messages):
                    if msg.get("name") == "copilot_response_message_delta":
                        delta = msg.get("data", "")
                        if isinstance(delta, str) and delta != last_delta_text:
                            last_delta_text = delta

            except requests.exceptions.Timeout:
                pass
            except requests.exceptions.ConnectionError:
                print("[Ably] Connection error, retrying...", file=sys.stderr)

            time.sleep(POLL_INTERVAL)

        return None  # Timed out

    def _extract_response_text(self, end_message):
        """Extract the full response text from a copilot_response_message_end event."""
        try:
            data = end_message.get("data", "")

            # data can be a raw string from Ably history
            if isinstance(data, str):
                data = json.loads(data)

            # data may contain chirpMessageJson (nested JSON string)
            chirp_json_str = data.get("chirpMessageJson", "")
            if chirp_json_str:
                chirp = json.loads(chirp_json_str) if isinstance(chirp_json_str, str) else chirp_json_str
                # The actual message is in chirp.message.sections[].text
                message_obj = chirp.get("message", chirp)
                sections = message_obj.get("sections", [])
                texts = []
                for section in sections:
                    text = section.get("text", "")
                    if text:
                        texts.append(text)
                if texts:
                    return "\n".join(texts)

            # Fallback: sections directly in data
            sections = data.get("sections", [])
            texts = []
            for section in sections:
                text = section.get("text", "")
                if text:
                    texts.append(text)

            return "\n".join(texts) if texts else str(data)
        except (json.JSONDecodeError, AttributeError, TypeError) as e:
            return str(end_message.get("data", ""))

    # ── Conversation Logic ────────────────────────────────────────────────

    def send_and_receive(self, message_text):
        """Send a message and wait for the complete AI response."""
        # Record timestamp before sending
        before_send = int(time.time() * 1000)
        time.sleep(0.5)

        print(f"\n[Chat] Sending: {message_text[:100]}{'...' if len(message_text) > 100 else ''}")
        self.send_message(message_text)

        # Wait a moment for AI to start processing
        time.sleep(2)

        print("[Chat] Waiting for AI response...")
        response = self.poll_for_response(after_timestamp=before_send)

        if response:
            print(f"[Chat] Received: {response[:100]}{'...' if len(response) > 100 else ''}")
        else:
            print("[Chat] No response received (timeout)")

        return response


# ═════════════════════════════════════════════════════════════════════════════
#  RESPONSE CLASSIFICATION
# ═════════════════════════════════════════════════════════════════════════════

def detect_response_type(response_text):
    """
    Classify the AI response:
    - "success"  : Workflow was created successfully
    - "question" : AI is asking for more information
    - "progress" : AI is working on it (status update)
    - "error"    : Something went wrong
    """
    if not response_text:
        return "error"

    text_lower = response_text.lower()

    # ── Error indicators (check BEFORE success to catch "can't create" etc.) ──
    error_patterns = [
        r"(?:unable|cannot|can'?t|couldn'?t).*(?:create|build|set up)",
        r"(?:can not|cannot|can'?t) create",
        r"error.*(?:creating|building)",
        r"(?:failed|failure).*workflow",
        r"(?:don'?t|do not) have (?:access|permission)",
        r"upgrade.*(?:plan|subscription)",
        r"workflow.?limit.*(?:is\s+)?0",
        r"(?:not|isn'?t).*available",
        r"blocker",
    ]
    for pattern in error_patterns:
        if re.search(pattern, text_lower):
            return "error"

    # ── Success indicators ──
    success_patterns = [
        r"workflow.*(?:created|built|set up|ready|live)\s+(?:successfully|!)",
        r"(?:successfully|done).*workflow",
        r"your workflow is (?:now |)(?:active|live|ready)",
        r"i'?ve (?:created|built|set up).*workflow",
        r"here'?s your workflow",
        r"workflow.*is now (?:active|live|ready)",
        r"workflow has been (?:created|set up)",
    ]
    for pattern in success_patterns:
        if re.search(pattern, text_lower):
            return "success"

    # ── Question indicators ──
    question_patterns = [
        r"\?",
        r"which (?:type|option|trigger|action)",
        r"would you (?:like|prefer)",
        r"please (?:choose|select|specify|provide|tell)",
        r"what (?:should|would|do you|kind|type)",
        r"could you (?:tell|provide|specify|clarify)",
        r"(?:choose|select) (?:one|from|a |an )",
    ]
    for pattern in question_patterns:
        if re.search(pattern, text_lower):
            return "question"

    # ── Progress indicators ──
    progress_patterns = [
        r"(?:creating|building|setting up|working on)",
        r"(?:let me|i'?ll|i will|i'?m going to)",
        r"one moment",
        r"processing",
    ]
    for pattern in progress_patterns:
        if re.search(pattern, text_lower):
            return "progress"

    # Default: treat as question if contains '?', otherwise progress
    if "?" in response_text:
        return "question"
    return "progress"


def can_auto_answer(question_text, params):
    """
    Try to auto-answer a HubSpot AI question using the gathered parameters.
    Returns (can_answer: bool, answer: str or None).
    """
    q_lower = question_text.lower()

    # ── Workflow name ──
    if any(kw in q_lower for kw in ["name", "call it", "title"]) and "what" in q_lower:
        name = params.get("workflowName")
        if name:
            return True, f"Name it '{name}'"

    # ── Trigger type ──
    if any(kw in q_lower for kw in ["trigger", "when should", "start when", "enrolled"]):
        trigger = params.get("trigger", "")
        if trigger:
            trigger_readable = trigger.replace("_", " ")
            return True, f"The trigger should be: {trigger_readable}"

    # ── Email recipient ──
    if any(kw in q_lower for kw in ["who should receive", "send to", "recipient", "email address"]):
        email = params.get("email")
        if email:
            return True, f"Send the email to {email}"

    # ── Email subject ──
    if any(kw in q_lower for kw in ["subject line", "email subject", "subject of"]):
        subject = params.get("subject")
        if subject:
            return True, f"The subject should be: {subject}"

    # ── Email body ──
    if any(kw in q_lower for kw in ["email body", "email content", "message body", "say in the email"]):
        body = params.get("body")
        if body:
            return True, f"The email body should be: {body}"

    # ── Yes/No confirmations ──
    if any(kw in q_lower for kw in ["shall i", "should i proceed", "go ahead", "ready to create"]):
        return True, "Yes, please proceed."

    # ── Generic action confirmation ──
    if any(kw in q_lower for kw in ["would you like me to create", "want me to"]):
        return True, "Yes, go ahead and create it."

    return False, None


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


def _clean_error_message(raw_response):
    """
    Extract a clean, user-friendly error message from HubSpot AI's response.
    Strips markdown, keeps it short, and identifies common issues.
    """
    if not raw_response:
        return "Workflow creation failed. Please try again."

    text = raw_response.strip()

    # Check for common plan limitation patterns
    lower = text.lower()
    if "workflow limit" in lower and "0" in lower:
        return "Your HubSpot plan does not support workflows. Please upgrade your HubSpot plan to create workflows."
    if "upgrade" in lower and ("plan" in lower or "trial" in lower or "subscription" in lower):
        return "Workflow creation requires a higher HubSpot plan. Please upgrade your account or start a trial to use workflows."
    if "permission" in lower and ("don't" in lower or "not" in lower):
        return "You don't have permission to create workflows in this HubSpot portal."
    if "blocker" in lower or "can't create" in lower or "cannot create" in lower:
        # Extract just the first sentence/line as the summary
        first_line = text.split("\n")[0].strip()
        # Remove markdown bold markers
        first_line = re.sub(r'\*\*([^*]+)\*\*', r'\1', first_line)
        if len(first_line) > 150:
            first_line = first_line[:147] + "..."
        return first_line

    # Generic: take first meaningful line, strip markdown
    first_line = text.split("\n")[0].strip()
    first_line = re.sub(r'\*\*([^*]+)\*\*', r'\1', first_line)
    if len(first_line) > 200:
        first_line = first_line[:197] + "..."
    return first_line


# ═════════════════════════════════════════════════════════════════════════════
#  BUILD INITIAL PROMPT
# ═════════════════════════════════════════════════════════════════════════════

def build_workflow_prompt(params):
    """
    Build a clear, detailed prompt for HubSpot AI from the gathered parameters.
    """
    description = params.get("description", "").strip()
    name = params.get("workflowName", "").strip()
    trigger = params.get("trigger", "").strip()
    email = params.get("email", "").strip()
    subject = params.get("subject", "").strip()
    body = params.get("body", "").strip()

    parts = ["Create a workflow"]

    if name:
        parts.append(f"named '{name}'")

    if description:
        parts.append(f"that {description}")
    elif trigger:
        trigger_readable = trigger.replace("_", " ")
        parts.append(f"that triggers when {trigger_readable}")

    # Add action details
    action_details = []
    if email:
        action_details.append(f"sends an email to {email}")
    if subject:
        action_details.append(f"with subject '{subject}'")
    if body:
        action_details.append(f"with body '{body}'")

    if action_details and not description:
        parts.append("and " + ", ".join(action_details))

    prompt = " ".join(parts)

    # If the prompt is too minimal, add a generic instruction
    if len(prompt) < 30:
        prompt += ". Please guide me through the setup."

    return prompt


# ═════════════════════════════════════════════════════════════════════════════
#  MAIN EXECUTION
# ═════════════════════════════════════════════════════════════════════════════

def main():
    print("=" * 60)
    print(" HubSpot Workflow Creator (API) ".center(60))
    print("=" * 60)

    # ── Step 1: Read parameters ────────────────────────────────────────────
    params = _get_params()
    description = params.get("description", "").strip()

    if not description and not params.get("trigger") and not params.get("workflowName"):
        description = _ask_user(
            "What kind of workflow would you like to create?\n\n"
            "Describe what the workflow should do, for example:\n"
            "- Send a welcome email when a new contact is created\n"
            "- Create a task when a deal stage changes\n"
            "- Send a notification when a form is submitted"
        )
        if not description:
            print("[ERROR]No workflow description provided. Aborting.")
            sys.exit(1)
        params["description"] = description

    # ── Step 2: Build the initial prompt ───────────────────────────────────
    initial_prompt = build_workflow_prompt(params)
    print(f"\n[Workflow] Prompt: {initial_prompt}")

    # ── Step 3: Initialize API and establish session ───────────────────────
    print(f"\n[API] Initializing HubSpot AI connection...")
    api = HubSpotCopilotAPI(portal_id=params.get("portalId"))

    print("[API] Getting/creating chat thread...")
    api.get_or_create_thread()

    print("[API] Obtaining Ably auth token...")
    api.create_ably_token()

    print("[API] Session established. Starting conversation with HubSpot AI...\n")

    # ── Step 4: Conversation loop ──────────────────────────────────────────
    current_message = initial_prompt
    workflow_result = None
    conversation_start = time.time()
    MAX_TOTAL_TIME = 180  # 3 minutes max for entire conversation

    for turn in range(MAX_CONVERSATION_TURNS):
        # Safety: abort if total time exceeds limit
        if time.time() - conversation_start > MAX_TOTAL_TIME:
            print("[ERROR]Workflow creation timed out. Please try again.")
            sys.exit(1)
        print(f"\n{'-' * 40}")
        print(f" Conversation Turn {turn + 1}/{MAX_CONVERSATION_TURNS}")
        print("-" * 40)

        # Send message and get response
        response = api.send_and_receive(current_message)

        if not response:
            # No response — retry once after token refresh
            print("[Chat] No response, refreshing token and retrying...")
            api.refresh_token()
            response = api.send_and_receive(current_message)

        if not response:
            print("[ERROR]HubSpot AI did not respond. The service may be unavailable.")
            sys.exit(1)

        # Classify the response
        response_type = detect_response_type(response)
        print(f"[Chat] Response type: {response_type}")

        if response_type == "success":
            workflow_result = {
                "success": True,
                "message": response,
                "turns": turn + 1,
            }
            break

        elif response_type == "error":
            # Strip markdown formatting but keep the full AI response
            clean_response = re.sub(r'\*\*([^*]+)\*\*', r'\1', response)
            clean_response = re.sub(r'\\n', '\n', clean_response)
            clean_response = clean_response.strip()
            print(f"\n[FAIL] {clean_response}", file=sys.stderr)
            print(f"[ERROR]{clean_response}")
            sys.exit(1)

        elif response_type == "question":
            # Try to auto-answer from params
            answerable, auto_answer = can_auto_answer(response, params)
            if answerable:
                print(f"[Chat] Auto-answering: {auto_answer}")
                current_message = auto_answer
            else:
                # Ask user via modal
                user_answer = _ask_user(response)
                if not user_answer:
                    print("[ERROR]No response provided for HubSpot AI question.")
                    sys.exit(1)
                current_message = user_answer

        elif response_type == "progress":
            # AI is working on it — send a confirmation to continue
            print(f"[Chat] Progress update received, continuing...")
            # Wait a bit for the workflow to be created
            time.sleep(3)
            # Poll again for a final response without sending a new message
            final_response = api.poll_for_response(after_timestamp=int(time.time() * 1000) - 5000)
            if final_response:
                final_type = detect_response_type(final_response)
                if final_type == "success":
                    workflow_result = {
                        "success": True,
                        "message": final_response,
                        "turns": turn + 1,
                    }
                    break
                elif final_type == "question":
                    answerable, auto_answer = can_auto_answer(final_response, params)
                    if answerable:
                        current_message = auto_answer
                    else:
                        user_answer = _ask_user(final_response)
                        current_message = user_answer if user_answer else "Yes, please continue."
                else:
                    current_message = "Please continue."
            else:
                current_message = "Please continue with creating the workflow."

    # ── Step 5: Report result ──────────────────────────────────────────────
    if workflow_result and workflow_result.get("success"):
        print(f"\n{'=' * 60}")
        print(f" Workflow Created Successfully! ".center(60))
        print(f"{'=' * 60}")
        print(f"   Turns taken: {workflow_result['turns']}")
        print(f"\n[SUCCESS]{json.dumps(workflow_result)}")
    else:
        print(f"\n[ERROR]Workflow creation did not complete after {MAX_CONVERSATION_TURNS} turns.")
        sys.exit(1)


if __name__ == "__main__":
    main()
