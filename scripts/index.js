
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

// Creates an index sidebar on the map
class Index {
    searchTerm = "";
    // ~zones.js
    hideIndexOK = true;
    indexCheckBoxes = false;

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

    // ~ deep-map.js, zones.js
    /** Display just places fitting criteria: search term, tag, recent, in-polygon */
    setFilter(boundsRound = false) {
        this._GroupTree = null;
        let now = Date.now();
        let pattern = this.searchTerm && new RegExp(this.searchTerm, "i");
        let included = map.setPlacesVisible(p => {
            let recency = now - dateFromGB(p.modified).getTime();
            return (!this.showingRecent || recency < 7 * 24 * 60 * 60 * 1000)
                && (!window.tagSelected || p.HasTag(window.tagSelected))
                && (!this.searchTerm || !!p.text.match(pattern))
                && (!window.polygon || polygon.contains(p.loc.e, p.loc.n));
        });
        text("searchCount", "" + included.length);

        if (included.length < 2) {
            map.setPlacesVisible(p => p.HasTag(window.tagSelected));
            if (included.length == 1) {
                goto(included[0].place.id);
                return null;
            }
        } else {
            if (boundsRound) map.setBoundsRoundPins(included);
            return included;
        }
    }

    // ~deep-map.js, pics.js
    /** Display the index and filter the places on the map
     * 
     * @param {*} resetFilter Recalculate index content and filter map
     * @param {*} boundsRound Zoom map to show just the filtered places
     */
    showIndex(boundsRound = false, resetFilter = true) {
        let includedPins = resetFilter ? this.setFilter(boundsRound) : null;
        let hasLoosePics = g("loosePicsShow").children.length > 0;

        if (hasLoosePics || location.queryParameters["noindex"]) {
            hide("indexSidebar");
            hide("groupSelectorBox");
            return;
        }
        show("indexSidebar");
        hide("groupSelectorBox");
        this.openIndex();
        html("indexSidebar", this.indexHtml(includedPins));
    }

    /** Generate the HTML for the index
     * @param {Array[Pin]} includedPins Filtered list of places to include in the index
     */

