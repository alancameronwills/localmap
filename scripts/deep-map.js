
// App startup and the remaining unclassed UI: menus, dialogs, and map chrome.
// Redirect http->https on the Azure-hosted site. NB match the hostname, not the whole
// URL: query strings can legitimately contain "azure" (e.g. ?cartography=azure).
if (location.protocol == "http:" && location.hostname.indexOf("azure") > 0) {
    if (window.location == window.parent.location) { //not in an iframe
        location.replace(("" + location).replace("http:", "https:"));
    }
}

window.onpopstate = function (e) { window.history.forward(1); }
window.rightClickActions = [
    {
        label: "Add place here  .\n",
        eventHandler: function () {
            onAddPlaceButton(window.map.menuBoxClose());
        }
    },
    {
        label: "Add video here  .",
        eventHandler: function () {
            onAddVideoButton(window.map.menuBoxClose());
        }
    }];

async function init() {

    window.project = await Project.get();
    log("Project: " + window.project.id);

    window.splashScreen = new SplashScreen(window.project.id);
    await window.splashScreen.show();

    //registerServiceWorker();
    if (JSON.stringify(navigator.onLine) == ("true")) {
        log("Browser Status: Online");
    } else {
        log("Browser Status: Offline");
    }
    setParentListener();
    window.loadingTimer = Date.now();
    if (window.location != window.parent.location) {
        g("fullWindowButton").style.display = "block";
    }
    let target = window.location == window.parent.location ? "_blank" : "_top";
    let intro = window.iaith && window.project.intro_lang && window.project.intro_lang[window.iaith] || window.project.intro;
    html("workingTitle", `<a href="${intro}" target="${target}"><img src='img/home.png'><span>${window.project.title}</span></a>`);

    window.lightboxU = new LightboxU(g("lightbox"));
    window.audioPlayer = new AudioPlayer(g("audiodiv"));
    g("topLayer").oncontextmenu = (event) => {
        event.preventDefault();
    }
    isSendQueueEmptyObservable.AddHandler(() => {
        g("picLaundryFlag").style.visibility = isSendQueueEmptyObservable.Value ? "hidden" : "visible";
    });
    makeTags();
    let hasLanguage = window.project && window.project.languages && window.project.languages.length > 1;
    setLanguage(hasLanguage && (location.queryParameters.lang || getCookie("iaith")) || "en");
    if (!hasLanguage) {
        hide("toggleLanguageButton");
        hide("welshKeys");
    }
    if (window.project.languages && window.project.languages.length > 2) {
        hide("welshKeys");
    }
    // Get API keys, and then initialize the map:
    dbGetKeys(function (data) {
        doLoadMap(() => {
            if (map.pinOpacity) {
                let setPointOpacity = () => {
                    map.setOpacity = [ // an array to pick from
                        0.6,
                        0.3,
                        0.1,
                        1][map.pinOpacity.Value || 0];
                };
                // Do this whenever the map choice changes:
                map.pinOpacity.AddHandler(setPointOpacity);
                // And do it now to set button to initial choice got from cookie:
                setPointOpacity();
            } else {
                hide("opacitySlider");
            }

            if (map.mapChoiceObservable) { // just in case this map doesn’t use it
                let setMapButtonIcon = () => {
                    g("mapbutton").src = map.mapView.Icon
                };
                // Do this whenever the map choice changes:
                map.mapChoiceObservable.AddHandler(setMapButtonIcon);
                // And do it now to set button to initial choice got from cookie:
                setMapButtonIcon();
            }
            else {
                hide("mapbutton");
            }
            if (map.mapView.MapChoices.length <= 2) hide("NLScredit");

            mapReady();
        });
        log("got keys");
    });

    window.pinPops = new Petals(true, ["lightbox", "audiodiv"]); // Set up shape
    if (location.queryParameters.nosearch) {
        hide("bottomLeftPanel");
        hide("addressSearchBox");
    }
    if (location.queryParameters.nouser) {
        hide("usernamediv");
        splashScreen.permitDrop("no user");
    } else {
        checkSignin(un => {
            if (un && un != "test") {
                splashScreen.permitDrop("signed in");
            }
        });
    }


    // Arrow keys change picture in lightbox:
    window.addEventListener("keydown", doLightBoxKeyStroke);
    // But allow use of arrow keys in picture caption:
    // g("lightboxCaption").addEventListener("keydown", event => { stopPropagation(event); });

    g("lightbox").oncontextmenu = function (e) {
        stopPropagation(e);
        e.preventDefault();
        stopPicTimer();
        if (!lightboxU.currentPin.place.IsEditable) return;
        if (lightboxU.currentPic) {
            showMenu("petalMenu", lightboxU.currentPic, lightboxU.currentPin, e);
        } else if (lightboxU.currentPin) {
            showMenu("petalTextMenu", lightboxU.currentPin, null, e);
        }
    }

    // Sanitize pasted HTML, Word docs, etc
    g("popuptext").addEventListener('paste', (e) => {
        // Get user's pasted data
        let data = e.clipboardData.getData('text/plain');
        if (data) {
            data = data.replace(/\n/, "\n<br/>\n");
        } else {
            data = e.clipboardData.getData('text/html');
            data = data.replace(/<.*>/, "");
        }

        // Insert the filtered content
        document.execCommand('insertHTML', false, data);

        // Prevent the standard paste behavior
        e.preventDefault();
    });

    g("statsLink").href = "stats.html?project=" + window.project.id;
}

/**
 * Called when the map is loaded or refreshed.
 */
