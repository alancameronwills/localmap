
class LightboxU extends U {
    constructor(existingElement) {
        super(
            {
                id: "lightbox", c: "lbTall", style: "display:none", s: [
                    {
                        id: "lbTitle",
                        style: "font-size: x-large;padding: 10px;"
                    },
                    {
                        id: "lbMid", s: [
                            {
                                id: "lbPicCaptionContainer",
                                style: "display: flex; flex-direction:row; align-items:center;  //flex-direction: column;justify-content: center;"
                                    + "position: absolute;width: 100%;",
                                s: [
                                    {
                                        style: "position: absolute;left:0px;width:100%;height: 100%;opacity:0;transition: all ease-in-out 1s;",
                                        s: [
                                            {
                                                id: "lbImg0", t: "img",
                                                style: "position: relative;object-fit: contain;width: 100%;height: 90%;"
                                            },
                                            { id: "lbCaption0", style: "text-align: center;overflow:hidden;" }
                                        ]
                                    },
                                    {
                                        style: "position: absolute;left:0px;width:100%;height: 100%;transition: all ease-in-out  1s; ",
                                        s: [
                                            {
                                                id: "lbImg1", t: "img",
                                                style: "position: relative;object-fit: contain;width: 100%;height: 90%;"
                                            },
                                            { id: "lbCaption1", style: "text-align: center;" }
                                        ]
                                    }
                                ]
                            },
                            {
                                id: "lbExpander", t: "img", c: "selectable", onclick: e => lightboxU.expandPic(e), src: "img/expand.png", title: "expand image",
                                style: "position: absolute; top: 46px; right:4px;z-index: 250;"
                            },
                            {
                                id: "lbLeft", c: "lightboxside noselect",
                                style: "left:0px;text-align: left;",
                                s: [
                                    {
                                        c: "selectable", onclick: e => doLightBoxNext(-1, e), h: "&#10094;",
                                        style: "margin-left:5%;z-index:250;"
                                    }
                                ]
                            },
                            {
                                id: "lbRight", c: "lightboxside noselect",
                                style: "right:0px;text-align: right;",
                                s: [
                                    {
                                        c: "selectable", onclick: e => doLightBoxNext(1, e), h: "&#10095;",
                                        style: "margin-right:5%;z-index:250;"
                                    }
                                ]
                            },]
                    }, // lbMid
                    {
                        id: "lbScroller",
                        style: "position: absolute;overflow-y: auto;"
                            + " margin-left:1%; bottom: 46px;",
                        s: [
                            { // This part used for single-picture places when not expanded
                                id: "onePicBox", style: "overflow:hidden", s: [
                                    {
                                        id: "onePic", t: "img",
                                        style: "max-height:70vh;width:100%;object-fit:contain;"
                                    },
                                    { id: "oneCaption", style: "text-align:center;padding-bottom:10px" },
                                    {
                                        id: "lbOneExpander", t: "img", c: "selectable",
                                        onclick: e => lightboxU.expandPic(e), src: "img/expand.png", title: "expand image",
                                        style: "position: absolute; top: 0px; right:4px;"
                                    }]
                            },
                            {
                                id: "lbDescriptionComments", style: "padding:4px", s: [
                                    { id: "lbDescription"},
                                    { id: "lightboxComments", onclick: e => doLightBoxNext(0, e) }
                                ]
                            }
                        ]
                    },
                    {
                        id: "lbBottom",
                        style: "position: absolute;height:40px;bottom:0px;right:0px;",
                        s: [
                            {
                                id: "lbAuthorBox",
                                style: "display: inline-block; text-align: right;padding-right:4px;",
                                s: [
                                    { id: "lbAuthor", t: "span", style: "font-size:smaller" },
                                    { t: "br" },
                                    {
                                        id: "contactUs", t: "span", c: "smallBlueButton",
                                        h: "Tell " + window.project.org + " more about this!",
                                        onclick: e => contactx(e, window.lightboxU.currentPin.place)
                                    }]
                            },
                            {
                                id: "getLinkButton2", c: "panelButton addButton",
                                onclick: e => showLink(window.lightboxU.currentPin.place, e), title: "Share this place", s: [
                                    { t: "img", src: "img/getlink.png" }
                                ]
                            },
                            {
                                id: "lightboxEditButton", c: "panelButton addButton",
                                onclick: e => switchToEdit(), title: "Edit", s: [
                                    { t: "img", src: "img/edit.png" }
                                ]
                            }
                        ]
                    },
                    {
                        id: "lightboxBack", c: "panelButton squareButton",
                        title: "Back to map", onclick: e => lightboxU.hide(), h: "X",
                        style: "position:absolute;top:6px;right:6px;font-size:larger; background-color: rgb(192,245,192);"
                    }
                ]
            }, existingElement
        );
        this.stayExpanded = false;
    }
    /*
    setContent(title, img, caption, description = "") {
        this.lightbox.className = "lightboxSlides lbTall";
        this.lbTitle.innerHTML = title;
        this.lbImg.src = img;
        this.lbCaption.innerHTML = caption || "";
        this.lbDescription.innerHTML = description;
        this.onePicBox.style.display = "none";
        this.show();
    }
    setTextBlock(title, img, caption, description = "") {
        this.lightbox.className = "lightboxScroll lbTall";
        this.lbTitle.innerHTML = title;
        this.onePic.src = img;
        this.oneCaption.innerHTML = caption;
        this.lbDescription.innerHTML = description;
        this.onePicBox.style.display = "block";
        this.show();
    }
    */

    /** Set lightbox to show a place and one of its pics
     * @param {Pin} pin Map pin showing the place
     * @param {Pic} pic A media item in the place, or null to just show text
     * @pre !pic || pin.place.pics.indexOf(pic) >= 0
     */
    setPlacePic(pin, pic) {
        this.setPlace(pin);
        this.setPic(pic);
    }

