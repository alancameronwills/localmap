
var signinWindow = null;
var signinTimer = null;

function usernameIfKnown () {
    return window.username;
}

function usernameOrSignIn() {
    if (usernameIfKnown()) return usernameIfKnown();
    else {
        signin();
        //g("signinDialog").style.display = "block";
        //return "";
    }
}

function onClickSignIn() {
    g('signinDialog').style.display = 'none';
    if (g('consent').checked) signin();
}

// Called from signinDialog
function signin() {
    // Open a window and then poll to see when it's closed
    signinWindow = window.open('sign-in.htm?v=2' , 'signin', "width=600,height=750,left=200,top=100,toolbar=0,status=0");
    signinTimer = setInterval(function () {
        if (!signinWindow || signinWindow.closed) {
            clearInterval(signinTimer);
            checkSignin(null);
        }
    }, 1000);
}

/*
    Sign in button --> signIn page {
        (MS | Google --> Azure checkin; close) 
            || (Email +pwd --> checkuser(email,pwd) && setCookie(user, email) && close )
            || (New email a/c --> checkuser(email, *) ? already taken : send verif email)
            || (Group + user name --> checkgroup(group)-->setCookie(groupOwnerEmail+userName, short); send email to group owner)
    }
    Verif email link(email) --> createOrUpdateUserUI({id:email, email:email, }) {pwd --> setPwd(email, pwd)}
    SignInPageClose --> {
        checkUser --> 
            response.entries.length == 0 --> {
                // old user or first-time user w 3rd party signin 
                if (principalId) {
                    if(principalName/@/) getAuthInfo --> createOrUpdateUserUI(id:principalId, email:principalName, fullname:principalName, 
                                            displayName=name?, valid, pwd="", group=""?})
                    else createOrUpdateUserUI({id:principalId, email:?, fullname:principalName, displayName=principalName?, valid, pwd="", group=""?})
                else createOrUpdateUserUI({id:email, email:email, pwd?, fullName?, displayName?, valid, group=""?})
            }
    }

    Groups: 
        content attributions are groupName/user; 
        group owner can list contributions from group, with user names
        group owner can edit or delete group contributions
        group owner gets email on user sign-in
        group can be restricted to places in a specified project

*/

/**
 * Check the user's credentials with Azure auth.
 * Assume already or previously logged in.
 * @param {fn(name)} onGot Callback when found name
 * @param {string} id email or group code/name
 */
function checkSignin(onGot, id) {
   /* if (window.location.hostname == "localhost") {
        setUserName("test", "admin");
        if (onGot) onGot("test");
        return;
    } */
    getFile("https://deep-map.azurewebsites.net/api/checkUser", function (response) {
        if (response) {

            var n = response.name;

            setUserName(n, response.role);
            if (onGot) onGot(n);
        }
    });
}

function setLengthColour(jqtext) {
    jqtext.css("background-color", (jqtext.html().length > 64000) ? "pink" : "white");
}

function setUserName(name, role) {
    window.username = name;
    window.isAdmin = name && (role == "admin");
    if (name) {
        g("usernamespan").innerHTML = name;
        g("signInButtonTop").style.display = "none";
        g("signOutButton").style.display = "inline-block";
        window.isSignedIn = true;
        appInsights.setAuthenticatedUserContext(name.replace(/[ ,;=|]+/g,"_"));
    }
    else {
        appInsights.clearAuthenticatedUserContext();
        window.isSignedIn = false;
        g("usernamespan").innerHTML = "";
        g("signInButtonTop").style.display = "inline";
        g("signOutButton").style.display = "none";
    }
}

function signOut() {
    setUserName("", false);
    getFile("/.auth/logout", null);
    appInsights.trackEvent("sign out");
}

