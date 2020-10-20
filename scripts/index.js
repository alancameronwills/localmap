
class GroupNode {
    constructor() {
        this.keys = [];
        this.subs = {};
        this.leaves = [];
    }

    /** Set keys to be a sorted list of the keys of subs, and sort leaves. */
    sortKeys(leafsort) {
        this.leaves.sort(leafsort);
        this.keys = Array.from(Object.keys(this.subs));
        this.keys.sort();
        this.keys.forEach(k => this.subs[k].sortKeys(leafsort));
    }

}

/** Creates an index sidebar on the map and controls visibility of points */
class Index {
    searchTerm = "";
    // ~zones.js
    hideIndexOK = true;
    indexCheckBoxes = false;


    // ~deep-map.js, pics.js
    /** Display the index and filter the places on the map. 
     * If we're showing checkboxes, show a complete index, indicating filtered places by checkbox. 
     * Otherwise, just show filtered places.
     * @param {*} resetFilter Recalculate index content and filter map
     * @param {*} boundsRound Zoom map to show just the filtered places
     */
    showIndex(boundsRound = false, resetFilter = true) {
        this.now = Date.now();
        hide("groupSelectorBox");

        let includedPins = resetFilter ? this.filterPlacesVisibleOnMap(boundsRound) : null;

        // Don't show the index if there are pictures waiting to be assigned to places:
        if (location.queryParameters["noindex"] || g("loosePicsShow").children.length > 0) {
            hide("indexSidebar");
        } else {
            show("indexSidebar");
            this.openIndex();
            html("indexSidebar", this.indexHtml(includedPins));
        }
    }

    // ~ index.html
    /** User has clicked index expand tab */
    openIndex() {
        g("indexSidebar").style.marginLeft = "0";
        hide("indexFlag");
    }

    /** User has clicked a place on the index */
    indexClick(placeKey, event) {
        this.hideIndex();
        gotoFromIndex(placeKey, event);
    }

    // ~deep-map.js
    hideIndex() {
        if (this.hideIndexOK || window.innerWidth < 600) {
            g("indexSidebar").style.marginLeft = "-98%";
            show("indexFlag");
        }
    }


    expandToGroup(groupPath) {
        let pathSplit = groupPath.split("/");
        for (let i = 0; i < pathSplit.length; i++) {
            this.expand(pathSplit.slice(0, i + 1).join("/"), null, true);
        }
    }

    showingRecent = false;

    /** User clicked New button */
    // ~ index.html
    doRecent() {
        this.showingRecent = !this.showingRecent;
        g("recentButton").style.backgroundColor = this.showingRecent ? "yellow" : "";
        this.showIndex(this.showingRecent);
    }


    /** User clicked a group on the index. Expand or collapse.
     * @param {string} groupId - Path of group x/y/z
     * @param {Element} div - Element containing group header. If null we'll work it out.
     * @param {boolean} expandOnly - if this group is already expanded, do nothing.
     */
    expand(groupId, div, expandOnly = false) {
        let sub = g("sub#" + groupId);
        if (!sub) return;
        let header = div || g("div#" + groupId);
        let img = header.getElementsByTagName("img")[0];
        if (sub.style.display == "none") {
            img.className = "up";
            sub.style.display = "block";
            sub.style.maxHeight = "20000px";
            header.scrollIntoView();
            //header.parentNode.scrollBy(0, 20);
        } else {
            if (!expandOnly) {
                img.className = "";
                sub.style.maxHeight = 0;
                setTimeout(() => {
                    if (sub.style.maxHeight[0] == "0")
                        sub.style.display = "none";
                }, 1200);
            }
        }
    }


    // ~ index.html
    /** User has changed the search term */
    doSearch(term) {
        appInsights.trackEvent({ name: "doSearch" });
        this.searchTerm = term;
        if (!term) {
            g("searchButton").classList.remove("activeSearchButton");
            hide("searchCancel");
        } else {
            g("searchButton").classList.add("activeSearchButton");
            show("searchCancel");
        }
        this.showIndex(!!term);
    }


