
var syncWorker = new Worker('scripts/sync.js');

//
// Get stuff
//
function getFile(uri, onload) {
    let req = new XMLHttpRequest();

    if (onload) {
        req.onreadystatechange = function () {
            if (this.readyState == 4) {
                try {
                var theList = JSON.parse(this.response);
                onload(theList);
                } catch (ex) {alert(ex);}
            }
        }
    }
    req.open("GET", uri);
    req.send();
}

function list(onLoad) {
    getFile('list.php', onload);
}

function getPlaces(onload) {
    getFile('getPlaces.php', onload);
}

function getRecentPlaces(timestamp, onload) {
    getFile('getPlaces.php?after=' + timestamp, onload);
}

function getKeys(onload) {
    getFile('scripts/keys.json', onload);
}

function deletePlace(id) {
    getFile("delete.php?id=" + id, null);
}

function deletePic(id) {
    getFile("delete.php?pic=" + id, null);
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
    upload(place.id, "place", placeJson, null);
}

/*

// contentType : ("place" | "picImg" | ...), content: (File | JSON)
function upload(id, contentType, content, remoteFileName) {
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
                alert(this.responseText);
        }
    }
    req.open("POST", 'upload.php');
    req.send(formData);
}
*/


// contentType : ("place" | "picImg" | ...), content: (File | JSON)
function upload(id, contentType, content, remoteFileName) {
    syncWorker.postMessage({id:id, contentType:contentType, content:content, remoteFileName:remoteFileName});
}




