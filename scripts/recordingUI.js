/**
 * Controls the audio recording panel in the place editor.
 */
class RecordingUI {
    /** Show the recording control panel and start recording.
     * @param {*} pin The current map pin to which to attach recordings.
     */
    constructor(recordingControlDiv, pin) {
        this.pin = pin;
        this.recordingControlDiv = recordingControlDiv;

        html(recordingControlDiv, `<h2 style='width:100%'>${s("recording", "RECORDING")}</h2>`);
        
        this.stopButton = U.c("stopButton", "button", recordingControlDiv);
        html(this.stopButton, "&#5110; " + s("saveButton", "Save"));
        this.stopButton.addEventListener("click", () => { this.stopRecording(true) });
        
        /*
        this.pauseButton = U.c("pauseButton", "button", recordingControlDiv);
        html(this.pauseButton, "&#10074; " + s("pause", "Pause"));
        this.pauseButton.addEventListener("click", () => { this.pauseRecording() });
        */

        this.cancelButton = U.c("cancelButton", "button", recordingControlDiv);
        html(this.cancelButton, "&#10006; " + s("cancelButton", "Cancel"));
        this.cancelButton.addEventListener("click", () => { this.stopRecording(false) });

        this.recordingsList = g("recordingsList");
        show(recordingControlDiv, "flex");
        this.startRecording();
    }

    /**
     * On user clicks record button.
     */
    startRecording() {

        console.log("recordButton clicked");

        /* https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia
           Parameters: https://addpipe.com/blog/audio-constraints-getusermedia/ */

        navigator.mediaDevices.getUserMedia({audio:true, video:false}).then((stream) => {
            console.log("getUserMedia() success, stream created, initializing Recorder.js ...");
            /* assign to gumStream for later use */
            this.gumStream = stream;
            /* use the stream */
            let input = this.audioContext.createMediaStreamSource(stream);
            /* Recorder in 
            and configure to record mono sound (1 channel) Recording 2 channels will double the file size */
            this.rec = new Recorder(input, {
                numChannels: 1
            });
            //start the recording process 
            this.rec.record();
            console.log("Recording started");
            this.isPaused = false;
        }).catch(function (err) {
            log("Recording failed " + err);
            this.close();
        });

        if (!this.audioContext) {
            this.audioContext = new (AudioContext || webkitAudioContext);
        }
        this.audioContext.resume();
    }

    /** On user clicks pause button */
    pauseRecording() {
        if (this.isPaused) this.rec.resume();
        else this.rec.pause();
        this.isPaused = !this.isPaused;
    }

    /** On user clicks stop or cancel button */
    stopRecording(keepIt) {
        console.log("stopRecording");
        hide(this.recordingControlDiv);

        //tell the recorder to stop the recording 
        this.rec.stop(); //stop microphone access 
        this.gumStream.getAudioTracks()[0].stop();
        //create the wav blob and upload it
        if (keepIt) {
            this.rec.exportWAV((blob) => {
                blob.name = new Date().toISOString() + ".wav";
                doUploadFiles(null, [blob], this.pin)
                // this.createDownloadLink(blob)
            });
        }
    }

    /** Editor window closed */
    close() {
        this.stopRecording(false);
    }

    createDownloadLink(blob) {
        let li = U.c(null, "li", this.recordingsList);
        let au = U.c(null, "audio", li);
        let link = U.c(null, "a", li);

        var url = URL.createObjectURL(blob);
        au.controls = true;
        au.src = url;

        link.href = url;
        link.download = new Date().toISOString() + '.wav';
        link.innerHTML = link.download;
    }

}
