from DrissionPage import ChromiumOptions, ChromiumPage
from DrissionPage.common import Keys
import time

email = "mdawoodiqbal0811@gmail.com"
password = "VeraPool786#"
options = ChromiumOptions()
options.set_paths(user_data_path=r"C:\Users\MDKG0514\OneDrive\Desktop\Portfolio\Dawood\OmnisReach\Profile_1")
page = ChromiumPage(options)

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

time.sleep(1)

two_fa_appeared = False

two_fa_url = page.url
if two_fa_url.startswith("https://app.hubspot.com/login/two-factor"):
	two_fa_appeared = True
	otp = input("Enter the OTP sent to your email: ")
	otp_input = page.ele('xpath://input[@type="text" or @name="code"]')
	otp_input.input(otp + Keys.ENTER)
	
	time.sleep(1)

	remember_me = page.ele('xpath://button[@data-test-id="2fa-remember-me-button"]')
	remember_me.click()

