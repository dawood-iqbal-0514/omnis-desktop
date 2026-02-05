# HubSpot Registry Files

## api-actions.json

This file defines which HubSpot actions can be performed via API.

### Structure:

- **`apiOnlyActions`**: Array of action IDs that can be executed via API only
  - Example: `"create_contact"`, `"get_contact"`, `"update_contact"`
  - These actions will use the backend API endpoints

- **`hybridActions`**: Object defining actions that require BOTH automation and API
  - **Purpose**: Some tasks need automation (e.g., login) before API calls can work
  - **Example**: `"create_contact_with_login"`
    - `automationFirst: true` - Run automation script first
    - `automationScript: "hubspot_login_automation.py"` - Script to run
    - `thenAPI: "create_contact"` - API action to execute after automation
  - **Flow**: Automation runs → Gets session/auth → Then API call uses that session

### How it works:

1. If action is in `apiOnlyActions` → Execute via API only
2. If action is in `hybridActions` → Execute automation first, then API
3. If action is NOT in either → Execute via automation only (default)

## automation-scripts.json

This file lists all available Python automation scripts for HubSpot.

Each script entry includes:
- `name`: Python file name
- `actionId`: Action identifier
- `description`: What the script does
- `required`: Whether script is required or optional

