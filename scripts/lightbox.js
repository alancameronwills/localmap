
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
                                        id: "lbPicAndCaption",
                                        style: "position: absolute;left:0px;width:100%;height: 100%;transition: all ease-in-out  1s;",
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
                                id: "lbExpander", t: "img", c: "selectable", onclick: e => expandPic(e), src: "img/expand.png", title: "expand image",
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
                                        id: "lbOneExpander", t: "img", c: "selectable", onclick: e => expandPic(e), src: "img/expand.png", title: "expand image",
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
                                        h: "Contact us about this item",
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
                        title: "Back to map", onclick: e => hidePic(), h: "X",
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
    setPlace(isEditable, author, title, description) {
        this.lightbox.className = "lightboxScroll";
        //if (this.stayExpanded) this.expand();
        show(this.lightboxEditButton, isEditable ? "inline-block" : "none");
        text(this.lbAuthor, author);
        html(this.lbTitle, title);
        html(this.lbDescription, description);
        this.black();
        show(this.lightboxEditButton, isEditable ? "inline-block" : "none");
        this.show();
    }
    setPic(pic, multiple = true) {
        this.currentPic = pic;
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
        } else {
            hide(this.lbMid);
            this.lbImg0.src = ""; this.lbCaption0.innerHTML = "";
            this.lbImg1.src = ""; this.lbCaption1.innerHTML = "";
            hide(this.onePic);
            this.setPicInImage(pic, "lightboxScroll", this.onePic, this.oneCaption);
            show(this.onePicBox);
        }
    }
    setPicInImage(pic, className, imageLoc, captionLoc, onload) {
        let caption = pic.Caption.replace(/\/\/(.*)/, (x, y) => `<br/><small>${y}</small>`);
        let auxClasses = " lbTall" + (this.stayExpanded ? " lightboxExpand" : "");
        this.lightbox.className = className + auxClasses;
        setImgFromPic(imageLoc, pic, "", () => {
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
    hide() {
        hide(this.lightbox);
        this.black();
    }
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