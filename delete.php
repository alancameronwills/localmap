<?php
define ('SITE_ROOT', realpath(dirname(__FILE__)));
$media_dir = SITE_ROOT . DIRECTORY_SEPARATOR . "media" . DIRECTORY_SEPARATOR;
$place_dir = SITE_ROOT . DIRECTORY_SEPARATOR . "places" . DIRECTORY_SEPARATOR;

if (array_key_exists("id", $_GET)) {
    $place =  $_GET['id'];
    $target_place = $place_dir . $place . ".json";
    unlink ($target_place);
    $target_media = glob($media_dir . $place . "*");
    foreach ($target_media as $pic) {
        unlink($pic);
    }
}

if (array_key_exists("pic", $_GET)) {
    $picid = $_GET['pic'];
    $target_pic = $media_dir . $picid;
    unlink ($target_pic);
}
echo "ok";
?> 
 
