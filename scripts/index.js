
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

    subNodeOfPath(pathArray) {
        if (pathArray.length == 0) return this;
        else {
            let subnode = this.subs[pathArray[0]];
            if (!subnode) return null;
            return subnode.subNodeOfPath(pathArray.slice(1));
        }
    }

    get shortName() {
        if (!this._shortName) {
            let split = this.pathString.split("/");
            this._shortName = split[split.length - 1].replace("¬", "");
        }
        return this._shortName;
    }

    /** Set keys to be a sorted list of the keys of subs, and sort leaves. */
    sortKeys(leafsort) {
        this.leaves.sort(leafsort);
        this.keys = Array.from(Object.keys(this.subs));
        this.keys.sort();
        // Any leaf place with the same name as a subgroup is the subgroup's head
        // 
        this.leaves.forEach(leaf => {
            let sub = this.subs[leaf.Title];
            if (sub) { sub.headPlace = leaf; }
        });

        this.keys.forEach(k => {
            this.subs[k].sortKeys(leafsort);
        });
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

    /**
     * Place group has been clicked, in index or on map.
     * Should sync with open/closed state: 
     * - Index expand/collapse at this level
     * - if there is a head place on this node:
     * - - Expand/collapse state of head place pin
     * - - Visibility on map of places in this group, and unheaded subgroups
     * On close, close subnodes with head places; close lightbox
     * On open, if there's a head place, show it in lightbox
     * @param {boolean} toggle - if true, flip state; if false, set to setOpen
     * @param {boolean} setOpen - no effect if already in this state
     */
    /*
    expandOrCollapse(toggle = true, setOpen) {
        if (toggle) {
            this.isOpen = !this.isOpen;
        } else {
            if (this.isOpen == setOpen) return;
            else this.isOpen = setOpen;
        }
        if (!this.isOpen) {
            // close subplaces recursively
            this.keys.forEach(k => {
                this.expandOrCollapse(false, false);
            });
        }
        this.expandOrCollapseIndexGroup();
        if (this.headPlace) {
            this.expandOrCollapseHeadPlace();
            this.setLeavesAndSubLeavesVisibility();
        }
    }

    expandOrCollapseIndexGroup() {
        
    }
*/
    /** Set head place  */
    expandOrCollapseHeadPlace() {

    }

    /** If this node has a head place, show or hide those other than the head
     * @param {boolean} show - show or hide
     * @returns Whether this node has a head place
     */
    showSubPlaces(show = false, repaint = true, doAnyway = false) {
        if (!doAnyway && !this.headPlace) return false;
        this.isShowingSubs = show;
        if (this.headPlace) window.map.updatePinForPlace(this.headPlace);

        this.leaves.forEach(leaf => {
            if (leaf != this.headPlace || doAnyway) window.map.setPlaceVisibility(leaf, show);
        });
        this.keys.forEach(key => this.subs[key].showSubPlaces(show, false, true));
        if (repaint) {
            if (!show) window.lightboxU.hide();
            if (show && this.leaves.length > 2) {
                window.map.setBoundsRoundPlaces(this.leaves);
            } else {
                window.map.repaint();
            }
        }
        return this.leaves;
    }

    showSubPlacesOf(place) {
        if (this.headPlace == place) {
            let show = !this.isShowingSubs;
            let placesDone = this.showSubPlaces(show);
            return show || !placesDone || placesDone.length < 2;
        }
        return true;
    }

    /** Work down the tree and hide nodes that have a head place */
    hideSubplaces(level = 0) {
        if (!this.showSubPlaces(false, false)) {
            this.keys.forEach(key => this.subs[key].hideSubplaces(1));
        }
        if (level == 0) {
            window.map.updatePinForPlace(this.headPlace);
            window.map.repaint();
            window.lightboxU.hide();
        }
    }

}

/** Creates an index sidebar on the map and controls visibility of points */
class Index {

    constructor () {
        this.showingRecent = false;
        this.searchTerm = "";
        // ~zones.js
        this.hideIndexOK = true;
        this.indexCheckBoxes = false;
    }


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
            //html("indexSidebar", this.indexHtml(includedPins));
            this.setIndex(g("indexSidebar"), includedPins);
            this._GroupTree.hideSubplaces();
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
        let headNode = g("div#" + groupPath), subNode = g("sub#" + groupPath);
        while (headNode && subNode) {
            this.expandOrCollapseGroup(headNode, subNode, true);
            subNode = subNode.parentElement;
            headNode = g("div" + (subNode.id || "----").substr(3));
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
        let groupNode = this.GroupTree ? this._GroupTree.subNodeOfPath(
            header.id.substr(header.id.indexOf('#') + 1).split("/")) : null;
        let img = header.getElementsByTagName("img")[0];
        if (sub.style.display == "none") {
            img.className = "up";
            sub.style.display = "block";
            sub.style.maxHeight = "20000px";
            header.scrollIntoView();
            //header.parentNode.scrollBy(0, 20);
            if (groupNode) {
                groupNode.showSubPlaces(true);
                window.map.repaint();
            }
        } else {
            if (!expandOnly) {
                img.className = "";
                sub.style.maxHeight = 0;
                setTimeout(() => {
                    if (sub.style.maxHeight[0] == "0")
                        sub.style.display = "none";
                }, 1200);

                if (groupNode) {
                    groupNode.hideSubplaces();
                    window.map.repaint();
                }
            }
        }
    }

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
    filter(place, noTextSearch = false, excludeIndexSubs = false) {
        return (!this.showingRecent || (this.now - dateFromGB(place.modified).getTime()) < 7 * 24 * 60 * 60 * 1000)
            && (!window.tagSelected || place.HasTag(window.tagSelected))
            && (noTextSearch || !this.searchPattern || !!place.text.match(this.searchPattern))
            && (!map.isPolyActive || map.polyContains(place.loc.e, place.loc.n));
        //&& (excludeIndexSubs || !(place.indexGroupNode && place.indexGroupNode.headPlace && place.indexGroupNode.headPlace != place));
    }


