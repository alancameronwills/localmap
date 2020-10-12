/*

Manage supergroups

Assign groups or supergroups by map
1. Displays a square on the map.
2. You pull the corners and drag map to define a quadrilateral.
3. Shows a list of groups occupied by places in this quad.
4. You confirm with checkboxes which ones you want to update with a new group or supergroup.
5. You opt whether to replace existing supergroup assignments, or enclose all in bigger group.
6. You provide a name for this supergroup and confirm.
7. Places *in selected area* in selected groups are updated by replacing or prefixing group name. 

Rename group or supergroup
1. Get a heirarchical list of supergroup and group names
2. You update any item on the tree, whether branch or leaf, and confirm.

Index and group selector show groups in a heirarchy: select the supergroup then the group

*/

class GeoBroomU extends U {
    constructor() {
        super ({ id: "geobroom", c: "geobroom", s: [
                {
                    t: "svg", viewBox:"0,0,100,100", style:"width:100%;height:100%", s: [
                        {t:"defs",s:[{t:"marker", id:"dot", viewBox:"0 0 10 10", refX:"5", refY:"5", markerWidth:"5", markerHeight:"5",
                            s:[{t:"circle", cx:"5", cy:"5", r:"5", fill:"blue"}]}]},
                        {t:"polygon",points:"30,30 30,70 70,70 70,30",stroke:"blue","stroke-width":"4",
                            "marker-start":"url(#dot)","marker-mid":"url(#dot)","marker-end":"url(#dot)"}
                    ]
                }
            ]
        }, g("curtain"));

    }
}

function createBroom () {
    let html = "<div id='geobroom' class='geobroom'>" + 
            "<svg viewBox='0,0,100,100' style='width:100%;height:100%;'>" + 
                "<defs><marker id='dot' viewBox='0 0 10 10' refX='5' refY='5' markerWidth='5' markerHeight='5'>" +
                    "<circle cx='5' cy='5' r='5' fill='blue'/></marker></defs>" +
                "<polygon points='30,30 30,70, 70,70 70,30' stroke='blue' stroke-width='4' " +
                "marker-start='url(#dot)' marker-mid='url(#dot)' marker-end='url(#dot)'/>" +
        "</svg></div>";
    html("curtain", html);
}

function showGeoBroom () {
    window.geoBroom = new GeoBroomU();

}