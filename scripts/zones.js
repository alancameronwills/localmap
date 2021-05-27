/*

Manage supergroups

Assign groups or supergroups by map
1. Displays a square on the map.
2. You pull the corners and drag map to define a quadrilateral.
3. Shows a list of groups occupied by places in this quad.
4. You confirm with checkboxes which ones you want to update with a new group or supergroup.
5. You opt whether to replace existing supergroup assignments, or enclose all in bigger group.
6. You provide a name for this supergroup and confirm.
7. Places *in selected area* in selected groups are updated by replacing or prefixing group name. 

Rename group or supergroup
1. Get a heirarchical list of supergroup and group names
2. You update any item on the tree, whether branch or leaf, and confirm.

Index and group selector show groups in a heirarchy: select the supergroup then the group

*/

function showZoneUI() {
    window.geoBroom = ZoneUI();
    index.hideIndexOK = false;
    index.indexCheckBoxes = true;
    index.showIndex();
}
function closeZoneUI() {
    hide("zones");
    html("zones", "");
    map.clearPoly();
    index.hideIndexOK = true;
    index.indexCheckBoxes = false;
    index.showIndex();
}

function ZoneUI() {
    setUI();

    var ctm;

    /**
     * Get places selected in the index. 
     * @param {bool} intactGroups true => Use all the places in each selected group; false => use just explicitly selected places
     */
    function getPlacesToChange(intactGroups) {
        let placesToChange = [];
        if (intactGroups) {
            let groups = indexCheckedGroups();
            map.pins.forEach(pin => {
                if (pin.place) {
                    if (groups.indexOf(pin.place.group) >= 0) {
                        placesToChange.push(pin.place);
                    }
                }
            });
        } else {
            placesToChange = indexSelectedPlaces();
        }
        return placesToChange;
    }

    function setUI() {
        html("zones",
            "<div id='cpanel' class='selectable' style='position:fixed;top:64px;left:206px;width:200px;bottom:80px; padding:10px; background-color:lightblue'>" +
            "<button class='closeX boxClose' onclick='closeZoneUI()'>X</button>" +
            "<h3>Group batch update</h3>Move places in and out of groups." +
            "<h4>1. Select places or groups</h4><p>Draw round places on the map.<br/>" +
            "<button id='zoneDrawButton'>Start drawing</button><br/><button id='zoneGoButton'>Filter to drawn shape</button><br/><button id='zoneClearButton'>Clear</button><br/>" +
            "And/or use Search, Tag, and New below.<br/>" +
            "And/or use the checkboxes in the index.<br/>" +
            "<button id='deselectButton'>Deselect all</button>" +
            "<br/><button id='drawMidLinesButton'>Draw midlines</button>" +
            "<br/><button id='clearMidLinesButton'>Clear midlines</button>" +
            "<h4>2. Select a destination group</h4><div id='destinationSelector'></div>" +
            "<h4>3. Update groups</h4>" +
            "<button id='moveGroupsButton'>Move complete group(s) into destination</button>" +
            "<button id='movePlacesButton'>Move selected places to destination</button>" +
            "</div>");

        let groupSelector = new GroupSelector("destinationSelector");
        groupSelector.setGroup("");

        g("drawMidLinesButton").proximityPolygons = new ProximityPolygons();

        listen("deselectButton", "click", evt => {
            selectIndex(false);
        })

        listen("drawMidLinesButton", "click", evt => {
            let polys = g("drawMidLinesButton").proximityPolygons;
            polys.setSelection(indexSelectedPlaces());
            polys.showMidLines();
        });
        
        listen("clearMidLinesButton", "click", evt => {
            let polys = g("drawMidLinesButton").proximityPolygons;
            polys.setSelection(indexSelectedPlaces());
            polys.removeLines();
        });

        listen("moveGroupsButton", "click", evt => {
            // If source group is aa/bb/cc/dd and target is aa/bb/xx/yy, then all groups matching aa/bb/cc/dd[/*] -> aa/bb/xx/yy/dd[/*]
            let groupsToMove = indexCheckedGroups();
            if (groupsToMove.length == 0) return;
            let targetGroup = groupSelector.Path;
            Object.keys(window.Places).forEach(k => {
                let place = window.Places[k];
                for (let i = 0; i < groupsToMove.length; i++) {
                    let group = groupsToMove[i];
                    if (group) {
                        let groupTail = group.split("/").pop();
                        if (place.group == group || place.group.startsWith(group + "/")) {
                            place.group = removeAlphaGrouping(place.group.replace(group, targetGroup + "/" + groupTail));
                            sendPlace(place);
                            break;
                        }
                    }
                }
            });
            index.showIndex();
        });

        listen("movePlacesButton", "click", evt => {
            let targetGroup =  removeAlphaGrouping(groupSelector.Path);
            indexSelectedPlaces().forEach(place => {
                place.group = targetGroup;
                sendPlace(place);
            });
            index.showIndex();
        });

        // User button: Draw an initial editable polygon
        listen("zoneDrawButton", "click", evt => {
            if (map.drawPoly) {
                map.drawPoly();
            } else {
                alert ("Not available in this cartography");
            }
        });
        // User button: Redo the index and map filter (with drawn polygon)
        listen("zoneGoButton", "click", evt => index.showIndex());
        // User button: Remove drawn polygon
        listen("zoneClearButton", "click", evt => { map.clearPoly(); index.showIndex(); });

        show("zones");
        hide("zonesvg");
        g("zones").classList.add("noselect");
    }
}

/** Groups that are checked in the index (but not their checked children) */
function indexCheckedGroups() {
    let groups = [];
    let previous = "-";
    let checkboxes = g("indexSidebar").getElementsByTagName("input");
    for (let i = 0; i < checkboxes.length; i++) {
        // This input is a checkbox, is a group checkbox, and is checked: 
        if (checkboxes[i].type == "checkbox" && checkboxes[i].id.startsWith("groupcb#") && checkboxes[i].checked) {
            let groupId = checkboxes[i].id.replace("groupcb#", "");
            if (!groupId.startsWith(previous + "/")) {
                groups.push(groupId);
                previous = groupId;
            }
        }
    }
    return groups;
}

/**
 * Places that are checked in the index
 */
function indexSelectedPlaces() {
    let selectedPlaces = [];
    let placesInIndex = g("indexSidebar").getElementsByClassName("indexPlace");
    for (let i = 0; i < placesInIndex.length; i++) {
        let place = window.Places[placesInIndex[i].getAttribute("data")];
        if (place) {
            let checkbox = g("checkbox#" + place.id);
            if (checkbox && checkbox.checked) {
                selectedPlaces.push(place);
            }
        }
    }
    return selectedPlaces;
}

function selectIndex(yes) {
    let checkboxes = g("indexSidebar").getElementsByTagName("input");
    for (let i = 0; i < checkboxes.length; i++) {
        if (checkboxes[i].type == "checkbox") {
            checkboxes[i].checked = yes;
        }
    }
}

function getSuperGroups() {
    let supergroupSet = {};
    let groups = {};
    window.map.pins.forEach(element => {
        let place = element.place;
        if (place) {
            let g = place.group || "";
            if (!groups[g]) groups[g] = [];
            groups[g].push(place);
            if (g.indexOf("/") > 0) {
                let sg = g.replace(/\/[^/]*$/, "");
                supergroupSet[sg] = 1;
            }
        }
    });
    return Object.keys(supergroupSet);
}



