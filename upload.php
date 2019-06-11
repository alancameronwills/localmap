<?php

define ('SITE_ROOT', realpath(dirname(__FILE__)));
$media_dir = SITE_ROOT . "\\media\\";
$place_dir = SITE_ROOT . "\\places\\";

/*
print_r ($_FILES);
echo "\n";
print_r($_POST);
*/

if (array_key_exists("picImg", $_FILES)) {
    mediaUpload($media_dir);
}
if (array_key_exists("place", $_POST)) {
    placeUpload($place_dir);
}


function mediaUpload($media_dir)
{
    $source_file = basename($_FILES["picImg"]["name"]);

    $imageFileType = strtolower(pathinfo($source_file,PATHINFO_EXTENSION));

    if (array_key_exists("id", $_POST))
    {
        $target_file = $media_dir . $_POST["id"] . "." . $imageFileType;    
    }
    else 
    {
        $target_file = $$media_dir . $source_file;
    }

    $uploadOk = 1;
    // Check if image file is a actual image or fake image
    if(isset($_POST["submit"])) {
        $check = getimagesize($_FILES["picImg"]["tmp_name"]);
        if($check !== false) {
            echo "File is an image - " . $check["mime"] . ".";
            $uploadOk = 1;
        } else {
            echo "File is not an image.";
            $uploadOk = 0;
        }
    }
/*
// Check if file already exists
if (file_exists($target_file)) {
    echo "Sorry, file already exists.";
    $uploadOk = 0;
}
// Check file size
if ($_FILES["fileToUpload"]["size"] > 5000000) {
    echo "Sorry, your file is too large.";
    $uploadOk = 0;
}
*/
    // Allow certain file formats
    if($imageFileType != "jpg" && $imageFileType != "png" && $imageFileType != "jpeg"
    && $imageFileType != "gif" ) {
        echo "Sorry, only JPG, JPEG, PNG & GIF files are allowed.";
        $uploadOk = 0;
    }
    // Check if $uploadOk is set to 0 by an error
    if ($uploadOk == 0) {
        echo "Upload failed.";
    // if everything is ok, try to upload file
    } else {
        if (move_uploaded_file($_FILES["picImg"]["tmp_name"], $target_file)) {
            echo  $_FILES["picImg"]["name"] . " => " . $target_file ;
        } else {
            echo "Upload failed";
        }
    }
}

function placeUpload($place_dir)
{
    $place_filename = $place_dir . $_POST["id"] . ".json";
    $place_file = fopen($place_filename, "w");
    fwrite($place_file, $_POST["place"]);
    fclose($place_file);
    echo "ok";
}

?> 

