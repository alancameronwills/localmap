<?php    
define ('SITE_ROOT', realpath(dirname(__FILE__)));
$media_dir = SITE_ROOT . DIRECTORY_SEPARATOR . "media" . DIRECTORY_SEPARATOR;
$place_dir = SITE_ROOT . DIRECTORY_SEPARATOR . "places" . DIRECTORY_SEPARATOR;
//$datestamp = $_GET['after'] 

echo "[";
$separator = " ";
foreach (array_diff(scandir($place_dir), array('.', '..')) as $placeFileName){ 
    echo  $separator;
    $separator = ", ";
    readfile($place_dir . $placeFileName);
} 
echo " ]";

?>