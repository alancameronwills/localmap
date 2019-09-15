
var signinWindow = null;
var signinTimer = null;

function usernameIfKnown () {
    return window.username;
}

function usernameOrSignIn() {
    if (usernameIfKnown()) return usernameIfKnown();
    else {
        g("signinDialog").style.display = "block";
        return "";
    }
}

function onClickSignIn() {
    g('signinDialog').style.display = 'none';
    if (g('consent').checked) signin();
}

// Called from signinDialog
function signin() {
    // Open a window and then poll to see when it's closed
    signinWindow = window.open('sign-in.htm' , '', "width=600,height=500,left=200,top=100,toolbar=0,status=0");
    signinTimer = setInterval(function () {
        if (!signinWindow || signinWindow.closed) {
            clearInterval(signinTimer);
            checkSignin(null);
        }
    }, 1000);
}

/**
 * Check the user's credentials with Azure auth.
 * Assume already or previously logged in.
 * @param {fn(name)} onGot Callback when found name
 */
function checkSignin(onGot) {
    if (window.location.hostname == "localhost") {
        setUserName("test", "admin");
        if (onGot) onGot("test");
        return;
    }
    getFile("https://deep-map.azurewebsites.net/api/checkSignin", function (response) {
        if (response) {
            var n = response.name || response.headers["x-ms-client-principal-name"] || "";

            if (n.indexOf("@")<0){
                setUserName(n, response.role);
                if (onGot) onGot(n);
            }
            else {
                // Got an email address for the name. Get credential details for full name.
                getFile("/.auth/me", function (response) {
                    if (response.length>0 && response[0].user_claims) {
                        for (let i=0; i<response[0].user_claims.length; i++) {
                            let c = response[0].user_claims[i];
                            if (c.typ=="name" || c.typ.indexOf(":name")>=0) {
                                if (c.val.indexOf("@")<0) {
                                    setUserName(c.val);
                                    if (onGot) onGot(c.val);
                                    break;
                                }
                            }
                        }
                    }
                });
           }
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
        //appInsights.setAuthenticatedUserContext(name);
    }
    else {
        window.isSignedIn = false;
        g("usernamespan").innerHTML = "";
        g("signInButtonTop").style.display = "inline";
        g("signOutButton").style.display = "none";
    }
}

function signOut() {
    setUserName("", false);
    getFile("/.auth/logout", null);
    //appInsights.trackEvent("sign out");
}

