// Common code for history map index.htm and edit.htm

var azureWS = "https://moylgrove-history.azurewebsites.net/";
var imgUrl = azureWS + "images/";
var apiUrl = azureWS + "api/";
var sourceUrl = azureWS + "h/";
var avUrl = azureWS + "av/";      // Audio



// Placeholder replaced in some scripts
if (!onKeysArrived) {function onKeysArrived(){}}

// On initialization, get API keys
$(function() {
    $.ajax({
        url: apiUrl + 'Keys?code=5gJHMkN6fOy5OaQkRslNe884xX2Hlb4kMGavabHETYxT5nNsbvQm6A==',
        type: 'GET',
        contentType: 'application/json',
        success: function (data, e, r) {
            window.keys = data;
            if (mapModuleLoaded) {doLoadMap();}
            onKeysArrived();
        }
    });
});


function p(x) {
    if (x) return x._;
    else return null;
}


// Regions where density of places is high, so that going there should zoom in closer.
// Currently this is just the centre of Moylgrove. Need to make this a more dynamic thing in go().
function zoomed(lat, long) {
    var f1lat = 52.068478, f1long = -4.747869, f2lat = 52.065769, f2long = -4.753887, diameter = 0.008579508;
    return Math.sqrt(Math.pow(lat - f1lat, 2) + Math.pow(long - f1long, 2))
        + Math.sqrt(Math.pow(lat - f2lat, 2) + Math.pow(long - f2long, 2))
        < diameter;
}

function doLoadMap () {
       var head= document.getElementsByTagName('head')[0];
       var script= document.createElement('script');
       script.async = true;
       script.defer = true;
       script.type= 'text/javascript';
       script.src='https://www.bing.com/api/maps/mapcontrol?key='+window.keys.Client_Map_K+'&callback=mapModuleLoaded';
       head.appendChild(script);
}