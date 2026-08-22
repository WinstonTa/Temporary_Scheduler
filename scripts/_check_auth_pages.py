import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app import app

c = app.test_client()
paths = ["/", "/signup", "/login", "/check-email", "/home", "/rmp"]
for path in paths:
    response = c.get(path)
    print(path, response.status_code)

landing = c.get("/").get_data(as_text=True)
login = c.get("/login").get_data(as_text=True)
home = c.get("/home").get_data(as_text=True)
rmp = c.get("/rmp").get_data(as_text=True)

print("LANDING_BUTTONS", "Sign Up" in landing and "Log In" in landing)
print("LOGIN_DIALOG", "login-miss-dialog" in login)
print("HOME_SIGNOUT", "Sign out" in home)
print("HOME_SUCCESS_COPY", "User successfully logged in" in home)
print("HAS_PUBLISHABLE", "sb_publishable_" in landing)
print("NO_SECRET", "sb_secret_" not in landing and "service_role" not in landing)
print("RMP_FORM", 'action="/rmp"' in rmp)
