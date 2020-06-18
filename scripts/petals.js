

class Petals {

    /** Set up the hexagon of "petals" for displaying pictures on hover.
     *  Called once on init.
     */
    constructor(isStar = false) {
        this.isStar = isStar;
        this.petalRadius = 100.0;
        var petalSize = this.petalRadius * 2 + "px";
        this.petals = g("petals");
        if (!petals) return;
        // Top left of hexagon shapes.
        // With a horizontal middle row:
        var posh = [ { x: 1, y: -1 }, { x: 0, y: 0.79 },
        { x: -2, y: 0.79 }, { x: -3, y: -1 }, { x: -2, y: -2.79 }, { x: 0, y: -2.79 }, { x: -1, y: -1 }];
        // Central text with no pic background:
        var poshb = [ { x: -1, y: -1 }, { x: 1, y: -1 }, { x: 0, y: 0.79 },
            { x: -2, y: 0.79 }, { x: -3, y: -1 }, { x: -2, y: -2.79 }, { x: 0, y: -2.79 }];
        // With a vertical middle row:
        var posv = [{ x: -1, y: -3 }, { x: 2.79, y: -2 }, { x: 2.79, y: 0 },
        { x: -1, y: 1 }, { x: -2.79, y: 0 }, { x: -2.79, y: -2 }, { x: -1, y: -1 }];
        var pos = poshb;
        var child1 = petals.firstElementChild;
        for (var i = pos.length - 1; i >= 0; i--) {
            let petal = document.createElement("img");
            petal.className = "petal";
            petal.style.top = (pos[i].x + 2.79) * this.petalRadius + "px";
            petal.style.left = (pos[i].y + 3) * this.petalRadius + "px";
            petal.style.width = petalSize;
            petal.style.height = petalSize;
            // Keep the central text disc on top:
            if (child1) this.petals.insertBefore(petal, child1);
            else this.petals.appendChild(petal);
            this.petalBehavior(petal);
        }

        //petals.onclick = (e) => this.hide(e);

        let middle =  g("petaltext");
        if (this.isStar) { 
            middle.style.backgroundColor = "rgba(0,0,0,0.2)";
            middle.style.top = 2.56 * this.petalRadius + "px";
            middle.style.left = 2.78 * this.petalRadius + "px";
            middle.style.height = this.petalRadius*0.33 + "px";
            middle.style.width = this.petalRadius*0.33 + "px";
        } else {
            middle.style.top = 1.79 * this.petalRadius + "px";
            middle.style.left = 2 * this.petalRadius + "px";
            middle.style.height = petalSize;
            middle.style.width = petalSize;
        }
        this.petalBehavior(middle);

        if (this.isStar) {
            this.textBox = document.createElement("div");
            this.textBox.className = "infoBox";
            this.textBox.style.top = 3.1 * this.petalRadius + "px";
            this.textBox.style.left = 3.1 * this.petalRadius + "px";
            this.textBox.style.width = 3 * this.petalRadius + "px";
            this.textBox.style.height = "auto";
            this.petals.appendChild(this.textBox);
            this.petalBehavior(this.textBox);
        } else {
            this.textBox = middle;
        }

        // Don't lose petals on expanding a picture:
        g("lightbox").onmouseenter = function (e) {
            if (this.petalHideTimeout) {
                clearTimeout(this.petalHideTimeout);
                this.petalHideTimeout = null;
            }
        }

        // Allow user to operate audio controls without losing petals:
        g("audiodiv").addEventListener("mouseenter", function (e) {
            if (this.petalHideTimeout) {
                clearTimeout(this.petalHideTimeout);
                this.petalHideTimeout = null;
            }
        });

    }

    pinMouseOver(e, pin, onlyIfNoLightbox) {
        this.popPetals(e, pin, onlyIfNoLightbox);
    }

    pinMouseOut(e) {
        this.petalHideTimeout = setTimeout(() => {
            this.hide();
        }, 1000);
    }


