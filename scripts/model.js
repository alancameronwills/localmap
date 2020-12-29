var knownTags = window.project.tags;

/** Lighter versions of the colours for backgrounds */
function lightColour(c) {
    var rx = c.substr(1, 2), gx = c.substr(3, 2), bx = c.substr(5, 2);
    var r = Number('0x' + rx), g = Number('0x' + gx), b = Number('0x' + bx);
    return "rgba({0},{1},{2},0.2)".format(r, g, b);
}

for (var i = 0; i < knownTags.length; i++) {
    knownTags[i].lightColour = lightColour(knownTags[i].color);
}
function placeId(project, rowKey) {
    return project + "|" + rowKey;
}
function getLink(place) {
    return window.location.origin + window.location.pathname.replace(/\/[^/]+$/, "")
        + `?project=${window.project.id}&place=` + place.id.replace(" ", "+").replace("|", "%7C");
}
class Place {
    constructor(project, lon, lat) {
        this.loc = { e: lon, n: lat };
        this.id = placeId(project, this.NewId(this.loc));
        this.text = "";
        this.pics = [];
        this.tags = "";
        this.isNew = true;
    }
    static DateString(longint) {
        return new Date(longint).toLocaleString().substr(0, 17);
    }
    get RowKey() {
        let keys = this.id.split("|");
        return keys.length > 1 ? keys[1] : "";
    }
    get PartitionKey() {
        return this.id.split("|")[0].replace("+", " ");
    }
    get Stripped() {
        return this.text.replace(/(<div|<p|<br)[^>]*>/g, "¬¬¬").replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").replace(/^[ ¬]*/g, "").replace(/¬¬[ ¬]*/g, "<br/>");
    }
    get Body() {
        let matches = this.text.replace(/^( |&nbsp;)+/, "").match(/<(div|p|br)[^]*/);
        if (!matches) return "";
        let body = matches[0];
        if (matches.index == 0) {
            body = matches[0].replace(/<(div|p).*?<\/\1>/, "");
        }
        return body.replace(/^( *<div> *<br.?> *<\/div>)+/, "").replace(/^ *<div> *<br.?>/, "<div>");
    }
    get Title() {
        return this.RawTitle || s("noTitlePrompt", "(No title)");
    }
    get RawTitle() {
        return this.Stripped.match(/[^<]*/)[0].replace(/&amp;/g, "&").trim();
    }
    get DisplayName() {
        return this.displayName || this.user || "";
    }
    get Short() {
        var t = this.Stripped;
        if (t.length < 200) return t;
        return t.substr(0, 200) + "...";
    }
    get IsInteresting() {
        return this.text.length > 100 || this.pics.length > 0;
    }
    get Hash() {
        var h = "" + this.text + this.loc.e + this.loc.n + (this.group || "");
        if (this.pics) this.pics.forEach(function (pic, i, a) { h += pic.id + pic.caption; });
        if (this.tags) h += this.tags.toString() + this.user;
        return hashCode(h);
    }
    get NextId() {
        return this.nextRowKey ? placeId(this.PartitionKey, this.nextRowKey) : null;
    }

    get IsEditable() {
        // User must be signed in
        // User is an editor,  or the authorship has been opened, or the current user is the original author
        return window.user && window.user.isContributor && (window.user.isEditor || !this.user || usernameIfKnown() == this.user);
    }

    get NonMediaFiles() {
        return this.pics.filter(x => !x.isPicture && !x.isAudio && !x.embed);
    }

    get AudioFiles() {
        return this.pics.filter(x => x.isAudio);
    }

    HasTag(tag) { return !tag || !this.tags || this.tags.indexOf(tag) >= 0; }

    // Create a unique id for a pin by interleaving digits of the lat & long.
    // The idea of doing it from the lat & long is that when searched in the table,
    // pins that are near to each other on the ground will be near in the table.
    // So a rough "find all the nearby pins" is just a matter of truncating the id as a search term.
    NewId(loc) {
        var x = (loc.e + 300).toFixed(6);
        var y = (loc.n + 200).toFixed(6);
        var key = "";
        for (var i = 0; i < x.length; i++) {
            if (x.charAt(i) != ".") {
                key += x.charAt(i) + y.charAt(i);
            }
        }
        // Add some random digits in case several points in same location.
        return key + Date.now() % 1000;
    }
}

var seqid = 100;
// An image or other media file attached to a place
class Picture {
    constructor(place, extension, file) {
        this.id = this.newId(place, extension.toLowerCase());
        this.file = file;
        this.caption = "";
        this.date = "";
        this.type = ""; // image/jpg etc
        this.sound = null; // plays while pic is showing. Only if this isPicture.
        this.youtube = null;
    }

