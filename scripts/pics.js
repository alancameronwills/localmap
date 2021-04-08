
/**User has selected files to upload, either to a specific Place,
 * or to a place TBD from the photos' locations.
 * 
 * @param {*} auxButton The file input button, to hide
 * @param {*} files from the input field = blobs with filenames
 * @param {*} pin map pin with place to which to add pics, or null if TBD
 */
async function doUploadFiles(auxButton, files, pin) {
    if (auxButton) hide(auxButton);

    for (var i = 0; i < files.length; i++) {
        let extension = ("" + (files[i].name.match(/\.[^.]+$/) || "")).toLowerCase();
        let pic = new Picture(
            pin ? pin.place : null,
            extension == ".heic" ? ".jpg" : extension,
            files[i]);
        if (pin) pin.place.pics.push(pic);

        // img initially displays a placeholder or icon: 
        let img = addThumbNail(pic, pin);
        if (extension == ".heic") {
            uploadHeic(pic,img);
        } else if (pic.isPicture) {
            await loadImage(img, pic);
            setExif(pic, img);
            sendImage(pic, img);
        } else {
            sendFile(pic);
        }
    }
}

async function uploadHeic(pic, img) {
    pic.file = await heicConvertToJpg(pic.file);
    await loadImage(img, pic);
    sendImage(pic, img);
}

/**
 * Set an image from blob, and cache the image.
 * @param {Image} img 
 * @param {Picture} pic - with blob in pic.file
 */
async function loadImage(img, pic) {
    return new Promise((result, reject) => {
        let reader = new FileReader();
        reader.onload = () => {
            pic.type = extractFileType(reader.result);
            cacheLocalMedia(pic.id, reader.result);
            img.onload = () => result();
            img.src = reader.result;
        }
        reader.readAsDataURL(pic.file); 
    });
}

/** Create a thumbnail image and show it in the place editor or the sidebar.
 * 
 * @param {Picture} pic - pic.file has the image to thumb
 * @param {Pin?} pin - if present, attach the thumbnail to pin.place; else sidebar
 * @returns {Image} - the thumbnail
 */
function addThumbNail(pic, pin, alreadyloaded=false) {
    let img = document.createElement("img");
    img.className = "thumbnail";
    img.title = helping && pic.isPicture
        ? s("thumbnailHelp", "Right-click to add caption, sound, or YouTube. Drag to rearrange slideshow.")
        : img.title = pic.caption.replace(/<.*?>/, "").replace(/&.*?;/, " ") + " " + pic.extension;
    img.pic = pic;
    img.pin = pin;
    img.id = pic.id;
    img.src = alreadyloaded && pic.isPicture ? mediaSource(pic.id) : pic.fileTypeIcon;
    img.style.transform = pic.transform(img);
    if (pin) {
        addThumbnailToPlace(pin, img);
    } else {
        addThumbnailToSidebar(img);
    }
    return img;
}
function addThumbnailToPlace(pin, img) {
    img.height = 80;
    g("thumbnails").appendChild(img);
    g("picPrompt").style.display = "none";
    /*
    img.onclick = (event) => {
        showPic(this.pic, pin, true);
    }
    */

    // Reorder pictures: this is source image:
    img.ondragstart = function (event) {
        if (!this.pin.place.IsEditable) return;
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("Text", this.pic.id);
        event.target.style.opacity = "0.4";
        return true;
    }

    // Reorder pictures: this is target image:
    img.ondrop = function (event) {
        if (!this.pin.place.IsEditable) return;
        // Retrieve target image id:
        var src = g(event.dataTransfer.getData("Text"));
        // Make sure it's another pic, not some other item:
        if (src && src.pic) {
            // Rearrange pics in model:
            var pics = this.pin.place.pics;
            var fromIx = pics.indexOf(src.pic);
            var toIx = pics.indexOf(this.pic);
            if (fromIx == toIx) return;
            // assert(toIx >= 0 && fromIx >= 0);
            // Remove pic from old position:
            pics.splice(fromIx, 1);
            // List is now shorter:
            if (toIx > fromIx) toIx -= 1;
            // Insert in new position:
            pics.splice(toIx, 0, src.pic);

            // Rearrange pics in display:
            this.parentElement.insertBefore(src, this);
        }
    }

    // Reorder pictures: end of dragging whether dropped or not:
    img.ondragend = function (event) {
        this.style.opacity = "1.0";
    }

    img.ondragenter = function (event) {
        event.preventDefault();
        return true;
    }
    img.ondragover = function (event) {
        event.preventDefault();
        return false;
    }

    // Right-click:
    img.oncontextmenu = function (event) {
        event.cancelBubble = true;
        event.preventDefault();
        if (this.pin.place.IsEditable) {
            showMenu("petalMenu", this.pic, this.pin, event);
        }
    }
}

