/** Display a UI for selecting a group. Every Place belongs to one or more group. Groups form a tree.
 * A group is internally represented as a /-separated path of nested group names. 
 * In the Place.Group, multiple groups are separated by "¬". 
 * In the place editor, a group is displayed as a list of HTML selector elements.
 * In the index, very long lists of subgroups are displayed with alphabetic intermediate groupings A-G, H-M etc 
 */
class GroupSelector {
    /** 
     * @param {Element} hostElement div in which to display the selectors. This object lives until hostElement is disposed.
     * @param {fn(groupPath)} onUpdate Call when user changes the group
     * @param {string} initialGroupPath Group to display, as a /-separated string of group names
     */
    constructor(hostElement, onUpdate, initialGroupPath) {
        this.host = gx(hostElement);
        this.onUpdate = onUpdate;
        if (initialGroupPath) this.setGroup(initialGroupPath);
    }

    /** Group the user has selected, as a /-separated string of group names */
    get Path() {
        return (this.groupPath ? this.groupPath : "");
    }

    /** Set the current selection */
    setGroup(groupPath) {
        this.groupPath = groupPath;
        //html(this.host, this.selectorListHtml(groupPath));
        this.setSelectorGroup(groupPath);
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
            if (selector.value.startsWith("¬")) {

            } else if (selector.value == "(new)") {
                creatingnewPath = true;
                return false;
            } else {
                return true;
            }
        });
        if (creatingnewPath) {
            showInputDialog(null, null, "Create a new group name", "", (pic, pin, userInput) => {
                let newPath = userInput.replace(/[^- a-zA-Z0-9,¬']+/g, " ").replace(/\n.*$/s, "").trim();
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
        let oldGroupPaths = this.groupPath.split("¬");
        let selectorRows = this.host.children;
        let newPathSet = oldGroupPaths.map((oldGroupPath, oldGroupIndex) => {
            let oldPathSplit = oldGroupPath.split("/");
            // Reconstruct the path, working along the selectors until the changed one:
            let newPath = "";
            let selectors = selectorRows[oldGroupIndex].getElementsByTagName("select");
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
            return newPath;
        });

        // Remove duplicate paths and paths that are ancestors of others:
        newPathSet.sort();
        let newPathString = newPathSet.join("¬").replace(/^¬+/, ""); //replace(/¬¬+/, "¬").replace(/¬$/, "");
        // Redo the display from scratch:
        this.setGroup(newPathString);
        // Notify whoever's interested (should probably be a proper event):
        if (this.onUpdate) this.onUpdate(removeAlphaGrouping(newPathString));
    }

    eliminateDuplicates () {
        let oldGroupPaths = this.groupPath.split("¬");
        let reducedPathSet = [];
        for (let i = 0; i<oldGroupPaths.length; i++) {
            if (i == oldGroupPaths.length-1) reducedPathSet.push(oldGroupPaths[i]);
            else if (oldGroupPaths[i+1].indexOf(oldGroupPaths[i])!=0) {
                reducedPathSet.push(oldGroupPaths[i]);
            }
        }
        let newPathString = reducedPathSet.join("¬").replace(/^¬+/, "");
        this.setGroup(newPathString);
        if (this.onUpdate) this.onUpdate(removeAlphaGrouping(newPathString)); 
    }

    /** Private. Determine the group menus. 
     * Uses the current index groupTree - filtered by search, tag, new...
     */
    setSelectorGroup(currentPathSet) {
        let allowGroupCreate = window.user.isEditor;
        html(this.host, "");
        currentPathSet.split("¬").forEach((currentPath) => {
            let parent = c(null, "DIV", this.host);
            let pathSplit = currentPath.split("/");
            let tree = index.groupTree(null, false); // exclude generated alpha groupings
            let clevel = tree;
            let groupSelectors = "";
            for (let i = 0; i < pathSplit.length || clevel && currentPath; i++) {
                if (i < pathSplit.length || clevel.keys.length > 0 || allowGroupCreate) {
                    let selector = c(null, "SELECT", parent);
                    selector.setAttribute("title", i < pathSplit.length ? "Select group" : "Put into a subgroup");
                    {
                        // First option in the menu
                        let option = new Option("-", "", false, i >= pathSplit.length);
                        selector[selector.options.length] = option;
                    }
                    let keys = clevel.keys;
                    let selectionFound = false;
                /*if (clevel.autoSubsKeys && clevel.autoSubsKeys.length > 0) {
                    clevel.autoSubsKeys.forEach(ask => {
                        let option = c(null, "OPTION", selector);
                        option.setAttribute("value", ask);
                        html(option, ask);
                    });
                } else*/ {
                        keys.forEach(k => {
                            let selected = i < pathSplit.length && k == pathSplit[i];
                            selectionFound |= selected;
                            if (k.length > 0) {
                                let option = new Option(k, k, false, selected);
                                selector[selector.options.length] = option;
                            }
                        });
                    }
                    if (!selectionFound && i < pathSplit.length && pathSplit[i]) {
                        // New option only known in this instance
                        let option = new Option(pathSplit[i], pathSplit[i], false, true);
                        selector[selector.options.length] = option;
                    }
                    if (allowGroupCreate || i + 1 == pathSplit.length) {
                        let option = new Option('(create new)', '(new)', false, false);
                        selector[selector.options.length] = option;
                    }
                }
                clevel = i < pathSplit.length ? clevel.subs[pathSplit[i]] : null;
            }
        });
        //if (allowGroupCreate) {
            // Add extra group control:
            let addGroupUi = c(null, "DIV", this.host);
            addGroupUi.style = "position:absolute;top:0;right:4px;";
            addGroupUi.title = "Add to multiple groups";
            html(addGroupUi, "+");
            addGroupUi.addEventListener("click", e => { this.setGroup(this.Path + "¬"); });
        //}
    }

}




