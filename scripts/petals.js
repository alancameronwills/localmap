/** Pics that pop up around a place on hover */

class Petals {

    /** Set up the hexagon of "petals" for displaying pictures on hover.
     *  Called once on init.
     * @param {boolean} isStar True = put the text to one side; false = text atop centre petal
     */
    constructor(isStar = false) {
        this.isStar = isStar;
        this.petalRadius = 100.0;
        var petalSize = this.petalRadius * 2 + "px";
        this.petals = g("petals");
        this.petals.className = "petals";
        if (!this.petals) return;
        // Top left of hexagon shapes.
        // With a horizontal middle row:
        var posh = [{ x: 1, y: -1 }, { x: 0, y: 0.79 },
        { x: -2, y: 0.79 }, { x: -3, y: -1 }, { x: -2, y: -2.79 }, { x: 0, y: -2.79 }, { x: -1, y: -1 }];
        // Central text with no pic background:
        var poshb = [{ x: -1, y: -1 }, { x: 1, y: -1 }, { x: 0, y: 0.79 },
        { x: -2, y: 0.79 }, { x: -3, y: -1 }, { x: -2, y: -2.79 }, { x: 0, y: -2.79 }];
        // With a vertical middle row:
        var posv = [{ x: -1, y: -3 }, { x: 2.79, y: -2 }, { x: 2.79, y: 0 },
        { x: -1, y: 1 }, { x: -2.79, y: 0 }, { x: -2.79, y: -2 }, { x: -1, y: -1 }];
        var pos = poshb;
        // Create and position the shapes:
        for (var i = pos.length - 1; i >= 0; i--) {
            let petal = document.createElement("div");
            petal.className = "petal";
            petal.style.top = (pos[i].x + 2.79) * this.petalRadius + "px";
            petal.style.left = (pos[i].y + 3) * this.petalRadius + "px";
            petal.style.width = petalSize;
            petal.style.height = petalSize;
            this.petals.appendChild(petal);
            this.setPetalEventHandlers(petal);
        }

        // Needed in mobile when showing a no-pic place from index:
        this.petals.onclick = (e) => this.hide(e);

        // The region over the central pin
        let middle = document.createElement("div");
        middle.id = "centralDisc";
        middle.className = "centralDisc";
        this.petals.appendChild(middle);
        this.centralDisc = middle;

        if (this.isStar) {
            // Small central disc over the pin
            middle.style.backgroundColor = "rgba(0,0,0,0.2)";
            middle.style.top = 2.6 * this.petalRadius + "px";
            middle.style.left = 2.85 * this.petalRadius + "px";
            middle.style.height = this.petalRadius * 0.33 + "px";
            middle.style.width = this.petalRadius * 0.33 + "px";
        } else {
            // Disc for text covering central petal
            middle.style.top = 1.79 * this.petalRadius + "px";
            middle.style.left = 2 * this.petalRadius + "px";
            middle.style.height = petalSize;
            middle.style.width = petalSize;
        }
        this.setPetalEventHandlers(middle);

        if (this.isStar) {
            // Create a separate box for the text, to one side
            this.textBox = document.createElement("div");
            this.textBox.className = "infoBox";
            this.textBox.style.top = 3.1 * this.petalRadius + "px";
            this.textBox.style.left = 3.1 * this.petalRadius + "px";
            this.textBox.style.width = 3 * this.petalRadius + "px";
            this.textBox.style.height = "auto";
            this.petals.appendChild(this.textBox);
            this.setPetalEventHandlers(this.textBox);
        } else {
            // Central disc is used for the text
            this.textBox = middle;
        }



        // Allow user to expand a pic or operate audio controls without losing petals:
        this.preservePetalsOnEntering("lightbox");
        this.preservePetalsOnEntering("audiodiv");
    }

