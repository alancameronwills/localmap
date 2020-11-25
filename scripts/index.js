
class GroupNode {
    /**
     * 
     * @param {string} pathString - Long id like xxx/yyy/zzz 
     */
    constructor(pathString) {
        this.pathString = pathString || ""; // long path like xxx/yyy/zzz
        this.keys = []; // Sorted short path elements like yyy
        this.subs = {}; // keys and autoSubsKeys -> GroupNode
        this.leaves = []; // Place
        this.autoSubsKeys = []; // Long lists of keys have a split like A-E, F-L, ...
    }

    /** Set keys to be a sorted list of the keys of subs, and sort leaves. */
    sortKeys(leafsort) {
        this.leaves.sort(leafsort);
        this.keys = Array.from(Object.keys(this.subs));
        this.keys.sort();
        this.keys.forEach(k => this.subs[k].sortKeys(leafsort));
        this.genAutoSubs();
    }

    /** 
        Divide up into alpha groups if very long
     */
    genAutoSubs() {
        this.autoSubsKeys = [];
        if (this.keys.length > 20) {
            let groups = [];
            // More or less even distribution
            let groupSize = Math.ceil(this.keys.length / Math.ceil(this.keys.length / 10));
            let stop = "¬";
            let currentGroup;
            for (let ki = 0; ki < this.keys.length; ki++) {
                let initial = (this.keys[ki] || " ").substr(0, 1);
                if (stop && stop != initial) {
                    stop = "";
                    currentGroup = { a: initial, items: [] };
                    groups.push(currentGroup);
                }
                currentGroup.items.push(this.keys[ki]);
                if (currentGroup.items.length >= groupSize) {
                    stop = initial;
                    currentGroup.b = initial;
                }
            }
            let newGroups = groups.map(g => {
                let newGroup = new GroupNode();
                newGroup.alphaGroup = g.a + (g.b && g.a != g.b ? "-" + g.b : "");
                newGroup.pathString = "¬" + newGroup.alphaGroup;
                newGroup.keys = g.items;
                g.items.forEach(k => { newGroup.subs[k] = this.subs[k]; });
                return newGroup;
            });
            newGroups.forEach(g => {
                this.autoSubsKeys.push(g.alphaGroup);
                this.subs[g.alphaGroup] = g;
            });
            this.autoSubsKeys.sort();
        }
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

            // Set index content:
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



    /** Expand the index to show a particular Place 
     * @param {string} groupPath - full group id
    */
    expandToGroup(groupPath) {
        let pathSplit = groupPath.split("/");
        // For each ancestor group ...
        for (let i = 0; i < pathSplit.length; i++) {
            let groupId = pathSplit.slice(0, i + 1).join("/");
            this.expandOrCollapseGroup(g("div#" + groupId), g("sub#" + groupId), true);
        }
    }

    /** User clicked a group on the index. Expand or collapse. */
    toggleGroup(div) {
        // Find the id of the group
        let head = div;
        while (head && !head.id) { head = head.parentElement; }
        let groupId = head.id.replace(/^[^#]*#/, "");
        this.expandOrCollapseGroup(head, g("sub#" + groupId));
    }


    /** [Un]expand a group in the index.
     * @param {Element} header - the div containing the group name and up/down arrow
     * @param {Element} sub - the div containing the group members
     * @param {boolean} expandOnly - if this group is already expanded, do nothing.
     */
    expandOrCollapseGroup(header, sub, expandOnly = false) {
        if (!header || !sub) return;
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


    showingRecent = false;

    /** User clicked New button */
    // ~ index.html
    doRecent() {
        this.showingRecent = !this.showingRecent;
        g("recentButton").style.backgroundColor = this.showingRecent ? "yellow" : "";
        this.showIndex(this.showingRecent);
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
            && (!map.isPolyActive || map.polyContains(place.loc.e, place.loc.n));
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
            ".groupHead input {vertical-align:top} " +
            ".groupHead {position:relative; width:100%; height: 22px; left: 0px; overflow:hidden;} " +
            ".groupHead div {display:inline-block; top:0; white-space:nowrap; overflow:hidden; color:grey;font-weight:bold;} " +
            ".groupHead>div>span {position:absolute;top:0;} " +
            ".groupHead img{position: absolute; right:0; top:0; transition:transform 0.5s} .group .up{transform:rotate(180deg);} " +
            ".indexPlaceContainer>div {position:relative;width:100%;height:22px;left:0px;overflow:hidden;text-overflow:ellipsis;} " +
            ".indexPlaceContainer>div>div {display:inline-block;position:absolute;top:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;} " +
            "</style>";

        s += this.indexHtmlNest(null, groups, window.tagSelected, 0).html;
        return s;
    }

    /** Private.
     * Generate HTML index from GroupNode tree
     * @param {string} key - Short id of current node. Top of tree doesn't have one.
     * @param {GroupNode} groupNode - current node. groupNode.pathString is long id like xxx/yyy/zzz
     * @param {string} tagId - selected tag filter if any
     * @param {int} indent - nesting level
     */
    indexHtmlNest(key, groupNode, tagId, indent) {
        let html = "";
        let items = 0;
        let allChecked = true;
        let anyChecked = false;

        // Deal with contents first, then we'll prefix the header
        if (key) {
            html += `<div class='sub' id="sub#${groupNode.pathString}" style="display:none;padding-left:${(indent + 1) * 4}px">`;
        }
        else {
            // Top of tree
            html += "<div class='sub'>";
        }
        // places at this level
        groupNode.leaves
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
        let showSubGroups = kk => {
            kk.forEach(subKey => {
                let sub = this.indexHtmlNest(subKey, groupNode.subs[subKey], tagId, indent + 1);
                if (this.indexCheckBoxes || sub.items > 0) {
                    html += sub.html;
                    items++;
                    if (!sub.allChecked) allChecked = false;
                    if (sub.anyChecked) anyChecked = true;
                }
            });
        }
        // non-empty groups at this level
        if (groupNode.autoSubsKeys && groupNode.autoSubsKeys.length > 0) {
            // The list has a split into alphabetic groupings
            showSubGroups(groupNode.autoSubsKeys);
        } else {
            showSubGroups(groupNode.keys);
        }

        html += "</div>";

        // Group header
        if (key) {
            // Header prefix of this group. Checkbox checked if all children checked.
            let headerHtml = `<div class="group" id="div#${groupNode.pathString}"><div class="groupHead" title="${groupNode.pathString}">`;
            if (this.indexCheckBoxes) headerHtml += `<input type="checkbox" id="groupcb#${groupNode.pathString}" onchange="index.groupCheckboxChange(this)"`
                + ` ${allChecked ? 'checked' : ""} />`
            headerHtml += `<div onclick="index.toggleGroup(this)"><span>${key}</span><img src="img/drop.png"></div></div></div>`;
            html = headerHtml + html;
        }

        return { html, items, allChecked, anyChecked };
    }

    /**
     * Return a GroupNode tree of all the places
     */
    groupTree(includedPlaces) {
        if (!this._GroupTree || includedPlaces) {
            // Refresh cache
            this._GroupTree = new GroupNode("");
            // Values of Places as an array:
            let places = includedPlaces || Object.keys(window.Places).map(k => window.Places[k]);
            places.forEach(place => {
                // Find this group in the tree, add it if it's not there:
                let path = place.group.split("/");
                let node = this._GroupTree; // begin at root
                for (let i = 0; i < path.length; i++) {
                    let key = path[i];
                    if (!node.subs[key]) {
                        node.subs[key] = new GroupNode(path.slice(0, i + 1).join("/"));
                    }
                    node = node.subs[key];
                }
                node.leaves.push(place);
                // While we're here, set the sorting key of the place:
                place.sortseq = numerize(place.Title.toLowerCase());
            });
            // For all nodes of the tree, sort leaves by reduced titles:
            this._GroupTree.sortKeys((a, b) => a.sortseq.localeCompare(b.sortseq));
        }
        return this._GroupTree;
    }

    /** User has clicked a group checkbox */
    groupCheckboxChange(checkbox) {
        let groupId = checkbox.id.replace(/^[^#]*#/, "");
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



/** Remove any alphabetic groupings used in long subgroups: A-D E-H etc. Just hope there isn't a street called A-Z. */
function removeAlphaGrouping(path) {
    return path.replace(/\/[^\/](-[^\/])?\//, "/").replace(/\/[^\/](-[^\/])?$/, "");
}
