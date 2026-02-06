import subprocess
import time
from pathlib import Path
from DrissionPage import ChromiumOptions, ChromiumPage

# Setup paths
SCRIPT_DIR = Path(__file__).parent.absolute()
AUTO_LOGIN_SCRIPT = SCRIPT_DIR / "Hubspot_Auto_Login.py"
WORKFLOW_SCRIPT = SCRIPT_DIR / "hubspot_workflow_automation.py"
PROFILE_PATH = Path.home() / "OmnisReach_Profiles" / "hubspot" / "default"


def check_if_logged_in():
    """
    Quick check to see if we're already logged into HubSpot.
    Returns True if logged in, False if login needed.
    """
    print("Checking login status...")
    
    try:
        options = ChromiumOptions()
        options.set_user_data_path(str(PROFILE_PATH))
        options.set_argument('--disable-blink-features=AutomationControlled')
        
        page = ChromiumPage(options)
        page.get('https://app.hubspot.com/')
        
        time.sleep(2)
        
        # Check if we're on login page
        is_login_page = (
            "login" in page.url.lower() or
            "signin" in page.url.lower() or
            "login" in page.title.lower() or
            "sign in" in page.title.lower()
        )
        
        page.quit()
        
        if is_login_page:
            print("❌ Not logged in - Login page detected")
            return False
        else:
            print("✅ Already logged in")
            return True
            
    except Exception as e:
        print(f"⚠️ Error checking login status: {e}")
        print("Assuming login is needed...")
        return False


def run_login_automation():
    """Run the login automation script using subprocess."""
    print("\n" + "="*60)
    print("RUNNING LOGIN AUTOMATION")
    print("="*60)
    
    try:
        # Run the login script and wait for it to complete
        result = subprocess.run(
            ["python", str(AUTO_LOGIN_SCRIPT)],
            check=True,
            capture_output=False
        )
        
        print("\n✅ Login automation completed successfully")
        time.sleep(1)
        return True
        
    except subprocess.CalledProcessError as e:
        print(f"\n❌ Login automation failed with exit code: {e.returncode}")
        return False
    except Exception as e:
        print(f"\n❌ Error running login automation: {e}")
        return False


def run_workflow_automation():
    """Run the workflow automation script using subprocess."""
    print("\n" + "="*60)
    print("RUNNING WORKFLOW AUTOMATION")
    print("="*60)
    
    try:
        # Run the workflow script and wait for it to complete
        result = subprocess.run(
            ["python", str(WORKFLOW_SCRIPT)],
            check=True,
            capture_output=False
        )
        
        print("\n✅ Workflow automation completed successfully")
        return True
        
    except subprocess.CalledProcessError as e:
        print(f"\n❌ Workflow automation failed with exit code: {e.returncode}")
        return False
    except Exception as e:
        print(f"\n❌ Error running workflow automation: {e}")
        return False


def main():
    """Main orchestrator - checks login, runs what's needed."""
    print("╔" + "="*58 + "╗")
    print("║" + " HubSpot Automation Orchestrator ".center(58) + "║")
    print("╚" + "="*58 + "╝")
    
    # Step 1: Check if already logged in
    is_logged_in = check_if_logged_in()
    
    # Step 2: If not logged in, run login automation
    if not is_logged_in:
        print("\n⚡ Login required. Running login automation...")
        login_success = run_login_automation()
        
        if not login_success:
            print("\n❌ Could not complete login. Aborting workflow automation.")
            return False
    
    # Step 3: Run workflow automation
    print("\n⚡ Starting workflow automation...")
    workflow_success = run_workflow_automation()
    
    # Summary
    print("\n" + "="*60)
    if workflow_success:
        print("✅ ALL AUTOMATION COMPLETED SUCCESSFULLY!")
    else:
        print("❌ Workflow automation had issues. Check logs above.")
    print("="*60)
    
    return workflow_success


if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)
