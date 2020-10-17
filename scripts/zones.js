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
            "<svg id='zonesvg' class='noselect' viewBox='0,0,100,100' style='width:100%;height:100%;cursor:pointer'>" +
            "<polygon id='zonepolygon' points='30,20 70,20 70,50 30,50' stroke='blue' fill='rgba(0,0,0,0.2)' stroke-width='1'/>" +
            "</svg></div>" +
            "<div id='cpanel' class='selectable' style='position:fixed;top:64px;left:206px;width:200px;bottom:80px; padding:10px; background-color:lightblue'>" +
            "<button class='closeX boxClose' onclick='closeZoneUI()'>X</button>" +
            "<h3>Group batch update</h3><h4>1. Select groups</h4><p>Filter the index: adjust the polygon on the map and then click the button below." +
            " You can also use the search, Tag and New buttons at the bottom.<br/>" +
            "<button id='zoneGoButton'>Filter to polygon</button><div id='zonetext'></p></div>" +
            "<h4>2. Refine selection</h4>Use the checkboxes in the index.<br/>" +
            "<button onclick='selectIndex(true)'>Select all</button> <button  onclick='selectIndex(false)'>Deselect all</button>" +
            "<h4>3. Update groups</h4>" +
            /*
            "<div style='border-radius:6px;border: 1px solid blue;'>" +
            "<label for='newGroupInput'>Change group</label><input id='newGroupInput' type='text'/>" +
            "<div><input id='intactGroupSelector' type='checkbox' name='groupSplitChoice' checked /> <label for='intactGroupSelector'>Complete groups</label></div>" +
            "<button id='changeGroupButton'>Change</button>" +
            "</div>" +
            */
            "<div style='border-radius:6px;border: 1px solid blue;'>" +
            "<label for='superGroupSelector'>Move groups into super</label>" +
            `<select id='superGroupSelector'>${getSuperGroups().map(gr => "<option>{0}</option>".format(gr))}<option>(new)</option></select>` +
            "<input id='newSupergroupInput' type='text' title='New supergroup name' />" +
            "<button id='intoSuperGroupButton'>Move</button>" +
            "</div>" +
            "<div style='border-radius:6px;border: 1px solid blue;'>" +
            "<label for='newSubgroupInput'>Split a group into a sub</label>" +
            "<input id='newSubgroupInput' type='text' title='New subgroup name' />" +
            "<button id='intoSubGroupButton'>Split</button>" +
            "</div>" +
            "<div style='border-radius:6px;border: 1px solid blue;'>" +
            "<button id='mergeUpButton'>Merge into super</button>" +
            "</div>" +
            "</div>");

        listen("mergeUpButton", "click", evt => {
            let placesToChange = getPlacesToChange();
            let fromGroups = Object.keys(placesToChange.reduce((total, current)=>{total[current.group]=1;return total;}, {}));
            if (fromGroups.length != 1 && fromGroups[0].indexOf("/")>0) {alert("Select places all in the same subgroup"); return;}
            let groupToBe = fromGroups[0].replace(/\/[^\/]*$/, "");
            placesToChange.forEach(place => {place.group = groupToBe;});
            index.showIndex();
        });

        listen("superGroupSelector", "change", evt => {
            if (evt.target.selectedIndex == evt.target.options.length - 1) {
                show("newSupergroupInput");
            } else {
                hide("newSupergroupInput");
            }
        });

        listen("intoSubGroupButton", "click", evt => {
            let subgroup = g("newSubgroupInput").value.trim().replace(/\/'"`/g, "_");
            if (!subgroup) return;
            if (indexCheckedGroups().length != 1) {alert("Select one group"); return;}
            let placesToChange = getPlacesToChange(false);
            placesToChange.forEach(place => {place.group = place.group + "/" + subgroup; sendPlace(place);});
            window.polygon = null;
            index.showIndex();
        });

        listen("intoSuperGroupButton", "click", evt => {
            let superGroup = g("superGroupSelector").value;
            if (superGroup == "(new)") superGroup = g("newSupergroupInput").value.trim();
            if (!superGroup) return;
            let placesToChange = getPlacesToChange(true);
            placesToChange.forEach(place => {place.group = superGroup + "/" + place.group; sendPlace(place);});
            index.showIndex();
        });

        listen("changeGroupButton", "click", evt => {
            let changeTo = g("newGroupInput").value.trim().replace(/'"/g, "_");
            if (!changeTo) return;
            let placesToChange = getPlacesToChange(g("intactGroupSelector").checked);
            if (changeTo.endsWith("/*")) {
                let prefix = changeTo.substr(0, changeTo.length - 1);
                placesToChange.forEach(place => { place.group = prefix + place.group; sendPlace(place); });
            } else {
                placesToChange.forEach(place => { place.group = changeTo; sendPlace(place); });
            }
            window.polygon = null;
            index.showIndex();
        });

        show("zones");
        g("zones").classList.add("noselect");
        svg = g("zonesvg");
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
        g("zoneGoButton").addEventListener("click", zoneGo);
    }

    function zoneGo() {
        ctm = svg.getScreenCTM();
        window.polygon = new Polygon(polygon.points, p => {
            let screenx = p.x * ctm.a + ctm.e;
            let screeny = p.y * ctm.d + ctm.f;
            let lonLat = window.map.screenToLonLat(screenx, screeny);
            return { x: lonLat.e, y: lonLat.n };
        });
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

/** Groups that are checked in the index */
function indexCheckedGroups() {
    let groups = [];
    let checkboxes = g("indexSidebar").getElementsByTagName("input");
    for (let i = 0; i < checkboxes.length; i++) {
        // This input is a checkbox, is a group checkbox, and is checked: 
        if (checkboxes[i].type == "checkbox" && checkboxes[i].id.startsWith("groupcb#") && checkboxes[i].checked) {
            groups.push(checkboxes[i].id);
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

