
// Sign-in dialog. Separate window, but Chrome disallows nearly all communication.
var signinWindow = null;
var signinTimer = null;


function usernameIfKnown() {
    if (!window.username) {
        window.username = getCookie("username");
        g("usernamediv").innerHTML = window.username;
    }
    return window.username;
}

function usernameOrSignIn() {
    var username = usernameIfKnown();
    if (username) return window.username;
    else {
        g("signin").style.display = "block";
        //g("signinDialog").style.display = "block";
        return "";
    }
}

// Called from signinDialog
function signin() {
    // Open a window and then poll to see when it's closed
    signinWindow = window.open('sign-in.htm' + window.location.search, '', "width=400,height=500,left=200,top=100,toolbar=0,status=0");
    signinTimer = setInterval(function () {
        if (!signinWindow || signinWindow.closed) {
            clearInterval(signinTimer);
            checkSignin();
        }}, 1000);
}

function checkSignin() {
    $.ajax({
        url: apiUrl + "test", xhrFields: { withCredentials: true }, complete: function (data, status) {
            var headers = data && data.responseJSON ? data.responseJSON.headers : {};
            var n = headers["x-ms-client-principal-name"] || null;
            setUserName(n);
            setCookie("username", n, 1000);
            var idp = headers["x-ms-client-principal-idp"] || "";
            if (idp) {
                setCookie("useridp", idp, 1000);
            }
        }
    });
}

function setLengthColour(jqtext) {
    jqtext.css("background-color", (jqtext.html().length > 64000) ? "pink" : "white");
}

function setUserName(name, fromCookie) {
    window.userName = name;
    if (name) {
        g("usernamediv").innerHTML = name + " <input type='button' class='deleteButton' onclick='signOut()' value='X' "
            + "title='Remove this username so that you can sign in with a different account.' />&nbsp;&nbsp;&nbsp;";
        window.isSignedIn = true;
        //appInsights.setAuthenticatedUserContext(name);
    }
    else {
        window.isSignedIn = false;
        g("usernamediv").innerHTML = "<input type='button' onclick='signin()' value='Sign in'/>&nbsp;&nbsp;&nbsp;";
    }
}

function signOut() {
    setCookie("username", "", -1);
    setCookie("useridp", "", -1);
    setUserName("", true);
    appInsights.trackEvent("sign out");
}

function getUserName() {
    var name = getCookie("username");
    setUserName(name, true);
    if (!name) { $("#signinDialog").show(); }
}




function signedin(input) {
    var n = input.value.trim();
    if (n && n.length > 3) {
        window.username = n;
        setCookie("username", n);
        g("signin").style.display = "none";
        g("usernamediv").innerHTML = n;
    } else {
        input.style.borderColor = "red";
    }
}


window.isAdmin = location.queryParameters.admin == "span";
