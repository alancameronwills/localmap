// Project tags: the tag buttons/dropdown in the editor, the tags key panel,
// filtering the index by tag, and tag-derived pin colours.

function callDropdown() {
    var checkList = document.getElementById('tagSelectorList');
    checkList.getElementsByClassName('tagAnchor')[0].onclick = function (evt) {
        checkList.classList.add('visible');
    }
    checkList.onmouseleave = function (evt) {
        checkList.classList.remove('visible');
    }
}

function makeTags() {
    if (!window.project.tags || window.project.tags.length == 0) {
        hide("tagKeyButton");
        hide("eh2");
        return;
    }
    // Top of the editor
    var sDropDown = "<div id='tagSelectorList' class='dropdown-check-list' tabindex='100'><span class='tagAnchor'>Tags</span><ul class='items'>";
    var sButtons = "<div style='background-color:white;width:100%;'>";
    window.project.tags.forEach(function (tag) {
        sDropDown += `<li><input type='checkbox' class='tag' id='${tag.id}' onchange='clickTag(this)'/><label id='label${tag.id}'>${tag.name}</label></li>`;
        sButtons += "<div class='tooltip'>" +
            `<span class='tag' style='background-color:${tag.color}' id='${tag.id}' onclick='clickTag(this)'> <span id='label${tag.id}'>${tag.name}</span> </span>` +
            `<span class='tooltiptext' id='tip${tag.id}'>${tag.tip}</span></div>`;
    });
    sDropDown += "</ul></div>"
    sButtons += "</div>";

    if (window.innerWidth < 960) {
        html("tags", sDropDown);
        callDropdown();
    } else {
        html("tags", sButtons);
    }


    // Tags key panel
    var ss = "";
    window.project.tags.forEach(function (tag) {
        ss += "<div id='c{0}' onclick='tagFilter(this.id)'><div class='tagButton' style='border-color:{1}'></div><span id='k{0}'>{2}</span></div>"
            .format(tag.id, tag.color, tag.name);
    });
    html("tagsKeyPanel", ss + "<div id='cpob' onclick='tagFilter(\"\")'><div class='tagButton' style='border-color:black'></div><span id='kpob'>All</span></div>");
}

function switchTagLanguage(iaith = "") {
    window.project.tags.forEach((tag) => {
        html("label" + tag.id, tag["name" + iaith]);
        html("tip" + tag.id, tag["tip" + iaith]);
        html("k" + tag.id, tag["name" + iaith]);
    });
}

function tagFilter(cid) {
    appInsights.trackEvent({ name: "tagFilter" });
    g("searchButton").value = "";
    window.tagSelected = cid ? cid.substring(1) : "";
    g("tagKeyButton").style.backgroundImage = "none";
    g("tagKeyButton").style.backgroundColor = window.tagSelected ? knownTag(window.tagSelected).color : "#ffffff";
    index.showIndex(window.tagSelected);
}

function knownTag(id) {
    for (var i = 0; i < window.project.tags.length; i++) {
        if (id == window.project.tags[i].id) return window.project.tags[i];
    }
    return null;
}


function clickTag(span) {
    var tagClicked = " " + span.id;
    var pop = g("popup");
    if (!pop.editable) return;
    var place = pop.placePoint.place;
    if (!place.tags || typeof (place.tags) != "string") place.tags = "";
    var ix = place.tags.indexOf(tagClicked);
    if (ix < 0) place.tags += tagClicked;
    else place.tags = place.tags.replace(tagClicked, "");
    showTags(place);
}

function showTags(place) {
    var tagSpans = document.getElementsByClassName("tag");
    for (var i = 0; i < tagSpans.length; i++) {
        var tagSpan = tagSpans[i];
        if (place.HasTag(tagSpan.id)) {
            tagSpan.style.borderColor = "coral";
            tagSpan.style.borderStyle = "solid";
            tagSpan.checked = true;
        }
        else {
            tagSpan.style.borderStyle = "none";
            tagSpan.checked = false;
        }
    }
}

/** Colour dependent on tags. Optional light version for backgrounds. */
function placePinColor(place, light) {
    var transp = light ? 0.2 : 1.0;
    var thisPinColor = light ? "#ffffff00" : (place.text.length > 100 || place.pics.length > 0
        ? "#FF40FF" : "#FF40FF");
    if (place.tags) {
        for (var i = 0; i < window.project.tags.length; i++) {
            if (place.tags.indexOf(window.project.tags[i].id) >= 0) {
                thisPinColor = light ? window.project.tags[i].lightColour : window.project.tags[i].color;
            }
        }
    }
    return thisPinColor;
}

// Default colour, shape, and label of a pin:
function pinOptions(place) {
    return {
        title: place.Title.replace(/&#39;/g, "'").replace(/&quot;/g, "\"").replace(/&nbsp;/g, " "),
        text: place.IsInteresting ? "" : "-",
        //subTitle: place.subtitle,
        color: placePinColor(place),
        enableHoverStyle: true, // for Bing
        // Index isn't set yet, so too early to follow link to group
        isGroupHead: false // place.group && place.group.endsWith(place.Title) // 2021-01-19 disable groupHeads
    };
}