    /** Private. Set visibility on map of places fitting criteria: search term, tag, recent, in-polygon.
     * @pre Map is loaded with places. 
     * @param {boolean} boundsRound - Zoom to encompass selected places.
     * @returns {Array<Place>} List of places displayed.
     */
    filterPlacesVisibleOnMap(boundsRound = false) {
        this._GroupTree = null;
        this.searchPattern = this.searchTerm && new RegExp(this.searchTerm, "i");
        let included = map.setPlacesVisible(p => this.filter(p));
        text("searchCount", "" + included.length);

        if (included.length < 2) {
            // Search has found few places. Redisplay all the rest. If there's exactly one, display it in full.
            map.setPlacesVisible(p => this.filter(p, true));
            if (included.length == 1) {
                goto(included[0].place.id);
            }
        } else {
            if (boundsRound) map.setBoundsRoundPins(included);
        }
        return included;
    }

    /** Private. Does a place match the current search criteria? */
    filter(place, noTextSearch = false) {
        return (!this.showingRecent || (this.now - dateFromGB(place.modified).getTime()) < 7 * 24 * 60 * 60 * 1000)
            && (!window.tagSelected || place.HasTag(window.tagSelected))
            && (noTextSearch || !this.searchPattern || !!place.text.match(this.searchPattern))
            && (!window.polygon || polygon.contains(place.loc.e, place.loc.n));
    }


    /** Private. Generate the HTML for the index. 
     * @param {Array[Pin]} includedPins Filtered list of places to include in the index, or to show with checkbox checked.
     */
    indexHtml(includedPins) {
        // Make a tree of the groups. 
        // If we're not showing checkboxes in the index, just include the filtered places.
        // If we are showing checkboxes, include everything. (Checkboxes will indicated whether filtered.)
        let groups = this.groupTree(
            includedPins && !this.indexCheckBoxes ? includedPins.map(p => p.place)
                : Object.keys(window.Places).map(k => window.Places[k]));

        let s = "<style>.sub {padding-left:4px;transition:all 1s;overflow:hidden;} " +
            ".group{position:sticky;top:0; background-color:white; transition:all 1s} " +
            ".groupHead {position:relative; width:100%; height: 22px; left: 0px; overflow:hidden;}" +
            ".groupHead div {display:inline-block; position:absolute; top:0; white-space:nowrap; overflow:hidden; color:grey;font-weight:bold;}" +
            ".groupHead img{position: absolute; right:0; top:0; transition:transform 0.5s} .group .up{transform:rotate(180deg);}" +
            ".indexPlaceContainer>div {position:relative;width:100%;height:22px;left:0px;overflow:hidden;text-overflow:ellipsis;}" +
            ".indexPlaceContainer>div>div {display:inline-block;position:absolute;top:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}" +
            "</style>";

        s += this.indexHtmlNest(null, groups, window.tagSelected, 0).html;
        return s;
    }

