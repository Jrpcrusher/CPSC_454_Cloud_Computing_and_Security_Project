from fastapi import APIRouter

router = APIRouter()

@router.get("/register") # Handles new user account creation
def register():
    # TODO: On account creation, make new account identifier (ID), and establish password and email associated
    return {"Status:", "account_created"}

@router.get("/login") # Handles logging in the user
def login():
    status = 0; # Default status of 0 for user not logged in
    # TODO: get_credentials(), email/username and password
    # Regular users can opt into MFA, but not required
    if not status:
        return {"status": "login_failed"}
    return {"status": "login_success"}

@router.get("/logout") # Handles the user logging out of their account
def logout():
    return {"status": "logout_success"}

@router.get("/myaccount") # Handles viewing the users own profile and account
def myaccount():
    account = None # TODO: Make method to return account through this function
    return {"account": account}

@router.get("/admin") # Handles admin login raising privileges
def admin():
    admin = 0; # Return 1 if user is admin, 0 if not
    # Also enable MFA for this part, admins always will need MFA enabled via auth app
    if not admin:
        return {"privilege": "static"} # unchanged
    return {"privilege": "updated"} # changed