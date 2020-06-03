
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
    signinWindow = window.open(`sign-in.htm?v=${window.version}&project=${window.project.id}` ,
     'signin', "width=600,height=750,left=200,top=100,toolbar=0,status=0");
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
    getFile("https://deep-map.azurewebsites.net/api/checkUser", function (response) {
        if (response && response.entries && response.entries.length>0) {
            let u = response.entries[0];
            let x = n=>u[n]?u[n]._:"";
            // id, email, pwdHash, role, realName, displayName, group, homeProject, isValidated

            window.user = new User(x("RowKey"), x("email"), "", x("Role"), x("FullName"), x("DisplayName"), "", "", !x("validation"));

            setUserName(window.user);
            if (!window.project.contributorRole || window.user.isContributor) {
                openSignedInControls();
            }
            if (onGot) onGot(n);
        }
    });
}

function openSignedInControls(yes=true) {
    let open = (id) => {
        let element = g(id);
        if (element) {
            element.style.visibility = yes ? "visible" : "hidden";
        }
    }
    open ("addFileButton");
    open ("addPlaceButton");
    open("target");
}

function setLengthColour(jqtext) {
    jqtext.css("background-color", (jqtext.html().length > 64000) ? "pink" : "white");
}

function setUserName(user) {
    if (user) {
        window.username = user.displayName;
        g("usernamespan").innerHTML = user.displayName;
        g("signInButtonTop").style.display = "none";
        g("signOutButton").style.display = "inline-block";
        window.isSignedIn = true;
        appInsights.setAuthenticatedUserContext(user.displayName.replace(/[ ,;=|]+/g,"_"));
    }
    else {
        window.username = "";
        appInsights.clearAuthenticatedUserContext();
        window.isSignedIn = false;
        g("usernamespan").innerHTML = "";
        g("signInButtonTop").style.display = "inline";
        g("signOutButton").style.display = "none";
    }
}

function signOut() {
    window.user = null;
    setUserName(null);
    openSignedInControls(false);
    getFile("/.auth/logout", null);
    appInsights.trackEvent("sign out");
}

