// GroupNode: the tree of place groups shown in the index sidebar.
// A group is a /-separated path of nested group names; a place's Group field can
// hold several paths separated by "¬". Long lists of subgroups get generated
// alphabetic groupings (A-E, F-L, ...).
// 2021-01-19 disabled headPlace ident -there are no headPlaces

class GroupNode {
    /**
     *
     * @param {string} pathString - Long id like xxx/yyy/zzz
     */
    constructor(pathString) {
        this.pathString = pathString || ""; // long path like xxx/yyy/zzz
        this.keys = []; // Sorted short path elements like yyy
        this.subs = {}; // keys and autoSubsKeys -> GroupNode
        this.leaves = []; // Place
        this.autoSubsKeys = []; // Long lists of keys have a split like A-E, F-L, ...
    }

    subNodeOfPath(pathArray) {
        if (pathArray.length == 0) return this;
        else {
            let subnode = this.subs[pathArray[0]];
            if (!subnode) return null;
            return subnode.subNodeOfPath(pathArray.slice(1));
        }
    }

    get shortName() {
        if (!this._shortName) {
            let split = this.pathString.split("/");
            this._shortName = split[split.length - 1].replace("¬", "");
        }
        return this._shortName;
    }

    /** Set keys to be a sorted list of the keys of subs, and sort leaves. */
    sortKeys(leafsort) {
        this.leaves.sort(leafsort);
        this.keys = Array.from(Object.keys(this.subs));
        this.keys.sort();
        // Any leaf place with the same name as a subgroup is the subgroup's head
        //
        /* 2021-01-19 disable headPlaces
        this.leaves.forEach(leaf => {
            let sub = this.subs[leaf.Title];
            if (sub) { sub.headPlace = leaf; }
        });
        */

        this.keys.forEach(k => {
            this.subs[k].sortKeys(leafsort);
        });
        this.genAutoSubs();

    }

    /**
        Divide up into alpha groups if very long
     */
    genAutoSubs() {
        this.autoSubsKeys = [];
        if (this.keys.length > 20) {
            let groups = [];
            // More or less even distribution
            let groupSize = Math.ceil(this.keys.length / Math.ceil(this.keys.length / 10));
            let stop = "¬";
            let currentGroup;
            for (let ki = 0; ki < this.keys.length; ki++) {
                let initial = (this.keys[ki] || " ").substr(0, 1);
                if (stop && stop != initial) {
                    stop = "";
                    currentGroup = { a: initial, items: [] };
                    groups.push(currentGroup);
                }
                currentGroup.items.push(this.keys[ki]);
                if (currentGroup.items.length >= groupSize) {
                    stop = initial;
                    currentGroup.b = initial;
                }
            }
            let newGroups = groups.map(g => {
                let newGroup = new GroupNode();
                newGroup.alphaGroup = g.a + (g.b && g.a != g.b ? "-" + g.b : "");
                newGroup.pathString = "¬" + newGroup.alphaGroup;
                newGroup.keys = g.items;
                g.items.forEach(k => { newGroup.subs[k] = this.subs[k]; });
                return newGroup;
            });
            newGroups.forEach(g => {
                this.autoSubsKeys.push(g.alphaGroup);
                this.subs[g.alphaGroup] = g;
            });
            this.autoSubsKeys.sort();
        }
    }

    /**
     * Place group has been clicked, in index or on map.
     * Should sync with open/closed state:
     * - Index expand/collapse at this level
     * - if there is a head place on this node:
     * - - Expand/collapse state of head place pin
     * - - Visibility on map of places in this group, and unheaded subgroups
     * On close, close subnodes with head places; close lightbox
     * On open, if there's a head place, show it in lightbox
     * @param {boolean} toggle - if true, flip state; if false, set to setOpen
     * @param {boolean} setOpen - no effect if already in this state
     */
    /*
    expandOrCollapse(toggle = true, setOpen) {
        if (toggle) {
            this.isOpen = !this.isOpen;
        } else {
            if (this.isOpen == setOpen) return;
            else this.isOpen = setOpen;
        }
        if (!this.isOpen) {
            // close subplaces recursively
            this.keys.forEach(k => {
                this.expandOrCollapse(false, false);
            });
        }
        this.expandOrCollapseIndexGroup();
        if (this.headPlace) {
            this.expandOrCollapseHeadPlace();
            this.setLeavesAndSubLeavesVisibility();
        }
    }

    expandOrCollapseIndexGroup() {

    }
*/
    /** Set head place  */
    expandOrCollapseHeadPlace() {

    }

    /** If this node has a head place, show or hide those other than the head
     * @param {boolean} show - show or hide
     * @returns Whether this node has a head place
     */
    showSubPlaces(show = false, repaint = true, doAnyway = false) {
        if (!doAnyway && !this.headPlace) return false;
        this.isShowingSubs = show;
        if (this.headPlace) window.map.updatePinForPlace(this.headPlace);

        this.leaves.forEach(leaf => {
            if (leaf != this.headPlace || doAnyway) window.map.setPlaceVisibility(leaf, show);
        });
        this.keys.forEach(key => this.subs[key].showSubPlaces(show, false, true));
        if (repaint) {
            if (!show) window.lightboxU.hide();
            if (show && this.leaves.length > 2) {
                window.map.setBoundsRoundPlaces(this.leaves);
            } else {
                window.map.repaint();
            }
        }
        return this.leaves;
    }

    showSubPlacesOf(place) {
        if (this.headPlace == place) {
            let show = !this.isShowingSubs;
            let placesDone = this.showSubPlaces(show);
            return show || !placesDone || placesDone.length < 2;
        }
        return true;
    }

    /** Work down the tree and hide nodes that have a head place */
    hideSubplaces(level = 0) {
        if (!this.showSubPlaces(false, false)) {
            this.keys.forEach(key => this.subs[key].hideSubplaces(1));
        }
        if (level == 0) {
            window.map.updatePinForPlace(this.headPlace);
            window.map.repaint();
            window.lightboxU.hide();
        }
    }

}

/** Remove any alphabetic groupings used in long subgroups: A-D E-H etc. Just hope there isn't a street called A-Z. */
function removeAlphaGrouping(path) {
    return path.replace(/\/[^\/](-[^\/])?\//, "/").replace(/\/[^\/](-[^\/])?$/, "");
}