    /**
        * Avoid closing petals when user moves into specific places - audio controls, lightbox.
        * @param {string} divName id of element to protect
        */
    preservePetalsOnEntering(divName) {
        let div = g(divName);
        let petals = this;
        if (div) {
            div.addEventListener("mouseenter", function (e) {
                if (petals.petalHideTimeout) {
                    clearTimeout(petals.petalHideTimeout);
                    petals.petalHideTimeout = null;
                }
            });
        }
    }

    pinClick(e, pin, onlyIfNoLightbox) {
        if (window.lightboxU.isShowing()) window.lightboxU.hide();
        else presentSlidesOrEdit(pin, e.pageX, e.pageY, false, true);
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
     * @param {Pin} pin The pin on the map that we're showing
     * @param {boolean} onlyIfNoLightbox Don't bother if the big display is showing
     */
    popPetals(e, pin, onlyIfNoLightbox) {
        // Log that the user has seen this place:
        appInsights.trackEvent({ name: "popPetals", properties: { place: pin.place.Title, id: pin.place.id.replace(" ", "+").replace("|", "%7C") } });
        if (onlyIfNoLightbox && window.lightboxU.isShowing()) return;
        if (window.lightboxU.isShowing()) window.lightboxU.hide();
        var petals = g("petals");
        let centrePoint = window.map.pinScreenPoint(pin) || { x: e.pageX, y: pageY };
        petals.style.left = (centrePoint.x - this.petalRadius * 3) + "px";
        petals.style.top = (centrePoint.y - 2.76 * this.petalRadius) + "px";
        this.textBox.innerHTML = pin.place.Short;
        this.textBox.pin = pin;

        /*var centralPic = pics.length == 1 && pics[0].isPicture;
        middle.style.backgroundImage = centralPic ? "url('" + mediaSource(pics[0].id) + "')" : null;
        middle.style.backgroundSize = "cover"; */

        // Display the pictures in the petals:
        var imageBoxes = petals.children; // Each is a div
        var pics = pin.place.pics;
        var doneFirstAudio = false;
        let i = 0;
        for (let p = 0; p < pics.length; p++) {
            let pic = pics[p];
            if (pic.isAudio) {
                if (!doneFirstAudio)
                    playAudio(pic, pin.place);
                doneFirstAudio = true;
            } else {
                while (i < imageBoxes.length && imageBoxes[i].className != "petal") {
                    imageBoxes[i].pin = pin;
                    i++;
                }
                if (i < imageBoxes.length) {
                    let petal = imageBoxes[i++];
                    html(petal, "");
                    petal.pin = pin;
                    petal.pic = pic;
                    if (pic.isPicture || pic.embed) {
                        petal.appendChild(pic.imgFromPic());
                    } else {
                        if (pic.extension == ".pdf") {
                            html(petal, "<img src='img/petalPdf.png'/>");
                        }
                        else {
                            html(petal, "<img src='img/file.png'/>");
                        }
                    }
                    petal.title = pic.caption + " " + pic.extension;
                    //petal.style.visibility = "visible";
                    show(petal, "flex");
                }
            }
        }
        while (i < imageBoxes.length) {
            let petal = imageBoxes[i++];
            petal.pin = pin;
            if (petal.className == "petal") {
                petal.pic = null;
                hide(petal);
            }
        }

        this.centralDisc.style.backgroundColor = pics.length == 0 ? "rgba(0,0,0,0.6)" : "rgba(0,0,0,0.2)";
        show(petals);
        showTrail(pin.place);
    }


    // Behavior defns for all children of petals,  incl menu
    setPetalEventHandlers(petal) {
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

    /** Hide petals on moving cursor out.
     * Called 500ms after cursor moves out of a petal.
     * Timeout is cancelled by moving into another petal.
     */
    hide(e) {
        //return;
        let petalset = g("petals");
        hide(petalset);
        if (!window.lightboxU.isShowing()) {
            hide("audiodiv");
            if (g("audiocontrol")) g("audiocontrol").pause();
        }
        let petals = petalset.children;
        for (var i = 0; i < petals.length; i++) {
            petals[i].innerHTML = "";
        }
    }


}


