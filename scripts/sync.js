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


/*
 * FormData for XMLHttpRequest 2  -  Polyfill for Web Worker  (c) 2012 Rob W
 * License: Creative Commons BY - http://creativecommons.org/licenses/by/3.0/
 * - append(name, value[, filename])
 * - toString: Returns an ArrayBuffer object
 * 
 * Specification: http://www.w3.org/TR/XMLHttpRequest/#formdata
 *                http://www.w3.org/TR/XMLHttpRequest/#the-send-method
 * The .append() implementation also accepts Uint8Array and ArrayBuffer objects
 * Web Workers do not natively support FormData:
 *                http://dev.w3.org/html5/workers/#apis-available-to-workers
 **/
(function() {
    // Export variable to the global scope
    (this == undefined ? self : this)['FormData'] = FormData;

    var ___send$rw = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype['send'] = function(data) {
        if (data instanceof FormData) {
            if (!data.__endedMultipart) data.__append('--' + data.boundary + '--\r\n');
            data.__endedMultipart = true;
            this.setRequestHeader('Content-Type', 'multipart/form-data; boundary=' + data.boundary);
            data = new Uint8Array(data.data).buffer;
        }
        // Invoke original XHR.send
        return ___send$rw.call(this, data);
    };

    function FormData() {
        // Force a Constructor
        if (!(this instanceof FormData)) return new FormData();
        // Generate a random boundary - This must be unique with respect to the form's contents.
        this.boundary = '------RWWorkerFormDataBoundary' + Math.random().toString(36);
        var internal_data = this.data = [];
        /**
        * Internal method.
        * @param inp String | ArrayBuffer | Uint8Array  Input
        */
        this.__append = function(inp) {
            var i=0, len;
            if (typeof inp === 'string') {
                for (len=inp.length; i<len; i++)
                    internal_data.push(inp.charCodeAt(i) & 0xff);
            } else if (inp && inp.byteLength) {/*If ArrayBuffer or typed array */
                if (!('byteOffset' in inp))   /* If ArrayBuffer, wrap in view */
                    inp = new Uint8Array(inp);
                for (len=inp.byteLength; i<len; i++)
                    internal_data.push(inp[i] & 0xff);
            }
        };
    }
    /**
    * @param name     String                                  Key name
    * @param value    String|Blob|File|Uint8Array|ArrayBuffer Value
    * @param filename String                                  Optional File name (when value is not a string).
    **/
    FormData.prototype['append'] = function(name, value, filename) {
        if (this.__endedMultipart) {
            // Truncate the closing boundary
            this.data.length -= this.boundary.length + 6;
            this.__endedMultipart = false;
        }
        var valueType = Object.prototype.toString.call(value),
            part = '--' + this.boundary + '\r\n' + 
                'Content-Disposition: form-data; name="' + name + '"';

        if (/^\[object (?:Blob|File)(?:Constructor)?\]$/.test(valueType)) {
            return this.append(name,
                            new Uint8Array(new FileReaderSync().readAsArrayBuffer(value)),
                            filename || value.name);
        } else if (/^\[object (?:Uint8Array|ArrayBuffer)(?:Constructor)?\]$/.test(valueType)) {
            part += '; filename="'+ (filename || 'blob').replace(/"/g,'%22') +'"\r\n';
            part += 'Content-Type: application/octet-stream\r\n\r\n';
            this.__append(part);
            this.__append(value);
            part = '\r\n';
        } else {
            part += '\r\n\r\n' + value + '\r\n';
        }
        this.__append(part);
    };
})();