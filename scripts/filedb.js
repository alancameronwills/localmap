
var syncWorker = new Worker('scripts/sync.js');
var mostrecenttimestamp = 0;
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
                    // Note latest timestamp so that we can later ask for an incremental update:
                    for (var i = 0; i < theList.length; i++) {
                        if (theList[i].timestamp && theList[i].timestamp > mostrecenttimestamp) {
                            mostrecenttimestamp = theList[i].timestamp;
                        }
                    }
                    
        theList.forEach(function (place) {
            place.__proto__ = Place.prototype;
            place.pics.forEach(function (pic) {
                pic.__proto__ = Picture.prototype;
            })
        });
                    onload(theList);
                } catch (ex) { alert(ex); }
            }
        }
    }
    req.open("GET", uri);
    req.send();
}

function PicUrl (imgid) {
    return "media/" + imgid;
}

function list(onLoad) {
    getFile('list.php', onload);
}

function getPlaces(onload) {
    getFile('getPlaces.php', onload);
}

function getRecentPlaces(onload) {
    getFile('getPlaces.php?after=' + mostrecenttimestamp, onload);
}

function getKeys(onload) {
    getFile('scripts/keys.json', onload);
}

function deletePlace(id) {
    getFile("delete.php?id=" + id, null);
}

function dbDeletePic(id) {
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
    let json = JSON.stringify(place);
    json  = json.replace(/[\u007F-\uFFFF]/g, function(chr) {
        return "\\u" + ("0000" + chr.charCodeAt(0).toString(16)).substr(-4)
    });
    upload(place.id, "place", json, null);
}

// contentType : ("place" | "picImg" | ...), content: (File | JSON)
function upload(id, contentType, content, remoteFileName) {
    syncWorker.postMessage({ id: id, contentType: contentType, content: content, remoteFileName: remoteFileName });
}




