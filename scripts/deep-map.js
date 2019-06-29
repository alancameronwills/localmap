
var knownTags = [
    { id: "fauna", name: "Anifeiliaid", color: "#a00000" },
    { id: "flora", name: "Planhigion", color: "#00a000" },
    { id: "petri", name: "Cerrig", color: "#909090" },
    { id: "pop", name: "Pobl", color: "#c0a000" },
    { id: "met", name: "Tywydd", color: "#40a0ff" },
    { id: "ego", name: "Fy", color: "#ffff00" }];

window.Places = {};
var RecentUploads = {};

class Place {
    constructor(lon, lat) {
        this.id = new Date().toISOString().replace(/:/g, '').replace('.', '');
        this.loc = { e: lon, n: lat };
        this.text = "What's here?";
        this.pics = [];
        this.tags = [];
    }
    get Title() {
        return this.text.match(/^.*?($|<div|<p|<br)/)[0].replace(/<[^>]*($|>)/g, "");
    }
    get Hash() {
        var h = "" + this.text + this.loc.e + this.loc.n;
        if (this.pics) this.pics.forEach(function (pic, i, a) { h += pic.id + pic.caption; });
        if (this.tags) h += this.tags.toString();
        return hashCode(h);
    }
}

// An image or other media file attached to a place
class Picture {
    constructor(id, place) {
        this.id = id;
        this.url = "media/" + id;
        this.caption = "What's in this picture?";
    }
    imgSrc() {
        return RecentUploads[this.id] ? RecentUploads[this.id] : this.url;
    }
    setImgData(data) {
        RecentUploads[this.id] = data;
    }
}

function init() {
    makeTags();
    setUpMap();
}

// Initial load of all saved places into the map
function loadPlaces() {
    window.Places = {};
    getPlaces(function (placeArray) {
        placeArray.forEach(function (place) {
            place.__proto__ = Place.prototype;
            place.pics.forEach(function (pic) {
                pic.__proto__ = Picture.prototype;
            })
            window.Places[place.id] = place;
            mapAdd(place);
        });
    });
}

// Create a new place and assign it to current user.
// Returns null if user not signed in yet.
function makePlace(lon, lat) {
    var username = usernameIfKnown();
    if (!username) return null;
    var place = new Place(lon, lat);
    Places[place.id] = place;
    place.user = username;
    return place;
}


window.onclose = function () {
    closePopup();
}

function showPopup(placePoint, x, y) {
    closePopup();
    var tt = g("popuptext");
    tt.innerHTML = placePoint.place.text;
    var pop = g("popup");

    pop.editable = window.isAdmin || !placePoint.place.user || usernameIfKnown() == placePoint.place.user;
    tt.contentEditable = pop.editable;
    g("addPicButton").style.display = pop.editable || !usernameIfKnown() ? "inline" : "none";
    g("author").innerHTML = placePoint.place.user || "";

    pop.style.display = "block";
    pop.style.top = "" + Math.min(y, window.innerHeight - pop.clientHeight) + "px";
    pop.style.left = "" + Math.min(x, window.innerWidth - pop.clientWidth) + "px";
    pop.placePoint = placePoint;
    pop.hash = placePoint.place.Hash;
    var thumbnails = g("thumbnails");
    placePoint.place.pics.forEach(function (pic, ix) {
        let img = document.createElement("img");
        img.height = 40;
        img.src = pic.imgSrc();
        thumbnails.appendChild(img);
        img.onclick = function (event) {
            showPic(pic);
        }
    }
    );
    showTags(placePoint.place);
}

function showPic(pic) {
    g("lightbox").currentPic = pic;
    g("caption").innerHTML = pic.caption;
    g("bigpic").src = pic.imgSrc();
    g("lightbox").style.display = "block";
    g("caption").style.width = "" + Math.max(200, g("bigpic").clientWidth) + "px";

}

function hidePic() {
    g("lightbox").style.display = 'none';
    g("lightbox").currentPic.caption = g("caption").innerHTML;
}

