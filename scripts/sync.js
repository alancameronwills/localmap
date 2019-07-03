var queue = [];
var dict = {};
var sendTimer = null;

onmessage = function (e) {
    dict[e.data.id] = e.data;
    queue.push(e.data.id);
    kick();
}

// Time when we last did something:
var isActive = null;
function kick() {
    if (!isActive || Date.now() - isActive > 2 * 60 * 1000) {
        console.info("kick");
        trySend();
    }
}
//kick();

function trySend() {
    if (sendTimer) { clearTimeout(sendTimer); sendTimer = null; }
    if (queue.length == 0) {
        sendTimer = setTimeout(trySend, 10 * 6000);
        isActive = null;
        console.info("inactive");
    } else {
        if (!dict[queue[0]]) {
            // Item was twice on queue, already dealt with
            queue.shift();
            trySend();
        } else {
            isActive = Date.now();
            console.info("active");
            upload(dict[queue[0]]);
        }
    }
}

// contentType : ("place" | "picImg" | ...), content: (File | JSON)
function upload(item) {
    let req = new XMLHttpRequest();
    let formData = new FormData();
    if (item.remoteFileName) {
        formData.append(item.contentType, item.content, item.remoteFileName);
    }
    else {
        formData.append(item.contentType, item.content);
    }
    formData.append("id", item.id);
    req.onreadystatechange = function () {
        if (this.readyState == 4) {
            // done
            if (this.responseText.substr(0,2) == "ok") {
                delete dict[item.id];
                if (queue[0]==item.id) queue.shift();
                console.warn("Success " + item.id);
                trySend();
            }
            else {
                console.error("fail: "+ this.responseText);
                sendTimer = setTimeout(trySend, 10 * 1000);
                queue.push(queue.shift());
            }
        }
    }
    console.info("Start send " + item.id);
    req.open("POST", '../upload.php');
    req.send(formData);
    console.info("Started send");
}