    /** Private.
     * Generate HTML index from GroupNode tree
     * @param {string} groupId - Id of current node. Top of tree doesn't have one.
     * @param {GroupNode} groupTree - current node 
     * @param {string} tagId - selected tag filter if any
     * @param {int} indent - nesting level
     */
    indexHtmlNest(groupId, groupTree, tagId, indent) {
        let html = "";
        let items = 0;
        let allChecked = true;
        let anyChecked = false;

        // Places first
        if (groupId) {
            html += `<div class='sub' id="sub#${groupId}" style="display:none;padding-left:${(indent + 1) * 4}px">`;
        }
        else {
            html += "<div class='sub'>";
        }
        // places at this level
        groupTree.leaves //.filter(place => !tagId || place.tags.indexOf(" " + tagId) >= 0)
            .forEach(place => {
                items++;
                html += "<div class='indexPlaceContainer'><div>";
                if (this.indexCheckBoxes) {
                    let check = this.filter(place);
                    if (!check) allChecked = false;
                    if (check) anyChecked = true;
                    html += `<input type="checkbox" id="checkbox#${place.id}" ${check ? "checked" : ""} />`;
                }
                html += "<div class='indexPlace' data='{0}' onclick='index.indexClick(\"{0}\", event)' title='{2}' style='background-color:{3}'>{1}</div>"
                    .format(place.id, place.Title, place.Title.replace(/'/g, "&apos;"), placePinColor(place, true));
                html += "</div></div>";
            });
        // non-empty groups at this level
        groupTree.keys.forEach(subId => {
            let sub = this.indexHtmlNest(subId, groupTree.subs[subId], tagId, indent + 1);
            if (this.indexCheckBoxes || sub.items > 0) {
                html += sub.html;
                items++;
                if (!sub.allChecked) allChecked = false;
                if (sub.anyChecked) anyChecked = true;
            }
        });

        html += "</div>";

        if (groupId) {
            let groupShortId = groupId.split("/").pop();
            // Header prefix of this group. Checkbox checked if all children checked.
            let headerHtml = `<div class="group" id="div#${groupId}"><div class="groupHead" title='${groupId}'>`;
            if (this.indexCheckBoxes) headerHtml += `<input type="checkbox" id="groupcb#${groupId}" onchange="index.groupCheckboxChange('${groupId}', this)"`
                + ` ${allChecked ? 'checked' : ""} />`
            headerHtml += `<div onclick="index.expand('${groupId}', this)" style="position:absolute;width:100%"><span>${groupShortId}</span><img src="img/drop.png"></div></div></div>`;
            html = headerHtml + html;
        }

        return { html, items, allChecked, anyChecked };
    }

    /**
     * Return a GroupNode tree of all the places
     */
    groupTree(includedPlaces) {
        if (!this._GroupTree || includedPlaces) {
            this._GroupTree = new GroupNode();
            // Values of Places as an array
            let places = includedPlaces || Object.keys(window.Places).map(k => window.Places[k]);
            places.forEach(place => {
                let path = place.group.split("/");
                let node = this._GroupTree;
                for (let i = 0; i < path.length; i++) {
                    let groupId = path.slice(0, i + 1).join("/");
                    if (!node.subs[groupId]) node.subs[groupId] = new GroupNode();
                    node = node.subs[groupId];
                }
                node.leaves.push(place);
                place.sortseq = numerize(place.Title.toLowerCase());
            });
            this._GroupTree.sortKeys((a, b) => a.sortseq.localeCompare(b.sortseq));
        }
        return this._GroupTree;
    }

    /** User has clicked a group checkbox */
    groupCheckboxChange(groupId, checkbox) {
        let groupTop = g("sub#" + groupId);
        let value = checkbox.checked;
        if (groupTop) {
            Array.from(groupTop.getElementsByTagName("input")).forEach(c => { if (c.type == "checkbox") c.checked = value; });
        }
    }

}
window.index = new Index();



function numerize(s) {
    return s.replace(/[0-9]+/g, n => "00000".substr(0, Math.max(0, 5 - n.length)) + n);
}

// ~~
function sanitize(id) {
    return id.replace(/[^a-zA-Z0-9]+/g, "_");
}

function trunc(s, n) {
    if (s.length < n) return s;
    return s.substr(0, n - 1) + "…";
}

// ~export.html
function selectGroup() {
    setSelectedGroup(g("groupSelectorUi").value);
    showIndex();
}


function setSelectedGroup(group) {
    window.selectedGroup = group;
    setCookie("group", group);
}

// ~deep-map.js
function setGroupOptions() {
    if (window.groupsAvailable) {
        let groupKeys = Object.keys(window.groupsAvailable);
        if (groupKeys.length < 1) return;
        groupKeys.sort();

        // Selector atop index
        let gsHtml = "";
        gsHtml += "<select id='groupSelectorUi' onchange='index.selectGroup()'><option value=''>(all)</option>";
        for (var i = 0; i < groupKeys.length; i++) {
            gsHtml += "<option value='{0}' {1}>{0}</option>".format(groupKeys[i], (groupKeys[i] == window.selectedGroup ? "selected" : ""));
        }
        gsHtml += "</select>";

        g("groupSelectorBox").innerHTML = gsHtml;

        // Selector in place editor

        /*
        let geHtml = "Group: ";
        geHtml += "<select id='groupEditorUi' ><option value=''>(none)</option>";
        for (var i = 0; i < groupKeys.length; i++) {
            geHtml += "<option value='{0}' >{0}</option>".format(groupKeys[i]);
        }
        geHtml += "</select>";
        g("groupEditorBox").innerHTML = geHtml;
        */
    }
}


//window.addEventListener('resize', (e) => showIndex(), true);
window.selectedGroup = getCookie("group");
if (window.location.queryParameters.group) {
    setSelectedGroup(window.location.queryParameters.group);
}

// ~deep-map.js
function setNewGroupOption() {
    let ok = window.user && (window.user.isAdmin || window.user.isEditor);
    show("newGroupButton", ok ? "inline-block" : "none");
}


/** Parse dd/mm/yyyy */
function dateFromGB(m) {
    if (!m) return 0;
    let matches = m.match(/^(..)\/(..)\/(....)/);
    if (!matches || matches.length < 4) return 0;
    return new Date(matches[3], matches[2] - 1, matches[1]);
}