    get Caption() {
        let caption = (this.caption || "").replace(/^What's .*\?$/, " ");
        let fix = url => `<a href="${url}" target="_blank"><img style="vertical-align:top" src="img/extlink.png"/></a>`;
        if (caption.match(/https?:/)) return caption.replace(/https?:\/\/[^ );><,\]]+/g, url => fix(url))
        else return caption.replace(/www\.[^ );><,\]]+/g, url => fix("http://" + url));
    }

    get extension() {
        let ext = (this.id || "").match(/\.[^.]*$/);
        return ext ? ext[0].toLowerCase() : "";
    }
    get isPicture() {
        return this.extension && ".jpeg.jpg.gif.png.webp.heic.".indexOf(this.extension + ".") >= 0;
    }
    get isAudio() {
        return this.extension && ".wav.mp3.avv.ogg.flac.".indexOf(this.extension + ".") >= 0;
    }

    get fileTypeIcon() {
        if (this.isAudio) return "img/sounds.png";
        if (this.isPicture) return "img/picture.png";
        if (this.extension == ".pdf") return "img/pdf.png";
        return "img/file.png";
    }

    transform(img) {
        let scale = "";
        if (img && (this.orientation == 6 || this.orientation == 8)) {
            if (img.width > img.height) {
                scale = " scale(" + Math.min(1, 1.2 * img.height / img.width) + ")";
            }
        }
        return "rotate(" +
            (this.orientation == 6 ? "0.25"
                : this.orientation == 3 ? "0.5"
                    : this.orientation == 8 ? "0.75"
                        : "0") + "turn)" + scale;
    }

    rot90() {
        this.orientation = (this.orientation == 6 ? 3
            : this.orientation == 3 ? 8
                : this.orientation == 8 ? 1
                    : 6);
    }

    newId(place, extension) {
        if (!place) {
            return new Date().toUTCString() + seqid++ + extension;
        } else {
            return place.id.toLowerCase().replace(/[^a-zA-Z0-9_]/g, "_") + "-" + Date.now() % 1000 + seqid++ + extension;
        }
    }

    /**
     * Set the content of an Image
     * @param {*} img Image element
     * @param {*} title Caption
     * @param {*} onloaded fn()
     */
    setImgFromPic(img, title, onloaded) {
        img.title = ""; // to avoid confusion just in case it doesn't load
        img.pic = this;
        img.onload = () => {
            img.style.transform = this.transform(img);
            img.title = title || (this.date || "") + " " + this.shortCaption();
            if (onloaded) onloaded();
        };
        img.src = this.isAudio ? "img/sounds.png" : mediaSource(this.id);
    }

    shortCaption() {
        return this.Caption.replace(/<.*?>/g, "").replace(/&.*?;/, " ").replace(/\/\/.*/, "") || ""
    }

    /**
     * Create an image or a div that shows the pic.
     */
    imgFromPic(onload) {
        if (this.embed) {
            let div = this.embedding(this.embed, (ev) => {
                div.title = this.shortCaption();
                // Smartframe inserts an iframe directly after the script
                if (ev.target && ev.target.nextSibling)
                    ev.target.nextSibling.style.margin = "auto";
                if (onload) onload(this, div);
            });
            div.title = "";
            return div;
        } else {
            let img = document.createElement("img");
            this.setImgFromPic(img, this.shortCaption(), () => {
                if (onload) onload(this, img);
            });
            return img;
        }
    }
    clear(img) {
        img.innerHTML = "";
    }

    /**
     * Put a script into a div and execute it. 
     * Created for embedding smartframe.io pics such as from historicengland.org.uk
     * @param {string} script from smartframe.io
     * @param {Element} target Petal to display the embedded pic
     * @param {fn(ev)} onload To do when script has loaded and executed
     */
    embedding(script, onload) {
        let tempContainer = document.createElement("div");
        tempContainer.innerHTML = script;
        // Script won't run if created by innerHTML
        let scriptElement = document.createElement("script");
        for (let attr of tempContainer.firstChild.attributes) {
            scriptElement.setAttribute(attr.name, attr.value);
        }
        scriptElement.onload = onload;
        tempContainer.innerHTML = "";
        return scriptElement;
    }
}

class User {
    /**
     * Current user
     * @param {*} id    Authentication id from Azure; null if pwd-authenticated
     * @param {*} email 
     * @param {*} pwdHash null for Azure-authenticated users
     * @param {*} role  {admin, groupAdmin, user, admin:project1,project2,...}
     * @param {*} fullName 
     * @param {*} displayName 
     * @param {*} group null or code for a group
     * @param {*} homeProject null or a project, if a group member
     * @param {*} isValidated email has been verified
     */
    constructor(id, email, pwdHash, role, fullName, displayName, group, homeProject, isValidated) {
        this.id = id;
        this.email = email || "";
        this.role = role || "";
        this.pwdHash = pwdHash;
        this.fullName = fullName || "";
        this.displayName = (displayName || "").trim();
        this.group = group;
        this.homeProject = homeProject;
        this.isValidated = isValidated;
    }
    static FromTableRow(u) {
        let x = n => u[n] ? u[n]._ : "";
        return new User(x("RowKey"), x("email"), "", x("Role"), x("FullName"), x("DisplayName"), "", "", !x("validation"));
    }

    roleOnProject(project = window.project && window.project.id) {
        let myRoles = this.role.toLowerCase();
        if (myRoles.indexOf(":") < 0) return myRoles;
        if (!project) return "";
        let roleProject = myRoles.split(";").find(r => r.split(":")[1] == project.toLowerCase());
        if (!roleProject) return "";
        return roleProject.split(":")[0];
    }

    get name() { return (this.displayName || this.fullName || this.email.replace(/@.*/, "")).replace(/[,;=|?<>]+/g, "_"); }

    hasRoleOnProject(role) {
        return this.roleOnProject() == role;
    }

    get isAdmin() {
        return this.hasRoleOnProject("admin");
    }

    /** Does not include admin */
    get isEditor() {
        return this.isAdmin || this.hasRoleOnProject("editor");
    }

    /** Automatically includes editor and admin */
    get isContributor() {
        return this.isAdmin || this.isEditor || this.hasRoleOnProject("contributor");
    }
    isGroupAdmin(group) {
        return this.isAdmin || this.group == group && this.role == groupAdmin;
    }
}


