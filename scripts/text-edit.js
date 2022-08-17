//
// Text editor
//

// User clicked one of the insert special character buttons
function onInsertText(text) {
    var sel, range;
    if (window.getSelection) {
        sel = window.getSelection();
        if (sel.getRangeAt && sel.rangeCount) {
            range = sel.getRangeAt(0);
            range.deleteContents();
            let textNode = document.createTextNode(text);
            range.insertNode(textNode);
            
            // Reset selection:
            const caret = 0; 
            const newrange = document.createRange();
            newrange.setStartAfter(textNode, caret);
            newrange.setEndAfter(textNode, caret);
            sel.removeAllRanges();
            sel.addRange(newrange);
        }
    } else if (document.selection && document.selection.createRange) {
        document.selection.createRange().text = text;
    }
}
/*
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
*/


// ==================
// Create link
// ------------------

// User clicked the button to link the text selection 
function onCreateLink() {
    var selection = window.getSelection();
    var inLink = nodeIsInLink(selection.anchorNode);
    if (!isInNode(selection.anchorNode, "popuptext") || selection.isCollapsed && !inLink) {
        window.alert("To create a link to another page, first select a phrase in the text.");
        return;
    }

    // Are we editing an existing link?
    if (inLink) {
        // Expand the selection to the whole link:
        window.getSelection().removeAllRanges();
        var range = document.createRange();
        range.selectNode(inLink);
        window.getSelection().addRange(range);
        g("linkRef").value = inLink.href;
    } else {
        /*
        // New link. Check if it's the name of another place.
        var phrase = window.getSelection().toString();
        var place = placeFromTitle(phrase);
        if (place) {
            $("#linkRef")[0].value = "./?place=" + place;
        }
        */
    }

    g("linkRemoveOption").style.display = (inLink ? "block" : "none");
    var jLinkDialog = g("linkDialog");
    // Hang on to the existing user text selection.
    // The dialog is a convenient place to attach it:
    jLinkDialog.savedSelection = saveSelection();
    jLinkDialog.style.display = "block";

    // Select the link text in the dialog:
    $("#linkRef").select();
}

// User has closed the link dialog:
function CompleteCreateLink() {
    var jLinkDialog = g("linkDialog");
    jLinkDialog.style.display = "none";
    // Select again the text that was selected before the dialog:
    restoreSelection(jLinkDialog.savedSelection);
    var selection = window.getSelection();
    var href = g("linkRef").value.replace(/(http:\/\/localhost|https:\/\/deepmap).*?\?place=/, "./?place=");
    if (href.length > 5 && !selection.isCollapsed && isInNode(selection.anchorNode, "popuptext")) {
        document.execCommand("CreateLink", false, href);
        // Tooltip is the URL:
        $("#popuptext a").each(function (i, e) {
            if (e.href.indexOf(e.baseURI + "?place=") < 0) {
                e.target = "_blank";
                e.title = e.href;
            } else {
                e.title = getTitleFromId(e.href.split("=")[1]);
            }
        });
        // Clean up the dialog, as we will reuse it:
        g("linkRef").value = "";
    }
}


// User clicked Remove in the link dialog
function CompleteRemoveLink() {
    var jLinkDialog = g("linkDialog");
    jLinkDialog.style.display = "none";
    restoreSelection(jLinkDialog.savedSelection);
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

