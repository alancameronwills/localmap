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
        var h = "" + this.text + this.loc.e + this.loc.n;
        if (this.pics) this.pics.forEach(function (pic, i, a) { h += pic.id + pic.caption; });
        if (this.tags) h += this.tags.toString();
        return hashCode(h);
    }
    get NextId() {
        return this.nextRowKey ? placeId(this.PartitionKey, this.nextRowKey) : null;
    }

    get IsEditable() {
        return window.user && window.user.isAdmin || (this.user && usernameIfKnown() == this.user);
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
    constructor(place, extension) {
        this.id = this.newId(place, extension.toLowerCase());
        this.caption = "";
        this.date = "";
        this.type = ""; // image/jpg etc
        this.sound = null; // plays while pic is showing. Only if this isPicture.
        this.youtube = null;
    }

    get extension() {
        return this.id.match(/\.[^.]*$/)[0].toLowerCase();
    }
    get isPicture() {
        return ".jpeg.jpg.gif.png.webp".indexOf(this.extension) >= 0;
    }
    get isAudio() {
        return ".wav.mp3.avv.ogg".indexOf(this.extension) >= 0;
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
     * @param {*} realName 
     * @param {*} displayName 
     * @param {*} group null or code for a group
     * @param {*} homeProject null or a project, if a group member
     * @param {*} isValidated email has been verified
     */
    constructor (id, email, pwdHash, role, realName, displayName, group, homeProject, isValidated) {
        this.id = id;
        this.email = email;
        this.role = role;
        this.pwdHash = pwdHash;
        this.realName = realName || email.replace(/@email.*/, "");
        this.displayName = displayName || this.realName;
        this.group = group;
        this.homeProject = homeProject;
        this.isValidated = isValidated;
    }
    get isAdmin () {
        // User role can be "admin" - global; or "admin:project1,project2,..."
        if (this.role == "admin") return true;
        if (this.role.indexOf("admin:"==0)) {
            let adminOnProjects = this.role.replace(/admin:/, "").split(",");
            for (let i = 0; i<adminOnProjects.length; i++) {
                let adminOnProject = adminOnProjects[i].trim().toLowerCase();
                if (adminOnProject && window.project.id.toLowerCase().indexOf(adminOnProject) == 0) {
                    return true;
                }
            }
        }
        return false;
    }
    hasRoleOnProject(role) {
        let myRoles = this.role.toLowerCase();
        let currentProject = window.project.id.toLowerCase();
        let queryRole = role.toLowerCase();
        if (myRoles==role) return true;
        return myRoles.split(";").some(rolesegment =>{
            let projRole = rolesegment.split(":");
            return projRole[0] == queryRole && projRole[1] && projRole[1] == currentProject;
        });
    }

    get isAdmin() {
        return this.hasRoleOnProject("admin");
    }

    get isContributor() {
        return this.isAdmin || !window.project.contributorRole || this.hasRoleOnProject("contributor");
    }
    isGroupAdmin (group) {
        return this.isAdmin || this.group == group && this.role == groupAdmin;
    }
}