/// Save place to server. Text, links to pics, etc.
function closePopup() {
    var pop = g("popup");
    if (pop.style.display && pop.style.display != "none") {
        if (pop.editable && pop.placePoint != null && pop.placePoint.place != null) {
            let place = pop.placePoint.place;
            place.text = g("popuptext").innerHTML;
            if (pop.hash != place.Hash) {
                if (!place.user) place.user = usernameOrSignIn();
                if (place.user) {
                    updatePin(pop.placePoint); // title etc
                    sendPlace(place);
                }
            }
        }
        g("thumbnails").innerHTML = "";
        pop.style.display = "none";
        // Popup is reusable - only used by one place at a time
        pop.placePoint = null;
    }

}


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
        return "";
    }
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

// User clicked the Add button.
function add() {
    if (!usernameOrSignIn()) return;
    // Make the file selection button clickable and click it:
    var uploadButton = g("uploadButton");
    uploadButton.style.display = "inline";
    uploadButton.click();
}

// User has selected files to upload
function doUploadFiles(files, place) {
    g("uploadButton").style.display = "none";

    for (var i = 0; i < files.length; i++) {
        let localName = files[i].name;
        let extension = localName.match(/\.[^.]+$/);
        let picId = place.id + "-" + (Date.now() % 1000).toString() + extension;
        let pic = new Picture(picId, place);
        place.pics.push(pic);

        // Send to server:
        sendPic(pic, files[i]);

        // Read data directly so that we can display now:
        let reader = new FileReader();
        reader.pic = pic;
        reader.onload = function () {
            reader.pic.setImgData(reader.result);
            let img = document.createElement("img");
            img.height = 40;
            img.src = reader.pic.imgSrc();
            g("thumbnails").appendChild(img);
            img.onclick = function (event) {
                showPic(reader.pic);
            }
        };
        reader.readAsDataURL(files[i]);

    }
}

function makeTags() {
    var s = "<table style='background-color:white'><tr>";
    knownTags.forEach(function (tag) {
        s += "<td><span class='tag' style='background-color:" + tag.color + "40' id='" + tag.id + "' onclick='clickTag(this)'> " + tag.name + " </span></td>";
    });;
    s += "</tr></table>";
    g("tags").innerHTML = s;
}

function clickTag(span) {
    var tagClicked = " " + span.id;
    var pop = g("popup");
    if (!pop.editable) return;
    var place = pop.placePoint.place;
    if (!place.tags || typeof (place.tags) != "string") place.tags = "";
    var ix = place.tags.indexOf(tagClicked);
    if (ix < 0) place.tags += tagClicked;
    else place.tags = place.tags.replace(tagClicked, "");
    showTags(place);
}

function showTags(place) {
    var tagSpans = document.getElementsByClassName("tag");
    for (var i = 0; i < tagSpans.length; i++) {
        var tagSpan = tagSpans[i];
        if (place.tags && place.tags.indexOf(" " + tagSpan.id) >= 0) {
            tagSpan.style.borderColor = "coral";
            tagSpan.style.borderStyle = "solid";
        }
        else {
            tagSpan.style.borderStyle = "none";
        }
    }
}

// Default colour, shape, and label of a pin:
function pinOptions(place) {
    var thisPinColor = place.text.length > 100 ? "#0000A0" : "#00000";
    if (place.tags) {
        for (var i = 0; i < knownTags.length; i++) {
            if (place.tags.indexOf(knownTags[i].id) >= 0) {
                thisPinColor = knownTags[i].color;
                break;
            }
        }
    }
    return {
        title: place.Title,
        //text: postcodeLetter,
        //subTitle: place.subtitle, 
        color: thisPinColor,
        enableHoverStyle: true
    };
}

function toggleMap() {
    if (mapimgsrc.indexOf("a-1") < 0) {
        // switch to aerial
        g("mapbutton").src = "img/map-icon.png";
        mapChange("aerial");
    }
    else {
        // switch to OS
        g("mapbutton").src = "img/aerial-icon.png";
        mapChange("os");
    }

}
