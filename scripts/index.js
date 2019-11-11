// Creates an index sidebar on the map

/** Create a sidebar if the window is wide enough
 */
function showIndex() {
    if (window.innerWidth < 600) {
        g("indexSidebar").style.display = "none";
        return;
    }
    g("indexSidebar").style.display = "block";
    let placeList = filterPlaces(window.Places, window.tagSelected);
    let barHtml = "";
    for (var i = 0; i<placeList.length; i++) {
        var place = placeList[i];
        barHtml += "<div onclick='goto(\"{0}\")' title='{2}' style='background-color:{3}80)'>{1}</div>"
        .format(place.id, trunc(place.Title, 20), place.Title.replace(/'/g,"&apos;"), placePinColor(place));
    }
    g("indexSidebar").innerHTML = barHtml;
}

function filterPlaces (sparsePlaces, tagId) {
    let ids = Object.keys(sparsePlaces);
    let sortedPlaces = [];
    for (var i = 0; i<ids.length; i++) {
        let place = sparsePlaces[ids[i]];
        if (place.HasTag(tagId)) {
            sortedPlaces.push(place);
        }
    }
    sortedPlaces.sort((a,b) => a.Title.toLowerCase().localeCompare(b.Title.toLowerCase()));
    return sortedPlaces;
}

function tagBgColor (tags) {

}

function trunc(s, n) {
    if (s.length < n) return s;
    return s.substr(0, n-1) + "…";
}

window.addEventListener('resize', showIndex, true);