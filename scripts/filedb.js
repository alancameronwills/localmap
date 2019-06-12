

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

//
// Upload
//

// pic: {id, file, caption}
function sendPic(pic) {
    if (!pic.file) return;
    let dotExtension = pic.file.name.match(/\.[^.]+$/);
    upload(pic.id, "picImg", pic.file, pic.id + dotExtension);
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
        formData.set(contentType, content);
    }
    formData.set("id", id);
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