    /**
     * Show the petals, filled with text and pictures.
     * @param {*} e   Hover event that triggered.
     */
    popPetals(e, pin, onlyIfNoLightbox) {
        appInsights.trackEvent({ name: "popPetals", properties: { place: pin.place.Title, id: pin.place.id.replace(" ", "+").replace("|", "%7C") } });
        if (onlyIfNoLightbox && window.lightboxShowing) return;
        if (window.lightboxShowing) hidePic();
        var petals = g("petals");
        petals.style.left = (e.pageX - this.petalRadius * 3) + "px";
        petals.style.top = (e.pageY - 2.79 * this.petalRadius) + "px";
        this.textBox.innerHTML = pin.place.Short;
        this.textBox.pin = pin;
        var images = petals.children;
        var pics = pin.place.pics;
        g("petaltext").style.backgroundColor = pics.length == 0 ? "rgba(0,0,0,0.6)" : "rgba(0,0,0,0.2)";
        /*var centralPic = pics.length == 1 && pics[0].isPicture;
        middle.style.backgroundImage = centralPic ? "url('" + mediaSource(pics[0].id) + "')" : null;
        middle.style.backgroundSize = "cover"; */
        for (var i = 0, p = 0; i < images.length; i++) {
            let petal = images[i];
            petal.pin = pin;
            if (petal.className != "petal") continue;
            if (p < pics.length /*&& !centralPic*/) {
                let pic = pics[p++];
                if (pic.isPicture) {
                    setImgFromPic(images[i], pic);
                } else if (pic.isAudio) {
                    petal.src = "img/sounds.png";
                    petal.pic = pic;
                    petal.style.transform = "rotate(0)";
                    petal.title = pic.caption;
                    playAudio(pic);
                } else {
                    if (pic.extension == ".pdf") {
                        petal.src = "img/petalPdf.png";
                    }
                    else petal.src = "img/file.png";
                    petal.pic = pic;
                    petal.style.transform = "rotate(0)";
                    petal.title = pic.caption + " " + pic.extension;
                }
                images[i].style.visibility = "visible";
            } else {
                petal.src = "";
                petal.pic = null;
                petal.style.visibility = "hidden";
            }
        }
        petals.style.display = "block";
        showTrail(pin.place);

    }


    /** Keep petals showing while mouse moves between them.
     * @param {*} petal 
     */
    petalPreserve(petal) {
        petal.onmouseout = (e) => {
            if (petal.pin || petal.pic) {
                if (petal.showingMenu) petal.showingMenu = false;
                else {
                    this.petalHideTimeout = setTimeout(() => {
                        hideOtherTrail(petal.pin.place);
                        this.hide();
                    }, 500);
                }
            }
        };
        petal.onmouseenter = (e) => {
            window.deviceHasMouseEnter = true;
            if (this.petalHideTimeout) {
                clearTimeout(this.petalHideTimeout);
                this.petalHideTimeout = null;
            }
        };
    }


    // Behavior defns for all children of petals,  incl menu
    petalBehavior(petal) {
        this.petalPreserve(petal);
        petal.onclick = (e) => {
            stopPropagation(e);
            if (petal.pic) {
                if (petal.pic.isAudio) {
                    g("audiocontrol").play();
                } else {
                    showPic(petal.pic, petal.pin, true, false, true);
                }
            }
            else if (petal.pin) {
                this.hide();
                presentSlidesOrEdit(petal.pin, e.pageX, e.pageY, false, true);
            }
            else this.hide();
        };
        petal.oncontextmenu = (e) => {
            stopPropagation(e);
            if (!petal.pin.place.IsEditable) return;
            petal.showingMenu = true;
            if (petal.pic) {
                showMenu("petalMenu", petal.pic, petal.pin, e);
            } else if (petal.pin) {
                showMenu("petalTextMenu", petal.pin, null, e);
            }
        }
    }

    /** Hide petals on moving cursor out.
     * Called 500ms after cursor moves out of a petal.
     * Timeout is cancelled by moving into another petal.
     */
    hide(e) {
        let petalset = g("petals");
        hide(petalset);
        if (!window.lightboxShowing) {
            hide("audiodiv");
            if (g("audiocontrol")) g("audiocontrol").pause();
        }
        let petals = petalset.children;
        for (var i = 0; i < petals.length; i++) {
            petals[i].src = "";
        }

    }
}