function addThumbnailToSidebar(img) {
    img.width = 200;
    img.title = s("picDragTip", "Drag this picture to place it on the map");
    // Replaces title if/when the geolocation of the photo is discovered:
    img.gpstitle = s("picRightTip", "Click to see recorded location. Then drag to place on map.");
    g("loosePicsShow").appendChild(img);
    index.hideIndex();
    img.onclick = function (event) {
        // Shift the map to the photo's GPS location:
        if (img.pic.loc) {
            stopPropagation(event);
            event.preventDefault();
            moveTo(img.pic.loc.e, img.pic.loc.n);
        }
    }
    img.oncontextmenu = function (event) {
        //showPic(img.pic, null, true);
        showMenu("loosePicMenu", img, null, event);
    }
    img.ondragstart = function (event) {
        // This is picked up by dragOverMap as cursor moves:
        event.dataTransfer.effectAllowed = "move";
        //event.dataTransfer.setDragImage(img,  0, 0);
    }
    img.ondragend = function (event) {
        // dropEffect is set by dragOverMap() as the cursor moves:
        if (event.dataTransfer.dropEffect != "move") return;
        // Add to a new or existing place a this location:
        img.pic.loc = map.screenToLonLat(event.pageX, event.pageY);
        assignToNearbyPlace(img.pic);
        // Remove from sidebar:
        g("loosePicsShow").removeChild(img);
        index.showIndex();
    }
}

window.heicQueue = [];
async function heicConvertToJpg(file) {
    /*
    if (!window.heicScriptLoading) {
        window.heicScriptLoading = true;
        insertScript("scripts/heic2any.min.js", () => {
            convertBufferedHeicFiles();
        });
    }
    */

    return new Promise((resolve, reject) => {
        window.heicQueue.push({ resolve: resolve, file: file });
        convertBufferedHeicFiles();
    });
}

async function convertBufferedHeicFiles() {
    if (window.heicQueue.length > 0 && typeof heic2any != "undefined") {
        log("converting heic - q:" + window.heicQueue.length);
        let item = window.heicQueue.shift();
        let converted = await heic2any({
            blob: item.file,
            toType: "image/jpeg",
            quality: 0.7
        });
        item.resolve(converted);
        convertBufferedHeicFiles();
    } else {
        if (window.heicQueue.length > 0) log("waiting heic script - q:" + window.heicQueue.length);
        else log("done heic queue");
    }
}


function setExif(pic, img, onload) {
    EXIF.getData(img, function () {
        var allMetaData = EXIF.getAllTags(this);
        if (allMetaData) {
            if (allMetaData.DateTimeOriginal) pic.date = allMetaData.DateTimeOriginal;
            pic.orientation = img.height < img.width && allMetaData.Orientation || 1;
            pic.caption = pic.date || "";
            img.title = img.title || pic.date || "";
            img.style.transform = pic.transform(img);
            if (allMetaData.GPSLongitude && allMetaData.GPSLatitude) {
                if (img.gpstitle) img.title = img.gpstitle;
                pic.loc = {
                    e: Sexagesimal(allMetaData.GPSLongitude) * (allMetaData.GPSLongitudeRef == "W" ? -1 : 1),
                    n: Sexagesimal(allMetaData.GPSLatitude) * (allMetaData.GPSLatitudeRef == "N" ? 1 : -1)
                };
            }
        }
        if (onload) onload(pic, img);
    });
}


function extractFileType(data) {
    return data.match(/data:(.*);/)[1];
}


function placeLoosePicCmd(img, x) {
    img.pic.loc = targetLocation();
    assignToNearbyPlace(img.pic);
    // Remove from sidebar:
    g("loosePicsShow").removeChild(img);
    index.showIndex();
}

// Used when dragging a picture to a place
function dragOverMap(event) {
    if (event.dataTransfer.effectAllowed == "move") {
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
    }
}



/**
 * Assign a pic to the nearest place authored by current user. If none nearby, create new place.
 * @param {Picture} pic 
 */
function assignToNearbyPlace(pic) {
    var assignedPlace = null;
    let shortestDistanceSquared = 1.0;
    for (var id in Places) {
        let place = Places[id];
        let d = distanceSquared(place.loc, pic.loc);
        if (d < shortestDistanceSquared) {
            if (!pic.user || pic.user == window.user) {
                assignedPlace = place;
                shortestDistanceSquared = d;
            }
        }
    }

    // Assign to an existing or new place
    if (shortestDistanceSquared > 1e-7) {
        var assignedPin = map.addOrUpdate(makePlace(pic.loc.e, pic.loc.n));
        assignedPlace = assignedPin.place;
        assignedPlace.text = "Pics " + (pic.date || "").replace(/\.[0-9]{3}.*/, ""); //assignedPlace.id.replace(/T.*/, "");
        assignedPlace.tags += " ego";
        assignedPlace.pics.push(pic);
        map.updatePin(assignedPin);
    } else {
        assignedPlace.pics.push(pic);
        // assignedPlace.tags += " ego";
    }
    // console.info(assignedPlace.id + " -> " + pic.id);
    sendPlace(assignedPlace);
    return assignedPlace;
}


function distanceSquared(loc1, loc2) {
    let de = loc1.e - loc2.e;
    let dn = loc1.n - loc2.n;
    // 1 deg N is approx 2 * distance of 1 deg E
    return de * de + dn * dn * 4;
}