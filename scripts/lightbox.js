
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
                                style: "display: flex;flex-direction: column;justify-content: center;"
                                    + "position: absolute;top: 46px;width: 100%;",
                                s: [
                                    {
                                        id: "lbPicAndCaption",
                                        style: "position: relative;max-height: 100%;",
                                        s: [
                                            {
                                                id: "lbImg", t: "img",
                                                style: "position: relative;object-fit: contain;width: 100%;max-height: 90%;"
                                            },
                                            { id: "lbCaption", style: "text-align: center;" },
                                            {
                                                id: "lbExpander", t: "img", c: "selectable", onclick: e=>expandPic(e), src: "img/expand.png", title: "expand image",
                                                style: "position: absolute; top: 0px; right:4px;z-index: 250;"
                                            }
                                        ]
                                    }
                                ]
                            },
                            {
                                id: "lbLeft", c: "lightboxside noselect",
                                style: "left:0px;text-align: left;",
                                s: [
                                    {
                                        c: "selectable", onclick: e => doLightBoxNext(-1, e), h: "&#10094;",
                                        style: "margin-left:5%"
                                    }
                                ]
                            },
                            {
                                id: "lbRight", c: "lightboxside noselect",
                                style: "right:0px;text-align: right;",
                                s: [
                                    {
                                        c: "selectable", onclick: e => doLightBoxNext(1, e), h: "&#10095;",
                                        style: "margin-right:5%"
                                    }
                                ]
                            },]
                    }, // lbMid
                    {
                        id: "lbScroller",
                        style: "position: absolute;overflow-y: auto;"
                            + "width: 100%; bottom: 46px;padding: 4px;",
                        s: [{
                            id: "onePicBox", s: [
                                {
                                    id: "onePic", t: "img",
                                    style: "max-height:70vh;width:100%;object-fit:contain;"
                                },
                                { id: "oneCaption", style: "text-align:center;padding-bottom:10px" }]
                        },
                        { id: "lbDescription" },
                        { id: "lightboxComments", onclick: e => doLightBoxNext(0, e) }
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
                                        onclick: e=>contactx(e, g('lightbox').currentPin.place)
                                    }]
                            },
                            {
                                id: "getLinkButton2", c: "panelButton addButton",
                                onclick: e=>showLink(g('lightbox').currentPin.place, e), title: "Share this place", s: [
                                    { t: "img", src: "img/getLink.png" }
                                ]
                            },
                            {
                                id: "lightboxEditButton", c: "panelButton addButton",
                                onclick: e=>switchToEdit(), title: "Edit", s: [
                                    { t: "img", src: "img/edit.png" }
                                ]
                            }
                        ]
                    },
                    {
                        id: "lightboxBack", c: "panelButton squareButton",
                        title: "Back to map", onclick: e=>hidePic(), h: "X",
                        style: "position:absolute;top:6px;right:6px;font-size:larger; background-color: rgb(192,245,192);"
                    }
                ]
            }, existingElement
        );
        this.stayExpanded = false;
    }
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
    setPlace(isEditable, author, title, description) {
        this.lightbox.className = "lightboxScroll";
        if (this.stayExpanded) this.expand();
        show(this.lightboxEditButton, isEditable ? "inline-block" : "none");
        text(this.lbAuthor, author);
        html(this.lbTitle, title);
        html(this.lbDescription, description);
        text(this.lbCaption, "");
        text(this.oneCaption, "");
        hide(this.lbImg);
        hide(this.onePic);
        show(this.lightboxEditButton, isEditable?"inline-block":"none");
        this.show();
    }
    setPic(pic, multiple = true) {
        this.lightbox.classList.add("lbTall");
        if (multiple) {
            this.lightbox.className = "lightboxSlides lbTall" + (this.stayExpanded ? " lightboxExpand" : "");
            setImgFromPic(this.lbImg, pic, "", () => {
                show(this.lbImg);
                html(multiple ? this.lbCaption : this.oneCaption, pic.Caption);
            });
        } else {
            this.lightbox.className = "lightboxScroll lbTall" + (this.stayExpanded ? " lightboxExpand" : "");
            setImgFromPic(this.onePic, pic, "", () => {
                show(this.onePic);
                html(this.oneCaption, pic.Caption);
            });
        }
    }
    expand() {
        this.lightbox.classList.add("lightboxExpand");
        this.stayExpanded = true;
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
        this.lbImg.src = "";
        this.lbImg.title = "";
        html(this.lbCaption, "");
        this.onePic.src = "";
        this.oneCaption.title = "";
        html(this, oneCaption, "");
    }
    isShowing() {
        return this.lightbox.style.display != "none";
    }

}