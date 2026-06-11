// Comments attached to a place: display, inline editing, and upload.

function showComments(place, parent) {
    parent.innerHTML = "";
    getComments(place, (comments) => {
        let currentUser = window.user; //usernameIfKnown();
        let t = document.createElement("table");
        t.className = "commentTable";
        let tbody = document.createElement("tbody");
        let mostRecentCommenter = null;
        if (comments) {
            for (let i = 0; i < comments.length; i++) {
                // Don't include empty (= deleted) comments:
                if (comments[i].Text) {
                    tbody.appendChild(commentRow(comments[i], currentUser, place, i));
                    mostRecentCommenter = comments[i].User;
                }
            }
        }
        // Space to append a comment if you're signed in
        //  - but if it's your own place, you only get to comment after someone else.
        //  - and you don't need it if you're the last person to comment, because you can just edit your last remark:
        if (currentUser && mostRecentCommenter != currentUser.name && (comments && comments.length > 0 || currentUser.name != place.user)) {
            tbody.appendChild(commentRow({ User: currentUser.name, Text: "", Item: place.rowKey, PartitionKey: place.PartitionKey, RowKey: "" },
                currentUser, place, comments ? comments.length : 0));
        }
        if (tbody.childNodes.length > 0) {
            parent.innerHTML = "<h3>Comments</h3>";
            t.appendChild(tbody);
            parent.appendChild(t);
        }
    });
}

function commentRow(comment, currentUser, place, i) {
    let tr = document.createElement("tr");
    let td1 = document.createElement("td");
    tr.appendChild(td1);
    let td2 = document.createElement("td");
    tr.appendChild(td2);
    td1.innerHTML = comment.User.replace(" ", "&nbsp;") + ":";
    // You can edit your own comments, or you can edit if you're an admin:
    if (currentUser && (currentUser.isEditor || currentUser.isAdmin || currentUser.name == comment.User)) {
        let div = document.createElement("div");
        div.innerHTML = comment.Text;
        td2.appendChild(div);
        div.setAttribute("contentEditable", "true");
        div.comment = comment;
        div.place = place;
        div.addEventListener("click", e => { stopPropagation(e); });
        div.addEventListener("keydown", e => { event.cancelBubble = true; });
        div.addEventListener("blur", (e) => {
            setComment(e.target.place, e.target.comment, stripComment(e.target.innerHTML));
        });
    } else {
        td2.innerHTML = comment.Text;
    }
    return tr;
}

function stripComment(text) {
    var t = text;
    const xx = ["i", "b", "u"];
    xx.forEach(x => {
        let re1 = new RegExp("<" + x + ">", "sg");
        let re2 = new RegExp("<\/" + x + ">", "sg");
        t = t.replace(re1, "###" + x + "===").replace(re2, "###!" + x + "===");
    });
    t = t.replace(/<[^]*?>/g, " ");
    t = t.replace(/###!.===/g, z => "<\/" + z.substr(4, 1) + ">").replace(/###.===/g, z => "<" + z.substr(3, 1) + ">");
    return t.trim();
}

function setComment(place, comment, text) {
    if (comment.Text != text) {
        if (!comment.rowKey) {
            comment.rowKey = "" + Date.now();
            place.commentCache.push(comment);
        }
        comment.Text = text;
        uploadComment(comment);
        if (text.length == 0) {
            for (var i = 0; i < place.commentCache.length; i++) {
                if (place.commentCache[i] === comment) {
                    place.commentCache.splice(i, 1);
                    break;
                }
            }
        }
    }
}
