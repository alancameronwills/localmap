//
// Text editor
//

// User clicked one of the editing buttons (H, para, Bold, Italic, ...)
function onFormatDoc(sCmd, sValue, ui) {
    var x = document.getSelection().focusNode.parentElement;
    // Special characters can be inserted in title, subtitle or description.
    // Formatting commands can only be performed on the description text.
    if (sCmd == "InsertText" || isInNode(x, "popuptext")) {
        document.execCommand(sCmd, ui, sValue);
    }
    x.focus();
}


// User clicked the button to link the text selection
function onCreateLink() {
    var selection = window.getSelection();
    var inLink = nodeIsInLink(selection.anchorNode);
    if (!isInNode(selection.anchorNode, "popuptext") || selection.isCollapsed && !inLink) {
        window.alert("To create a link to another web page, first select a phrase in the text.");
        return;
    }

    // Are we editing an existing link?
    if (inLink) {
        // Expand the selection to the whole link:
        window.getSelection().removeAllRanges();
        var range = document.createRange();
        range.selectNode(inLink);
        window.getSelection().addRange(range);
        $("#linkRef").value = inLink.href;
    } else {
        /*
        // New link. Check if it's the title of another place.
        var phrase = window.getSelection().toString();
        var place = placeFromTitle(phrase);
        if (place) {
            $("#linkRef")[0].value = "./?place=" + place;
        }
        */
    }

    $("#linkRemoveOption")[0].style.display = (inLink ? "block" : "none");
    var jLinkDialog = $("#linkDialog");
    // Hang on to the existing user text selection.
    // The dialog is a convenient place to attach it:
    jLinkDialog[0].savedSelection = saveSelection();
    jLinkDialog.show();

    // Select the link text in the dialog:
    $("#linkRef").select();
}
// User has closed the link dialog:
function CompleteCreateLink() {
    var jLinkDialog = $("#linkDialog");
    jLinkDialog.hide();
    // Select again the text that was selected before the dialog:
    restoreSelection(jLinkDialog[0].savedSelection);
    var href = $("#linkRef")[0].value;
    var selection = window.getSelection();
    if (href.length > 5 && !selection.isCollapsed && isInNode(selection.anchorNode, "popuptext")) {
        document.execCommand("CreateLink", false, href);
        // Links will all open in a new window:
        $("#popuptext a").attr("target", "_blank");
        // Tooltip is the URL:
        $("#popuptext a").each(function (i, e) { e.title = e.href; });
        // Clean up the dialog, as we will reuse it:
        $("#linkRef")[0].value = "";
        window.dirty = true;
    }
}
// User clicked Remove in the link dialog
function CompleteRemoveLink() {
    var jLinkDialog = $("#linkDialog");
    jLinkDialog.hide();
    restoreSelection(jLinkDialog[0].savedSelection);
    if (isInNode(window.getSelection().anchorNode, "popuptext")) {
        document.execCommand("Unlink");
    }
}

// Keep the user's text selection while we display a dialog
function saveSelection() {
    if (window.getSelection) {
        sel = window.getSelection();
        if (sel.getRangeAt && sel.rangeCount) {
            return sel.getRangeAt(0);
        }
    } else if (document.selection && document.selection.createRange) {
        return document.selection.createRange();
    }
    return null;
}

// Restore the user's text selection
function restoreSelection(range) {
    if (range) {
        if (window.getSelection) {
            sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(range);
        } else if (document.selection && range.select) {
            range.select();
        }
    }
}

// Selected text is within an existing link
function nodeIsInLink(n) {
    if (!n) return null;
    if (n.nodeName == "A") return n;
    return nodeIsInLink(n.parentNode);
}

