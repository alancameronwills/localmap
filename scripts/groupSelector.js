/** Display a UI for selecting a group. Every Place belongs to a group. Groups form a tree.
 * A group is internally represented as a /-separated path of nested group names, 
 * and is displayed as a list of HTML selector elements. */
class GroupSelector {
    /** 
     * @param {Element} hostElement div in which to display the selectors. This object lives until hostElement is disposed.
     * @param {fn(groupPath)} onUpdate Call when user changes the group
     * @param {string} initialGroupPath Group to display, as a /-separated string of group names
     */
    constructor(hostElement, onUpdate, initialGroupPath) {
        this.host = typeof hostElement == "string" ? g(hostElement) : hostElement;
        this.onUpdate = onUpdate;
        if (initialGroupPath) this.setGroup(initialGroupPath);
    }

    /** Group the user has selected, as a /-separated string of group names */
    get Path () {
        return this.groupPath ? this.groupPath : "";
    }

    /** Set the current selection */
    setGroup(groupPath) {
        this.groupPath = groupPath;
        html(this.host, this.selectorListHtml(groupPath));
        // There's always at least one selector.
        this.selectorsForEach(selector => {
            selector.addEventListener("change", evt => {
                this.userSelectedGroup();
            });
            return true;
        });
    }

    /** Private. The group path is displayed as a list of HTML selectors. Until fn returns false, do fn for each selector. */
    selectorsForEach(fn) {
        let selectors = this.host.getElementsByTagName("select");
        for (let i = 0; i < selectors.length; i++) {
            if (!fn(selectors[i])) break;
        }
    }

    /** Private. User has changed the selection */
    userSelectedGroup() {
        // First determine whether (new) was selected
        let creatingnewPath = false;
        this.selectorsForEach(selector => {
            if (selector.value == "(new)") {
                creatingnewPath = true;
                return false;
            } else {
                return true;
            }
        });
        if (creatingnewPath) {
            showInputDialog(null, null, "Create a new group name", "", (pic, pin, userInput) => {
                let newPath = userInput.replace(/[^- a-zA-Z0-9,']+/g, " ").replace(/\n.*$/s, "").trim();
                this.resetSelectors(newPath);
            });
        } else {
            this.resetSelectors();
        }
    }

    /** Private.
    * User has updated group and possibly provided a new group name.
    * We need to update the selectors after the changed one to reflect the new subtree.
    * @param {*} groupToCreate - New group name, if user selected (new)
    */
    resetSelectors(groupToCreate) {
        let oldPathSplit = this.groupPath.split("/");
        // Reconstruct the path, working along the selectors until the changed one:
        let newPath = "";
        let selectors = this.host.getElementsByTagName("select");
        for (let i = 0; i < selectors.length; i++) {
            if (selectors[i].value == "(new)") {
                if (groupToCreate) {
                    newPath += (i > 0 ? "/" : "") + groupToCreate;
                } else {
                    // User selected (new) but didn't provide a group name.
                    // Revert to previous:
                    newPath = this.groupPath;
                }
                break;
            } else {
                newPath += (i > 0 && selectors[i].value ? "/" : "") + selectors[i].value;
                if (oldPathSplit[i] != selectors[i].value) {
                    break;
                }
            }
        }
        // Redo the display from scratch:
        this.setGroup(newPath);
        // Notify whoever's interested (should probably be a proper event):
        if (this.onUpdate) this.onUpdate(newPath);
    }

    /** Private. Determine the group menus. 
     * Uses the current index groupTree - filtered by search, tag, new...
     */
    selectorListHtml(currentPath) {
        let allowGroupCreate = window.user.isEditor;
        let pathSplit = currentPath.split("/");
        let tree = index.groupTree();
        let clevel = tree;
        let groupSelectors = "";
        for (let i = 0; i < pathSplit.length || clevel && currentPath; i++) {
            // Show selectors for each node in the existing path, 
            // plus an additional selector if there are possible additional nodes
            // or there is the option of creating a new node
            if (i < pathSplit.length || clevel.keys.length > 0 || allowGroupCreate) {
                let selector = `<select title='${i < pathSplit.length ? "Select group" : "Put into a subgroup"}'>`;
                if (i >= pathSplit.length) {
                    selector += "<option value='' selected>-</option>";
                } else {
                    selector += "<option value='' >-</option>";
                }
                let keys = clevel.keys;
                let selectionFound = false;
                for (let k = 0; k < keys.length; k++) {
                    let selected = i < pathSplit.length && keys[k] == pathSplit[i];
                    selectionFound |= selected;
                    if (keys[k].length > 0) {
                        selector += `<option value="${keys[k]}" ${selected ? "selected" : ""}>${keys[k]}</option>`;
                    }
                }
                if (!selectionFound && i < pathSplit.length && pathSplit[i]) {
                    // Newly created group, only known in this selector
                    selector += `<option value="${pathSplit[i]}" selected >${pathSplit[i]}</option>`;
                }
                if (allowGroupCreate || i + 1 == pathSplit.length) {
                    selector += "<option value='(new)'>(create new)</option>";
                }
                selector += "</select>";
                groupSelectors += selector;
            }
            clevel = i < pathSplit.length ? clevel.subs[pathSplit[i]] : null;
        }
        return groupSelectors;
    }
}




