// Creates an index sidebar on the map


/** Create a sidebar if the window is wide enough
 */
function showIndex() {
    if (window.innerWidth < 600) {
        g("indexSidebar").style.display = "none";
        return;
    }
    g("indexSidebar").style.display = "block";
    let placeList = filterPlaces(window.Places, window.tagSelected, window.selectedGroup);
    let barHtml = "";

    if (window.groupsAvailable) {
        let groupKeys = Object.keys(window.groupsAvailable);
        barHtml += "<select id='groupSelectorUi' onchange='selectGroup()'><option value=''>(all)</option>";
        for (var i=0; i<groupKeys.length; i++) {
            barHtml += "<option value='{0}' {1}>{0}</option>".format(groupKeys[i], (groupKeys[i] == window.selectedGroup ? "selected" : ""));
        }
        barHtml += "</select>";
    }

    for (var i = 0; i<placeList.length; i++) {
        var place = placeList[i];
        barHtml += "<div onclick='goto(\"{0}\")' title='{2}' style='background-color:{3}'>{1}</div>"
        .format(place.id, trunc(place.Title, 20), place.Title.replace(/'/g,"&apos;"), placePinColor(place, true));
    }
    g("indexSidebar").innerHTML = barHtml;
}


function filterPlaces (sparsePlaces, tagId, selectedGroup) {
    let ids = Object.keys(sparsePlaces);
    let groups = {};
    let sortedPlaces = [];
    for (var i = 0; i<ids.length; i++) {
        let place = sparsePlaces[ids[i]];
        if (place.HasTag(tagId) && !selectedGroup || place.group == selectedGroup) {
            sortedPlaces.push(place);
        }
        if (place.group) groups[place.group] = 1;
    }
    sortedPlaces.sort((a,b) => a.Title.toLowerCase().localeCompare(b.Title.toLowerCase()));
    window.groupsAvailable = groups;
    return sortedPlaces;
}

function tagBgColor (tags) {

}

function trunc(s, n) {
    if (s.length < n) return s;
    return s.substr(0, n-1) + "…";
}

function selectGroup () {
    setSelectedGroup(g("groupSelectorUi").value);
    showIndex();
}

function setSelectedGroup (group) {
    window.selectedGroup = group;
    setCookie("group", group);
}

window.addEventListener('resize', showIndex, true);
window.selectedGroup = getCookie("group");
if (window.location.queryParameters.group) {
    setSelectedGroup(window.location.queryParameters.group);
}
