
//------------------------
// Help 
//------------------------
var helping = false;
function dohelp() {
    helping = true;
    if (usernameIfKnown()) {
        showBaseHelp();
    } else {
        show("splash");
    }
}

function showBaseHelp() {
    appInsights.trackEvent({ name: "showBaseHelp" });
    var svg = g("svgBaseHelp");
    show("basehelp");
    if (window.trackingDisable) { html("helpRefTracking", ""); }
    helpLines();
}
function closeBaseHelp() {
    hide('basehelp');
    var svg = g("svgBaseHelp");
    var f;
    while (f = svg.firstChild) {
        svg.removeChild(f);
    }
}

function editorHelpLines() {
    const svg = g("editorHelpSvg");
    const eh1 = g("eh1"), eh2 = g("eh2"), eh3 = g("eh3");
    const textBox = g("popuptext");
    const popup = g("popup");
    const box = g("editorHelp");
    const boxTop = box.getBoundingClientRect().top;
    const boxLeft = box.getBoundingClientRect().left;
    const eh1y = ehLevel(eh1);
    const eh2y = ehLevel(eh2);
    const eh3y = ehLevel(eh3);
    drawLine(svg, boxLeft + 3, eh1y, boxLeft - 10, eh1y);
    drawLine(svg, boxLeft + 3, eh2y, boxLeft - 30, eh2y);
    drawLine(svg, boxLeft + 3, eh3y, boxLeft - 10, eh3y);

    const tagRow = g("tags").getBoundingClientRect().top + 10;
    const addButton = g("addPicToPlaceButton");
    const addButtonRect = addButton.getBoundingClientRect();
    const addButtonMid = addButtonRect.left + addButton.offsetWidth / 2;
    const addButtonTop = addButtonRect.top;

    drawLine(svg, boxLeft - 10, eh1y, boxLeft - 10, textBox.getBoundingClientRect().top + 15);
    drawLine(svg, boxLeft - 30, eh2y, boxLeft - 30, tagRow);
    drawLine(svg, boxLeft - 10, eh3y, boxLeft - 10, addButtonTop - 10);

    drawLine(svg, boxLeft - 10, addButtonTop - 10, addButtonMid, addButtonTop - 10);
    drawLine(svg, addButtonMid, addButtonTop - 10, addButtonMid, addButtonTop);

}

function ehLevel(eh) {
    return eh.getBoundingClientRect().top + eh.offsetHeight / 2;
}

function helpLines() {
    const box = g("basehelp");
    const svg = g("svgBaseHelp");
    const boxTop = box.offsetTop + 6;
    const boxLeft = box.offsetLeft + 4;

    $("#basehelp [data-help]").each(function(){
        const tool = g(this.getAttribute("data-help"));
        if (!tool) return;
        const toolX = tool.offsetLeft + tool.offsetWidth / 2;
        const toolY = tool.offsetTop + tool.offsetHeight;
        const helpX = this.offsetLeft + boxLeft;
        const helpY = this.offsetTop + boxTop;
        drawLine(svg, toolX, toolY, helpX, helpY);
    });

}

function drawLine(svg, x1, y1, x2, y2) {
    var newLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    newLine.setAttribute('x1', x1);
    newLine.setAttribute('y1', y1);
    newLine.setAttribute('x2', x2);
    newLine.setAttribute('y2', y2);
    newLine.style.stroke = "rgba(0,255,255,0.5)";
    newLine.style.strokeWidth = "6";
    svg.append(newLine);
}
