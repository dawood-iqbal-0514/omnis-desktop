"""
HubSpot Login Automation using DrissionPage
Navigate to HubSpot app and handle authentication
"""

from DrissionPage import ChromiumPage, ChromiumOptions


def create_browser():
    """Create and configure a ChromiumPage browser instance."""
    options = ChromiumOptions()
    
    # Optional: Run in headless mode (uncomment if needed)
    # options.headless()
    
    # Optional: Set window size
    options.set_argument('--window-size', '1920,1080')
    
    # Optional: Disable automation detection flags
    options.set_argument('--disable-blink-features', 'AutomationControlled')
    
    # Create the browser instance
    page = ChromiumPage(options)
    
    return page


def navigate_to_hubspot(page):
    """Navigate to HubSpot app page."""
    url = "https://app.hubspot.com/"
    
    print(f"Navigating to {url}...")
    page.get(url)
    
    # Wait for page to load
    page.wait.load_start()
    
    print(f"Current URL: {page.url}")
    print(f"Page title: {page.title}")
    
    return page


def main():
    """Main function to run the HubSpot automation."""
    # Create browser instance
    page = create_browser()
    
    try:
        # Navigate to HubSpot
        navigate_to_hubspot(page)
        
        # Keep browser open for inspection (remove in production)
        input("Press Enter to close the browser...")
        
    except Exception as e:
        print(f"Error occurred: {e}")
    
    finally:
        # Close the browser
        page.quit()
        print("Browser closed.")


if __name__ == "__main__":
    main()