function mapReady() {
    log("map ready");
    window.map.onclick((e) => {
        closePopup();
        window.pinPops.hide();
        lightboxU.hide();
        index.hideIndex();
    });
    currentTrail = [];
    if (window.Places && Object.keys(window.Places).length > 0) {
        addAllPlacesToMap();
    } else {
        loadPlaces();
    }
}

/** Listen for messages from parent if we're in an iFrame */
function setParentListener() {
    if (window.parentListenerSet) return;
    window.parentListenerSet = true;
    window.addEventListener("message", function (event) {
        if ((event.source == window.parent || window.Cypress)) {
            switch (event.data.op) {
                case "gotoPlace":
                    window.tracker.onPauseButton(true); // Stop tracking
                    let placeKey = decodeURIComponent(event.data.placeKey.replace(/\+/g, " "));
                    if (!window.placeToGo) {
                        // This is the first call after opening, so probably need to clear splash screen
                        window.splashScreen.permitDrop("api goto");
                        // If that hasn't cleared the splash, it's because we're still waiting on map loading
                        // So keep the command for execution later
                        window.placeToGo = { place: placeKey, show: event.data.show };
                        // But try it anyway ...
                    }
                    goto(placeKey, null, "auto", event.data.show, null, null, true);
                    break;
                case "tour":
                    let tourList = event.data.places.map(p => decodeURIComponent(p));
                    window.splashScreen.onDrop(() => {
                        window.map.showPlaceSet(tourList);
                        map.clustering(false);
                        map.maxAutoZoom = 17;
                    })
                    break;
            }
        }
    });
}

function contactx(event, place) {
    window.open(`mailto:${window.project.admin}?subject=${encodeURIComponent(window.project.title)}&body=About%20this%20item:%20${encodeURIComponent(getLink(place))}%0A%0A`, "_blank")
    return stopPropagation(event);
}

function showLink(place, event) {
    stopPropagation(event);
    var url = getLink(place);
    html("messageInner", s("getLinkDialog", "To show someone else this place, copy and send them this link:") + "<br/>"
        + "<input id='msgbox' type='text' value='{0}' size={1} readonly></input>".format(url, url.length + 2));
    show("message");
    g("msgbox").setSelectionRange(0, url.length);
    g("msgbox").focus();
}

function frameBreakout(signin = false) {
    let mapLocUri = map.getViewString();
    window.open(location.href.replace(/\?.*/, "")
        + `?project=${window.project.id}&`
        + (window.iaith ? `lang=${window.iaith}&` : "")
        + `view=${encodeURIComponent(mapLocUri)}` + (signin ? "&signin=true" : ""), "_blank");
}

function stopPropagation(event) {
    event.cancelBubble = true;
    if (event.stopPropagation) event.stopPropagation();
    if (event.preventDefault) event.preventDefault();
    return true;
}

function flashMessage(msg) {
    var msgDiv = g("topMessage");
    msgDiv.innerHTML = msg;
    msgDiv.style.visibility = "visible";
    setTimeout(function () {
        msgDiv.style.visibility = "hidden";
    }, 5000);
}

/** Open a menu. The menu is a div in index.html. Each item is a contained div with onclick='onmenuclick(this, cmdFn)'.
 * @param {div} id      id of the div
 * @param {*} item      First parameter passed on to cmdFn
 * @param {*} context   Second parameter passed on to cmdFn
 * @param {*} event     Right-click event that triggered the menu.
 */
function showMenu(id, item, context, event) {
    var e = document.documentElement, b = document.getElementsByTagName('body')[0], windowHeight = window.innerHeight || e.clientHeight || b.clientHeight;
    let menu = g(id);
    menu.item = item;
    menu.context = context;
    menu.style.top = event.pageY + "px";
    menu.style.left = event.pageX + "px";
    menu.style.display = "block";
    let maxTop = windowHeight - (menu.clientHeight || 200);
    if (maxTop < event.pageY)
        menu.style.top = maxTop + "px";
}

/**
 * User clicks a menu item after showMenu().
 * @param {*} menudiv
 * @param {*} fn
 */
function onmenuclick(menudiv, fn) {
    var menuRoot = menudiv.parentElement;
    fn(menuRoot.item, menuRoot.context);
    menuRoot.style.display = "none";
}

function offline() {
    var popup = g("offlinePopupID");
    var btn = g("offlinePopup");
    var span = document.getElementsByClassName("close")[0];
    var cancel = document.getElementsByClassName("cancel")[0];
    btn.onclick = function () {
        popup.style.display = "block";
    }
    span.onclick = function () {
        popup.style.display = "none";
    }
    cancel.onclick = function () {
        popup.style.display = "none";
    }
    window.onclick = function (event) {
        if (event.target == popup) {
            popup.style.display = "none";
        }
    }
}

function selectCartography() {
    g("mapDropdown").classList.toggle("show");
}
function selectCategory() {
    g("categoryDropdown").classList.toggle("show");
}
var selectedMap;
function mapSelect() {
    window.location.search = "?cartography=" + selectedMap + "&project=" + (window.project.id);
}
function opacitySlider() {
    map.pinOpacity.Value = (map.pinOpacity.Value + 1) % 4;

    try {
        var markers = window.map.markers;
        markers.forEach(item => {
            item.setOpacity(map.setOpacity);
        });
        var cluster = document.getElementsByClassName("cluster");
        for (var i = 0; i < cluster.length; i++) {
            cluster[i].style.opacity = (map.setOpacity * 100) + "%";
        }
    } catch { }
}
window.onclick = function (event) {
    if (!event.target.matches('#cartographyButton')) {
        var dropdowns = document.getElementsByClassName("dropdown-content");
        for (var i = 0; i < dropdowns.length; i++) {
            dropdowns[i].classList.toggle('show', false);
        }
    }
}
