# REST API 


In the web app, all the calls are in azuredb.js. The returned data are pulled apart in model.js

All URLs below are prefixed by https://deep-map.azurewebsites.net


### Get an image or other uploaded file

	/media/${imageId}

Where ${imageId} is extracted from a place - see below.

### Get a list of all the places in a project:

	/api/places?project=${project}

where project is one of `["Folio","Garn%20Fawr","Trefdraeth"]`
(case significant). E.g.:

https://deep-map.azurewebsites.net/api/places?project=Trefdraeth

(which you can try in a web browser).

### Get a list of places modified since a given date:

	/api/places?project=${project}&after=${timestamp}

where ${timestamp} is a value obtained from a previous download in place.LastModified

## Places returned

The places arrive as JSON. The fields are all strings except where noted:

	Deleted: Ignore this record if true
	PartitionKey: The project name - Folio etc
	RowKey: Unique id of the place
	LastModified (long int): timestamp in ms
	Tags: Space-separated words chosen from a small project-defined set
	Group: Name of a street or other grouping
	Level: Not used
	Latitude (float): e.g. 52.00....
	Longitude(float): e.g. -4.8...
	Text (html): The title and text. Title is everything up to the first <br/> | <p> | <div. I know, why isn't there a separate title field. Seemed like a good idea at the time, and now stuck like that.
	User: Display name of user who created the place. May have been modified since by an editor
	Media: [{
		id: Unique id of picture, sound clip, or file. Ends with original file extension such as ".jpg". Get it using "/media/${id}"
		caption: Plain text. Anything following '//' can be presented in smaller type.
		date: Date of photo, usually from EXIF
		type: MIME type such as "image/jpeg"
		sound: null or sound file that should be played with this picture
		youtube: null or a //youtu.be link 
		orientation: 1 =show as it comes; 6: rotate 90; 3: 180: 8: 270
		
	}]

Media actually comes as an embedded string. You typically have to parse it using `JSON.parse(place.Media)`. This is because the 'database' is a table and this occupies one cell.
	

## Static images

Icons that we use in the web app can be accessed using

    https://deepmap.blob.core.windows.net/deepmap/img/*

for example

https://deepmap.blob.core.windows.net/deepmap/img/marker.png

They can be found here in the codebase.

## Embedding API

The map can be embedded in another web page via an `<iframe>` pointing at the app, e.g.:

	<iframe src="https://mapdigi.org/?project=Trefdraeth"></iframe>

Scripts in the host page can then drive the embedded map with `window.postMessage`. The app listens for messages (`setParentListener` in `scripts/deep-map.js`) and acts on those whose `data` has an `op` field.

**Security:** commands are only honoured from a *same-origin* parent — the handler requires `event.origin === location.origin && event.source === window.parent`. So the host page embedding the iframe must be served from the same origin as the map. (`window.Cypress` is allowed too, but it exists only under the test runner, never in production.)

### Go to a place

	iframe.contentWindow.postMessage({
		op: "gotoPlace",
		placeKey: "Trefdraeth|320501040707199024165",  // "project|rowKey"
		show: true                                      // true = open the place's detail; false = just pan there
	}, location.origin);

Stops location tracking and navigates the map to that place. If the message arrives before the map has finished loading it is stashed and replayed once ready, so it is safe to send early; it also clears the loading splash.

### Show a tour (a set of places)

	iframe.contentWindow.postMessage({
		op: "tour",
		places: ["Trefdraeth|3205010407...", "Trefdraeth|abc123..."]
	}, location.origin);

Waits for the splash to drop, then shows just that set of places, turns off marker clustering, and caps auto-zoom at 17.

### Notes

- `placeKey` and the entries in `places` are place ids of the form `project|rowKey` (PartitionKey|RowKey — see "Places returned" above). The handler URI-decodes the values (and `gotoPlace` also converts `+` to spaces), so encoding them on the way in is fine.
- A separate, URL-based entry point also exists: opening the app with `?place=...` (and optionally `?view=...` for a map position) navigates without postMessage. That is what the "open in a new window" button uses to break out of the frame.