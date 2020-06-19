var knownTags = window.project.tags;

/** Lighter versions of the colours for backgrounds */
function lightColour(c) {
    var rx = c.substr(1,2), gx = c.substr(3,2), bx = c.substr(5,2);
    var r = Number('0x'+rx), g = Number('0x'+gx), b = Number('0x'+bx);
    return "rgba({0},{1},{2},0.2)".format(r,g,b);
}

for(var i=0;i<knownTags.length;i++) {
    knownTags[i].lightColour = lightColour(knownTags[i].color);
}
function placeId (project, rowKey) {
    return project + "|" + rowKey;
}
function getLink(place) {
    return window.location.origin + window.location.pathname.replace(/\/[^/]+$/,"")
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
    static DateString (longint) {
        return new Date(longint).toLocaleString().substr(0, 17);
    }
    get RowKey() {
        let keys = this.id.split("|");
        return keys.length > 1 ? keys[1] : "";
    }
    get PartitionKey () {
        return this.id.split("|")[0].replace("+", " ");
    }
    get Stripped() {
        return this.text.replace(/(<div|<p|<br)[^>]*>/g, "¬¬¬").replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").replace(/^[ ¬]*/g, "").replace(/¬¬[ ¬]*/g, "<br/>");
    }
    get Title() {
        return this.RawTitle || s("noTitlePrompt", "(No title)");
    }
    get RawTitle() {
        return this.Stripped.match(/[^<]*/)[0].replace(/&amp;/g, "&");
    }
    get Short() {
        var t = this.Stripped;
        if (t.length < 200) return t;
        return t.substr(0, 200) + "...";
    }
    get Hash() {
        var h = "" + this.text + this.loc.e + this.loc.n + (this.group||"");
        if (this.pics) this.pics.forEach(function (pic, i, a) { h += pic.id + pic.caption; });
        if (this.tags) h += this.tags.toString();
        return hashCode(h);
    }
    get NextId() {
        return this.nextRowKey ? placeId(this.PartitionKey, this.nextRowKey) : null;
    }

    get IsEditable() {
        return window.user && (window.user.isAdmin || window.user.isEditor) || (this.user && usernameIfKnown() == this.user);
    }

    get NonMediaFiles () {
        return this.pics.filter(x => !x.isPicture && !x.isAudio);
    }

    get AudioFiles () {
        return this.pics.filter(x => x.isAudio);
    }

    HasTag(tag) { return !tag || !this.tags || this.tags.indexOf(tag)>=0; }
    
        // Create a unique id for a pin by interleaving digits of the lat & long.
        // The idea of doing it from the lat & long is that when searched in the table,
        // pins that are near to each other on the ground will be near in the table.
        // So a rough "find all the nearby pins" is just a matter of truncating the id as a search term.
    NewId (loc) {
        var x = (loc.e + 300).toFixed(6);
        var y = (loc.n + 200).toFixed(6);
        var key = "";
        for (var i = 0; i < x.length; i++) {
            if (x.charAt(i) != ".") {
                key += x.charAt(i) + y.charAt(i);
            }
        }
        // Add some random digits in case several points in same location.
        return key + Date.now()%1000;
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


    get Caption () {
        let fix = url=>`<a href="${url}" target="_blank"><img style="vertical-align:top" src="img/extlink.png"/></a>`;
        if (this.caption.match(/http:/)) return this.caption.replace(/http.?:\/\/[^ );><\]]+/g, url=>fix(url))
        else  return this.caption.replace(/www\.[^ );><\]]+/g, url=>fix("http://"+url));
    }

    get extension() {
        return this.id.match(/\.[^.]*$/)[0].toLowerCase();
    }
    get isPicture() {
        return ".jpeg.jpg.gif.png.webp.heic.".indexOf(this.extension+".") >= 0;
    }
    get isAudio() {
        return ".wav.mp3.avv.ogg.".indexOf(this.extension+".") >= 0;
    }

    get fileTypeIcon() {
        if (this.isAudio) return "img/sounds.png";
        if (this.isPicture) return "img/picture.png";
        if (this.extension==".pdf") return "img/pdf.png";
        return "img/file.png";
    }
    
    get transform () {
        return "rotate(" +
            (this.orientation == 6 ? "0.25"
                : this.orientation == 3 ? "0.5"
                    : this.orientation == 8 ? "0.75"
                        : "0") + "turn)";
    }

    rot90 () {
        this.orientation = (this.orientation == 6 ? 3
        : this.orientation == 3 ? 8
            : this.orientation == 8 ? 1
                : 6);
    }

    newId (place, extension) {
        if (!place) {
            return new Date().toUTCString() + seqid++ + extension;
        } else {
            return place.id.toLowerCase().replace(/[^a-zA-Z0-9_]/g,"_") + "-" + Date.now()%1000 + seqid++ + extension;
        }
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
    constructor (id, email, pwdHash, role, fullName, displayName, group, homeProject, isValidated) {
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
    static FromTableRow (u)
    {
        let x = n=>u[n]?u[n]._:"";
        return new User(x("RowKey"), x("email"), "", x("Role"), x("FullName"), x("DisplayName"), "", "", !x("validation"));
    }

    roleOnProject(project=window.project && window.project.id) {
        let myRoles = this.role.toLowerCase();
        if (myRoles.indexOf(":")<0) return myRoles;
        if (!project) return "";
        let roleProject = myRoles.split(";").find(r=>r.split(":")[1]==project.toLowerCase());
        if (!roleProject) return "";
        return roleProject.split(":")[0];
    }
    
    get name () { return (this.displayName || this.fullName || this.email.replace(/@.*/, "")).replace(/[,;=|?<>]+/g,"_"); }

    hasRoleOnProject(role) {
        return this.roleOnProject() == role;
    }

    get isAdmin() {
        return this.hasRoleOnProject("admin");
    }
    
    /** Does not include admin */
    get isEditor () {
        return this.hasRoleOnProject("editor");
    }

    /** Automatically includes editor and admin */
    get isContributor() {
        return !window.project.contributorRole || this.isAdmin || this.isEditor ||  this.hasRoleOnProject("contributor");
    }
    isGroupAdmin (group) {
        return this.isAdmin || this.group == group && this.role == groupAdmin;
    }
}


