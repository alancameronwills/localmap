
// Sign-in dialog. Separate window, but Chrome disallows nearly all communication.
var signinWindow = null;
var signinTimer = null;


function usernameIfKnown() {
    if (!window.username) {
        setUserName(getCookie("username"), true);
    }
    if (!window.username && window.location.hostname == "localhost") {
        setUserName("test");
    }
    return window.username;
}

function usernameOrSignIn() {
    var username = usernameIfKnown();
    if (username) return window.username;
    else {
        g("signinDialog").style.display = "block";
        // g("signin").style.display = "block";
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
            checkSignin();
        }
    }, 1000);
}

function checkSignin() {
    getFile("https://deep-map.azurewebsites.net/api/checkSignin", function (response) {
        if (response) {
            var n = response.headers["x-ms-client-principal-name"];
            setUserName(n);
            setCookie("username", n || "", n ? 1000 : -1);
            var idp = response.headers["x-ms-client-principal-idp"] || "";
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
    window.username = name;
    if (name) {
        g("usernamediv").innerHTML = name + 
            " <input type='button' class='deleteButton' onclick='signOut()' value='X' title='Sign out.' />";
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
    //appInsights.trackEvent("sign out");
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


window.isAdmin = location.queryParameters.admin == "span" || location.hostname == "localhost";