    /** Set lightbox to show a new place.
     * No effect if current place is already set.
     * @param {*} pin Map pin
     */
    setPlace(pin) {
        if (pin == this.currentPin) return;
        this.currentPin = pin;
        this.currentPic = null;
        let description = pin.place.NonMediaFiles.map(f => `<a href="${PicUrl(f.id)}" target="_blank"><img src="${f.fileTypeIcon}" style="border:2px solid blue;float:right"/></a>`).join('')
            + fixInnerLinks(pin.place.Body);
        this.lightbox.className = "lightboxScroll";
        //if (this.stayExpanded) this.expand();
        text(this.lbAuthor, pin.place.DisplayName +
            (window.innerWidth > 400 ? " " + pin.place.modified : ""));
        html(this.lbTitle, pin.place.Title);
        html(this.lbDescription, description);
        this.black();
        show(this.lightboxEditButton, pin.place.isEditable ? "inline-block" : "none");
        this.show();
        showComments(pin.place, lightboxU.lightboxComments);
    }

    /** Set lightbox to show a new pic within current place.
     * Call after setPlace.
     * @pre this.currentPin.place.pics.indexOf(pic)>=0
     * @param {*} pic 
     */
    setPic(pic) {
        this.currentPic = pic;
        if (!pic) {
            this.black();
            return;
        }
        
        let multiple =  this.currentPin.place.pics.length > 1;
        if (multiple || this.stayExpanded) {
            hide(this.onePicBox);
            this.onePic.src = ""; this.oneCaption.innerHTML = "";
            show(this.lbMid);
            let newPicAndCaption = this.lbPicCaptionContainer.children[0];
            let oldPicAndCaption = this.lbPicCaptionContainer.children[1];
            this.lbPicCaptionContainer.insertBefore(oldPicAndCaption, newPicAndCaption);
            // assert newPicAndCaption.display.opacity == 0
            
            this.setPicInImage(pic, "lightboxSlides", newPicAndCaption.children[0], newPicAndCaption.children[1],
                () => { newPicAndCaption.style.opacity = 1; oldPicAndCaption.style.opacity = 0; }); 
/*            this.insertPic(pic, "lightboxSlides", newPicAndCaption,
                () => { newPicAndCaption.style.opacity = 1; oldPicAndCaption.style.opacity = 0; });
 */
        } else {
            hide(this.lbMid);
            this.lbImg0.src = ""; this.lbCaption0.innerHTML = "";
            this.lbImg1.src = ""; this.lbCaption1.innerHTML = "";
            hide(this.onePic);
            this.setPicInImage(pic, "lightboxScroll", this.onePic, this.oneCaption);
            show(this.onePicBox);
        }
    }
    insertPic(pic, className, imageParent, onload) {
        let caption = pic.Caption.replace(/\/\/(.*)/, (x, y) => `<br/><small>${y}</small>`);
        let auxClasses = " lbTall" + (this.stayExpanded ? " lightboxExpand" : "");
        this.lightbox.className = className + auxClasses;
        let img = pic.imgFromPic(() => {
            html(c(null, "div", imageParent), caption);
            if (onload) onload();
        });
        img.style = "max-height:70vh;width:100%;object-fit:contain;";
        imageParent.appendChild(img);
    }
    
    setPicInImage(pic, className, imageLoc, captionLoc, onload) {
        let caption = pic.Caption.replace(/\/\/(.*)/, (x, y) => `<br/><small>${y}</small>`);
        let auxClasses = " lbTall" + (this.stayExpanded ? " lightboxExpand" : "");
        this.lightbox.className = className + auxClasses;
        pic.setImgFromPic(imageLoc, "", () => {
            show(imageLoc);
            html(captionLoc, caption);
            if (onload) onload();
        });
    }
    
    expand() {
        this.stayExpanded = true;
        this.setPic(this.currentPic, true);
    }
    unexpand() {
        this.lightbox.classList.remove("lightboxExpand");
        this.stayExpanded = false;
    }
    isExpanded() {
        return this.lightbox.classList.contains("lightboxExpand");
    }
    show() {
        show(this.lightbox);
    }

    /** Open a bigger version of the picture
     * 
     */
    expandPic(event) {
        stopPropagation(event);
        if (!this.isExpanded()) {
            this.expand();
        } else {
            window.open(this.lbImg.src.toString());
        }
    }

    /**
     * Stop showing a picture in the lightbox and playing associated sound.
     * @param {boolean} keepBackground Don't fade, we're going to show another
     */
    hide(keepBackground = false) {
        stopPicTimer();
        // Stop sound accompanying a picture
        if (!keepBackground || lightboxU.currentPic && lightboxU.currentPic.sound) {
            g("audiocontrol").pause();
            hide("audiodiv");
        }
        //if (box.currentPic && box.currentPin && box.currentPin.place.IsEditable) { box.currentPic.caption = g("lightboxCaption").innerHTML; }
        if (!keepBackground) {
            hide(this.lightbox);
            this.black();
            lightboxU.currentPin = null;
        }
    }

    /** Switch to text-only
     * 
     */
    black() {
        this.lbImg0.src = "";
        this.lbImg0.title = "";
        html(this.lbCaption0, "");
        this.lbImg1.src = "";
        this.lbImg1.title = "";
        html(this.lbCaption1, "");
        this.onePic.src = "";
        this.oneCaption.title = "";
        html(this, oneCaption, "");
        hide(this.onePicBox);
        hide(this.lbMid);
    }
    isShowing() {
        return this.lightbox.style.display != "none";
    }

}