// Creates an index sidebar on the map


/** Create a sidebar if the window is wide enough
 */
function showIndex() {
    if (window.selectedGroup) {
        if (!window.groupsAvailable || !window.groupsAvailable[window.selectedGroup]) {
            window.selectedGroup = "";
        }
    }
    let hasLoosePics = g("loosePicsShow").children.length > 0;

    if (hasLoosePics || window.innerWidth < 600) {
        g("indexSidebar").style.display = "none";
        g("groupSelectorBox").style.display = "none";
        return;
    }
    g("indexSidebar").style.display = "block";
    g("groupSelectorBox").style.display = "block";
    let placeList = filterPlaces(window.Places, window.tagSelected, window.selectedGroup);
    let barHtml = "";

    for (var i = 0; i < placeList.length; i++) {
        var place = placeList[i];
        barHtml += "<div onclick='goto(\"{0}\")' title='{2}' style='background-color:{3}'>{1}</div>"
            .format(place.id, trunc(place.Title, 20), place.Title.replace(/'/g, "&apos;"), placePinColor(place, true));
    }
    g("indexSidebar").innerHTML = barHtml;
}


function filterPlaces(sparsePlaces, tagId, selectedGroup) {
    let ids = Object.keys(sparsePlaces);
    let sortedPlaces = [];
    for (var i = 0; i < ids.length; i++) {
        let place = sparsePlaces[ids[i]];
        if (place.HasTag(tagId) && (!selectedGroup || place.group == selectedGroup)) {
            sortedPlaces.push(place);
        }
    }
    sortedPlaces.sort((a, b) => a.Title.toLowerCase().localeCompare(b.Title.toLowerCase()));
    return sortedPlaces;
}

function tagBgColor(tags) {

}

function trunc(s, n) {
    if (s.length < n) return s;
    return s.substr(0, n - 1) + "…";
}

function selectGroup() {
    setSelectedGroup(g("groupSelectorUi").value);
    showIndex();
}

function setSelectedGroup(group) {
    window.selectedGroup = group;
    setCookie("group", group);
}

function setGroupOptions() {
    if (window.groupsAvailable) {
        let groupKeys = Object.keys(window.groupsAvailable);
        if (groupKeys.length < 1) return;

        // Selector atop index
        let gsHtml = "";
        gsHtml += "<select id='groupSelectorUi' onchange='selectGroup()'><option value=''>(all)</option>";
        for (var i = 0; i < groupKeys.length; i++) {
            gsHtml += "<option value='{0}' {1}>{0}</option>".format(groupKeys[i], (groupKeys[i] == window.selectedGroup ? "selected" : ""));
        }
        gsHtml += "</select>";
        g("groupSelectorBox").innerHTML = gsHtml;

        // Selector in place editor
        let geHtml = "Group: ";
        geHtml += "<select id='groupEditorUi' onchange='createNewGroup()' ><option value=''>(none)</option>";
        for (var i = 0; i < groupKeys.length; i++) {
            geHtml += "<option value='{0}' >{0}</option>".format(groupKeys[i]);
        }
        geHtml += "<option id='newGroupOption' value='-new-' disabled>-new-</option></select>";
        g("groupEditorBox").innerHTML = geHtml;
    }
}

function createNewGroup() {
    if (window.user.isEditor || window.user.isAdmin && g("groupEditorUi").value == "-new-") {
        showInputDialog(null, null, "Create a new group name", "", (pic, pin, userInput) => {
            let newGroup = userInput.replace(/[^- a-zA-Z0-9,()&\/]+/g, " ").trim();
            if (newGroup) {
                let addGroup = (selectorName) => {
                    let opt = document.createElement("option");
                    opt.value = newGroup;
                    opt.text = newGroup;
                    let selector = g(selectorName);
                    selector.add(opt, selector.length - 1);
                    return selector;
                }
                addGroup("groupSelectorUi");
                addGroup("groupEditorUi").value = newGroup;
                window.groupsAvailable[newGroup] = 1;
            }
        });
    }
}

window.addEventListener('resize', showIndex, true);
window.selectedGroup = getCookie("group");
if (window.location.queryParameters.group) {
    setSelectedGroup(window.location.queryParameters.group);
}

function setNewGroupOption() {
    let ok = window.user && (window.user.isAdmin || window.user.isEditor);
    let newGroupOption = g("newGroupOption");
    if (newGroupOption) newGroupOption.disabled = !ok;
}