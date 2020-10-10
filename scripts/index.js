// Creates an index sidebar on the map


function showIndex(includedPins) {

    let hasLoosePics = g("loosePicsShow").children.length > 0;

    if (hasLoosePics || location.queryParameters["noindex"]) {
        g("indexSidebar").style.display = "none";
        g("groupSelectorBox").style.display = "none";
        return;
    }
    g("indexSidebar").style.display = "block";
    g("groupSelectorBox").style.display = "none";
    openIndex();
    g("indexSidebar").innerHTML = indexHtml(includedPins);

}

function indexHtml(includedPins) {
    let tree = placeTree(
        includedPins ? includedPins.map(p => p.place)
            : Object.keys(window.Places).map(k => window.Places[k]),
        window.tagSelected);
    let s = "<style>.sub {padding-left:10px;transition:all 1s;overflow:hidden;} " +
        ".group{position:sticky;top:0; background-color:white; transition:all 1s} " +
        ".groupHead {position:relative; width:100%; height: 20px; left: 0px;}" +
        ".groupHead div {position: absolute; width: 100%; top:0; left: 0; white-space:nowrap; overflow:hidden; }" +
        ".group img{position: absolute; right:0px; transition:transform 0.5s} .group .up{transform:rotate(180deg);}" +
        "</style>";
    for (let i = 0; i < tree.groupIds.length; i++) {
        let groupId = tree.groupIds[i];
        if (groupId) {
            s += `<div onclick="expand(this)" class="group"><div class="groupHead"><div><b>${groupId}</b></div><img src="img/drop.png"></div></div>`;
            s += `<div class='sub' style="display:none">`;
        }
        else { // one blank group at the top
            s += "<div class='sub'>";
        }
        for (let j = 0; j < tree.groups[groupId].length; j++) {
            let place = tree.groups[groupId][j];
            s += "<div onclick='indexClick(\"{0}\", event)' title='{2}' style='background-color:{3}'>{1}</div>"
                .format(place.id, trunc(place.Title, 20), place.Title.replace(/'/g, "&apos;"), placePinColor(place, true));
        }
        s += "</div>";
    }
    return s;
}

function openIndex() {
    g("indexSidebar").style.marginLeft = "0";
    hide("indexFlag");
}

function indexClick(placeKey, event) {
    hideIndex();
    gotoFromIndex(placeKey, event);
}

function hideIndex() {
    if (window.hideIndex || window.innerWidth < 600) {
        g("indexSidebar").style.marginLeft = "-98%";
        show("indexFlag");
    }
}

function expand(div) {
    let sub = div.nextElementSibling;
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

function placeTree(places, tagId) {
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

function numerize(s) {
    return s.replace(/[0-9]+/g, n => "00000".substr(0, Math.max(0, 5 - n.length)) + n);
}

function sanitize(id) {
    return id.replace(/[^a-zA-Z0-9]+/g, "_");
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
        groupKeys.sort();

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
        geHtml += "<select id='groupEditorUi' ><option value=''>(none)</option>";
        for (var i = 0; i < groupKeys.length; i++) {
            geHtml += "<option value='{0}' >{0}</option>".format(groupKeys[i]);
        }
        geHtml += "</select>";
        g("groupEditorBox").innerHTML = geHtml;
    }
}

function createNewGroup() {
    if (window.user.isEditor || window.user.isAdmin) {
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

//window.addEventListener('resize', (e) => showIndex(), true);
window.selectedGroup = getCookie("group");
if (window.location.queryParameters.group) {
    setSelectedGroup(window.location.queryParameters.group);
}

function setNewGroupOption() {
    let ok = window.user && (window.user.isAdmin || window.user.isEditor);
    show("newGroupButton", ok ? "inline-block" : "none");
}