    indexHtml(includedPins) {
        let groups = this.groupTree(
            includedPins ? includedPins.map(p => p.place)
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
    
    /**
     * Generate HTML index from GroupNode tree
     * @param {string} groupId - Id of current node. Top of tree doesn't have one.
     * @param {GroupNode} groupTree - current node 
     * @param {string} tagId - selected tag filter if any
     * @param {int} indent - nesting level
     */
    indexHtmlNest(groupId, groupTree, tagId, indent) {
        let html = "";
        let items = 0;

        if (groupId) {
            // header of this group
            html += `<div class="group"><div class="groupHead" title='${groupId}'>`;
            if (this.indexCheckBoxes) html += `<input type="checkbox" id="groupcb#${groupId}" onchange="groupCheckboxChange('${groupId}', this)" />`
            html += `<div onclick="index.expand('${groupId}', this)" style="position:absolute;width:100%"><span>${groupId}</span><img src="img/drop.png"></div></div></div>`;
        
            html += `<div class='sub' id="sub#${groupId}" style="display:none;padding-left:${(indent+1) * 4}px">`;
        }
        else {
            html += "<div class='sub'>";
        }
        // places at this level
        groupTree.leaves.filter(place => !tagId || place.tags.indexOf(" " + tagId) >= 0)
            .forEach(place => {
                items++;
                html += "<div class='indexPlaceContainer'><div>";
                if (this.indexCheckBoxes) html += `<input type="checkbox" id="checkbox#${place.id}" />`;
                html += "<div class='indexPlace' data='{0}' onclick='index.indexClick(\"{0}\", event)' title='{2}' style='background-color:{3}'>{1}</div>"
                    .format(place.id, place.Title, place.Title.replace(/'/g, "&apos;"), placePinColor(place, true));
                html += "</div></div>";
            });
        // non-empty groups at this level
        groupTree.keys.forEach(subId => {
            let sub = this.indexHtmlNest(subId, groupTree.subs[subId], tagId, indent + 1);
            if (sub.items > 0) {
                html += sub.html;
                items++;
            }
        });
        
        html += "</div>";
        return { html, items };
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

    showingRecent = false;

    /** User clicked New button */
    // ~ index.html
    doRecent() {
        this.showingRecent = !this.showingRecent;
        g("recentButton").style.backgroundColor = this.showingRecent ? "yellow" : "";
        this.showIndex(this.showingRecent);
    }


    /** User clicked a group on the index */
    expand(groupId, div) {
        let sub = g("sub#"+groupId);
        if (!sub) return;
        let img = div.getElementsByTagName("img")[0];
        if (sub.style.display == "none") {
            img.className = "up";
            sub.style.display = "block";
            sub.style.maxHeight = "2000px";
            sub.scrollIntoView();
            div.parentNode.scrollBy(0, -20);
        } else {
            img.className = "";
            sub.style.maxHeight = 0;
            setTimeout(() => {
                if (sub.style.maxHeight[0] == "0")
                    sub.style.display = "none";
            }, 1200);
        }
    }

    placeTree(places, tagId) {
        let groups = {};
        for (let i = 0; i < places.length; i++) {
            try {
                let place = places[i];
                place.sortseq = numerize(place.Title.toLowerCase());
                if (place.HasTag(tagId)) {
                    let g = place.group || "";
                    if (!groups[g]) groups[g] = [];
                    groups[g].push(place);
                }
            } catch (e) {
                console.log(e);
            }
        }
        let groupIds = Object.keys(groups);
        for (let i = 0; i < groupIds.length; i++) {
            let group = groups[groupIds[i]];
            group.sort((a, b) => a.sortseq.localeCompare(b.sortseq));
        }
        groupIds.sort();
        return { groupIds, groups };
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
                    if (!node.subs[path[i]]) node.subs[path[i]] = new GroupNode();
                    node = node.subs[path[i]];
                }
                node.leaves.push(place);
                place.sortseq = numerize(place.Title.toLowerCase());
            });
            this._GroupTree.sortKeys((a, b) => a.sortseq.localeCompare(b.sortseq));
        }
        return this._GroupTree;
    }

}
window.index = new Index();

function groupCheckboxChange(groupId, checkbox) {
    let groupTop = g("sub#"+groupId);
    let value = checkbox.checked;
    if (groupTop) {
        Array.from(groupTop.getElementsByTagName("input")).forEach(c => {if (c.type=="checkbox") c.checked = value;});
    }
}


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

/** Determine the group menus for the place editor */
function placeEditorGroupSelector(place) {
    let allowGroupCreate = window.user.isEditor;
    let groupPath = place.group.split("/");
    let tree = index.groupTree();
    let clevel = tree;
    let groupSelectors = "";
    for (let i = 0; i < groupPath.length || clevel; i++) {
        // Show selectors for each node in the existing path, 
        // plus an additional selector if there are possible additional nodes
        // or there is the option of creating a new node
        if (i < groupPath.length || clevel.keys.length > 0 || allowGroupCreate) {
            let selector = "<select onchange='placeEditorGroupReset()'>";
            if (i >= groupPath.length) {
                selector += "<option value='' selected>-</option>";
            } else {
                selector += "<option value='' >-</option>";
            }
            let keys = clevel.keys;
            let selectionFound = false;
            for (let k = 0; k < keys.length; k++) {
                let selected = i < groupPath.length && keys[k] == groupPath[i];
                selectionFound |= selected;
                selector += `<option value="${keys[k]}" ${selected ? "selected" : ""}>${keys[k]}</option>`;
            }
            if (!selectionFound && i < groupPath.length) {
                // Newly created group, only known in this place
                selector += `<option value="${groupPath[i]}" selected >${groupPath[i]}</option>`;
            }
            if (allowGroupCreate) {
                selector += "<option value='(new)'>(new)</option>";
            }
            selector += "</select>";
            groupSelectors += selector;
        }
        clevel = i < groupPath.length ? clevel.subs[groupPath[i]] : null;
    }
    return groupSelectors;
}

// ~index.html
function createNewGroup() {
    if (window.user.isEditor || window.user.isAdmin) {
        showInputDialog(null, null, "Create a new group name", "", (pic, pin, userInput) => {
            let newGroup = userInput.replace(/[^- a-zA-Z0-9,()&\/]+/g, " ").trim();
            placeEditorGroupResetComplete(newGroup);
        });
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





