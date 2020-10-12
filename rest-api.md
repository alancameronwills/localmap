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
		caption: Plain text.
		date: Date of photo, usually from EXIF
		type: MIME type such as "image/jpeg"
		sound: null or sound file that should be played with this picture
		youtube: null or a //youtu.be link 
		orientation: 1 =show as it comes; 6: rotate 90; 3: 180: 8: 270
		
	}]

Media actually comes as an embedded string. You typically have to parse it using `JSON.parse(place.Media)`. This is weird, and should be fixed.
	

## Static images

Icons that we use in the web app can be accessed using

    https://deepmap.blob.core.windows.net/deepmap/img/*

for example

https://deepmap.blob.core.windows.net/deepmap/img/marker.png

They can be found here in the codebase.