    /** Private. Generate the HTML for the index. 
     * @param {Array[Pin]} includedPins Filtered list of places to include in the index, or to show with checkbox checked.
     */
    setIndex(where, includedPins) {
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
        // We'll make it parse the first bit, then we'll put the rest in as objects:
        where.innerHTML = s;

        // Make a tree of the groups. 
        // If we're not showing checkboxes in the index, just include the filtered places.
        // If we are showing checkboxes, include everything. (Checkboxes will indicate whether filtered.)
        let groups = this.groupTree(
            includedPins && !this.indexCheckBoxes ? includedPins.map(p => p.place)
                : Object.keys(window.Places).map(k => window.Places[k]));
        this.setIndexNest(where, groups, window.tagSelected, 0);
    }

    /** Private.
     * Generate HTML index from GroupNode tree
     * @param {Element} where - parent index node to which to add header and children
     * @param {GroupNode} groupNode - current node. groupNode.pathString is long id like xxx/yyy/zzz
     * @param {string} tagId - selected tag filter if any
     * @param {int} indent - nesting level
     */
    setIndexNest(where, groupNode, tagId, indent) {
        let itemCount = 0;
        let allChecked = true;
        let anyChecked = false;

        // Header
        if (groupNode.pathString) {
            groupNode.headerElement = c("div#" + groupNode.pathString, "div", where, null, {c:"group"});
            // defer filling in the rest of the header until we've got allChecked set
        }

        // Contents
        let subsAttributes = { "c": "sub" };
        if (groupNode.pathString) {
            subsAttributes.style = `display:none;padding-left:${(indent + 1) * 4}px`;
        }
        groupNode.subsElement = c("sub#" + groupNode.pathString, "div", where, null, subsAttributes);

        // Leaves
        groupNode.leaves.forEach(place => {
            itemCount++;
            let indexPlaceContainer = c("", "div", groupNode.subsElement, null, { c: "indexPlaceContainer" });
            let indexPlaceContainer1 = c("", "div", indexPlaceContainer);
            if (this.indexCheckBoxes) {
                let check = this.filter(place);
                if (!check) allChecked = false;
                if (check) anyChecked = true;
                let attr = { "type": "checkbox" };
                if (check) attr.checked = "checked";
                c("checkbox#" + place.id, "input", indexPlaceContainer1, null, attr);
            };
            let indexPlace = c("", "div", indexPlaceContainer1, null, {
                c: "indexPlace",
                data: place.id,
                onclick: `index.indexClick("${place.id}", event)`,
                title: place.Title.replace(/'/g, "&apos;"),
                style: `background-color:${placePinColor(place, true)}`,
                h: place.Title
            });
            indexPlace.groupNode = groupNode;
        });

        // Subgroups

        let showSubGroups = kk => {
            kk.forEach(subKey => {
                let sub = this.setIndexNest(groupNode.subsElement, groupNode.subs[subKey], tagId, indent + 1);
                if (this.indexCheckBoxes || sub.itemCount > 0) {
                    itemCount++;
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

        // Complete the header now that we've got allChecked
        if (groupNode.headerElement) {
            let groupHead = c(null, "div", groupNode.headerElement, null,
                { title: groupNode.pathString, c: "groupHead" });
            if (this.indexCheckBoxes) {
                c("groupcb#" + groupNode.pathString, "input", groupHead, null, {
                    type: "checkbox",
                    onchange: "index.groupCheckboxChange(this)",
                    checked: allChecked
                });
            }
            let ghsub = c(null, "div", groupHead, null, {
                h: `<span>${groupNode.shortName}</span><img src="img/drop.png">`});
            ghsub.groupNode = groupNode;
            ghsub.addEventListener( "click", (o,e) => {index.toggleGroup(o.currentTarget)});
        }
        return { itemCount, allChecked, anyChecked };
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
                place.indexGroupNode = node;
                if (place.Title == node.shortName) {
                    node.headPlace = place;
                }
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
