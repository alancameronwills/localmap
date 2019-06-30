function getFile(uri, onload) {
    let req = new XMLHttpRequest();
    
    req.onreadystatechange = function () {
        if (this.readyState == 4) {
            var theList = JSON.parse(this.response);
            onLoad(theList);
        }
    }
    req.open("GET", uri);
    req.send();
}

function list (onLoad) {
    let req = new XMLHttpRequest();
    
    req.onreadystatechange = function () {
        if (this.readyState == 4) {
            var theList = JSON.parse(this.response);
            onLoad(theList);
        }
    }
    req.open("GET", 'list.php');
    req.send();
}

function getPlaces (onload) {
    let req = new XMLHttpRequest();
    req.onreadystatechange = function () {
        if (this.readyState == 4) {
            var thePlaces = JSON.parse(this.response);
            onload(thePlaces);
        }
    }
    req.open("GET", 'getPlaces.php');
    req.send();
}

function getKeys (onload) {
    let req = new XMLHttpRequest();
    req.onreadystatechange = function () {
        if (this.readyState == 4) {
            var theKeys = JSON.parse(this.response);
            onload(theKeys);
        }
    }
    req.open("GET", 'scripts/keys.json');
    req.send();
}

//
// Upload
//

// pic: {id, file, caption}
function sendPic(pic, data) {
    if (!pic || !data) return;
    upload(pic.id, "picImg", data, pic.id);
}

// place: {id, ...}
function sendPlace(place) {
    let placeJson = JSON.stringify(place);
    upload (place.id, "place", placeJson, null);
}

// contentType : ("place" | "picImg" | ...), content: (File | JSON)
function upload (id, contentType, content, remoteFileName)
{
    let req = new XMLHttpRequest();
    let formData = new FormData();
    if (remoteFileName) {
        formData.append(contentType, content, remoteFileName);
    }
    else {
        formData.append(contentType, content);
    }
    formData.append("id", id);
    req.onreadystatechange = function () {
        if (this.readyState == 4) {
            // done
            if (this.responseText.trim().length > 3) 
                alert (this.responseText);
        }
    }
    req.open("POST", 'upload.php');
    req.send(formData);
}

