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
    window.polygon = null;
    index.hideIndexOK = true;
    index.indexCheckBoxes = false;
    index.showIndex();
}

function ZoneUI() {
    setUI();

    var svg, polygon, ctm;

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
        html("zones", "<div class='noselect'>" +
            "<svg id='zonesvg' class='noselect' viewBox='0,0,100,100' style='width:100%;height:100%;cursor:pointer;display:none'>" +
            "<polygon id='zonepolygon' points='30,20 70,20 70,50 30,50' stroke='blue' fill='rgba(0,0,0,0.2)' stroke-width='1'/>" +
            "</svg></div>" +
            "<div id='cpanel' class='selectable' style='position:fixed;top:64px;left:206px;width:200px;bottom:80px; padding:10px; background-color:lightblue'>" +
            "<button class='closeX boxClose' onclick='closeZoneUI()'>X</button>" +
            "<h3>Group batch update</h3>Move places in and out of groups." + 
            "<h4>1. Select places or groups</h4><p>Draw around places on the map, or use the search, Tag and New buttons.<br/>" +
            "<button id='zoneDrawButton'>Draw on map</button><button id='zoneGoButton'>Filter to polygon</button><button id='zoneClearButton'>Clear</button><br/>" +
            "And/or use the checkboxes in the index.<br/>" +
            "<button  onclick='selectIndex(false)'>Deselect all</button>" +
            "<h4>2. Select a destination group</h4><div id='destinationSelector'></div>" +
            "<h4>3. Update groups</h4>" +
            "<button id='moveGroupsButton'>Move complete group(s) into destination</button>" +
            "<button id='movePlacesButton'>Move selected places to destination</button>" +
            "</div>");

        let groupSelector = new GroupSelector("destinationSelector");
        groupSelector.setGroup("");

        listen("moveGroupsButton", "click", evt => {
            let groupsToMove = indexCheckedGroups();
            if (groupsToMove.length==0) return;
            let targetGroup = groupSelector.Path;
            Object.keys(window.Places).forEach(k => {
                let place = window.Places[k];
                for (let i = 0; i<groupsToMove.length; i++) {
                    if (place.group==group || place.group.startsWith(group+"/")) {
                        place.group = place.group.replace(group, targetGroup);
                        sendPlace(place);
                        break;
                    }
                }
            });
            index.showIndex();
        });

        listen("movePlacesButton", "click", evt => {
            let targetGroup = groupSelector.Path;
            indexSelectedPlaces().forEach(place => {
                place.group = targetGroup;
                sendPlace(place);
            });
            index.showIndex();
        });

        listen("zoneDrawButton", "click", drawOnMapStart);
        listen("zoneGoButton", "click", zoneGo);
        listen("zoneClearButton", "click", zoneClear);

        show("zones");
        hide("zonesvg");
        g("zones").classList.add("noselect");
    }

    function drawOnMapStart () {
        svg = g("zonesvg");
        show(svg);
        polygon = g("zonepolygon");
        for (let j = 0; j < polygon.points.length; j++) {
            let circle = c("c" + j, "circle", svg, "http://www.w3.org/2000/svg");
            circle.setAttributeNS(null, "cx", polygon.points[j].x);
            circle.setAttributeNS(null, "cy", polygon.points[j].y);
            circle.setAttributeNS(null, "r", 3);
            circle.setAttributeNS(null, "fill", "blue");
            circle.classList.add("selectable");
            circle.addEventListener("mousedown", startDrag);
            circle.addEventListener('mousemove', drag);
            circle.addEventListener('mouseup', endDrag);
            circle.addEventListener('mouseleave', endDrag);
            circle.polygonIndex = j;
        }
    }

    function zoneGo() {
        if (!svg) return;
        ctm = svg.getScreenCTM();
        window.polygon = new Polygon(polygon.points, p => {
            let screenx = p.x * ctm.a + ctm.e;
            let screeny = p.y * ctm.d + ctm.f;
            let lonLat = window.map.screenToLonLat(screenx, screeny);
            return { x: lonLat.e, y: lonLat.n };
        });
        index.showIndex();
    }

    function zoneClear() {
        if (svg) hide(svg);
        window.polygon = null;
        index.showIndex();
    }

    var selectedVertex = null;
    var startMouseX, startMouseY, startShapeX, startShapeY;

    function startDrag(evt) {
        selectedVertex = evt.target;
        ctm = svg.getScreenCTM();
        startMouseX = (evt.clientX - ctm.e) / ctm.a;
        startMouseY = (evt.clientY - ctm.f) / ctm.d;
        startShapeX = Number(selectedVertex.getAttributeNS(null, "cx"));
        startShapeY = Number(selectedVertex.getAttributeNS(null, "cy"));
    }

    function drag(evt) {
        if (selectedVertex) {
            evt.preventDefault();
            let mouseX = (evt.clientX - ctm.e) / ctm.a;
            let mouseY = (evt.clientY - ctm.f) / ctm.d;
            let x = mouseX - startMouseX + startShapeX;
            let y = mouseY - startMouseY + startShapeY;
            selectedVertex.setAttributeNS(null, "cx", x);
            selectedVertex.setAttributeNS(null, "cy", y);
            polygon.points[selectedVertex.polygonIndex].x = x;
            polygon.points[selectedVertex.polygonIndex].y = y;
        }
    }
    function endDrag(evt) {
        selectedVertex = null;
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
            if (!groupId.startsWith(previous+"/")) {
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
            let checkbox = g("checkbox#"+place.id);
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


class Polygon {
    pp = [];

    constructor(list, fn) {
        //let pointsList = "";
        for (let i = 0; i < list.length; i++) {
            let p = fn(list[i]);
            this.add(p.x, p.y);
        }
    }

    add(x, y) {
        if (this.pp.length == 0) {
            this.bbox = { l: x, r: x, t: y, b: y };
        } else {
            if (x < this.bbox.l) this.bbox.l = x;
            if (x > this.bbox.r) this.bbox.r = x;
            if (y < this.bbox.t) this.bbox.t = y;
            if (y > this.bbox.b) this.bbox.b = y;
        }
        this.pp.push({ x, y });
    }
    contains(x, y) {
        if (x < this.bbox.l || x > this.bbox.r) return false;
        if (y < this.bbox.t || y > this.bbox.b) return false;
        var i, j = this.pp.length - 1;
        var odd = 0;
        for (i = 0; i < this.pp.length; i++) {
            if ((this.pp[i].y < y && this.pp[j].y >= y || this.pp[j].y < y && this.pp[i].y >= y)
                && (this.pp[i].x <= x || this.pp[j].x <= x)) {
                odd ^= (this.pp[i].x + (y - this.pp[i].y) * (this.pp[j].x - this.pp[i].x) / (this.pp[j].y - this.pp[i].y)) < x;
            }
            j = i;
        }
        return odd == 1;
    }
}

