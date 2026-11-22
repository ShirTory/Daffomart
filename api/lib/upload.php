<?php
/** Image upload (admin only): checks it is a real picture, shrinks it, and saves it in the uploads/ folder. */
const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;
const IMAGE_WIDTH = ['product' => 1200, 'banner' => 2400, 'category' => 600, 'offer' => 1200, 'general' => 1600];

function save_uploaded_image(array $file, string $kind): array {
    if (($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) throw new ApiError(400, 'No image file received');
    if ($file['size'] > MAX_UPLOAD_BYTES) throw new ApiError(413, 'Image is too large (max ' . (MAX_UPLOAD_BYTES / 1024 / 1024) . ' MB)');
    $info = @getimagesize($file['tmp_name']);
    if (!$info) throw new ApiError(400, 'This file is not a valid image');
    $types = [IMAGETYPE_JPEG => 'jpeg', IMAGETYPE_PNG => 'png', IMAGETYPE_GIF => 'gif', IMAGETYPE_WEBP => 'webp'];
    if (!isset($types[$info[2]])) throw new ApiError(400, 'Only JPG, PNG, WebP or GIF images are allowed');
    if ($info[0] > 12000 || $info[1] > 12000) throw new ApiError(400, 'Image dimensions are too large');
    $src = match ($info[2]) { IMAGETYPE_JPEG => @imagecreatefromjpeg($file['tmp_name']), IMAGETYPE_PNG => @imagecreatefrompng($file['tmp_name']),
                              IMAGETYPE_GIF => @imagecreatefromgif($file['tmp_name']), IMAGETYPE_WEBP => @imagecreatefromwebp($file['tmp_name']) };
    if (!$src) throw new ApiError(400, 'This file is not a valid image');
    // phone photos carry a "rotate me" flag: apply it
    if ($info[2] === IMAGETYPE_JPEG && function_exists('exif_read_data')) {
        $exif = @exif_read_data($file['tmp_name']);
        $rot = [3 => 180, 6 => -90, 8 => 90][$exif['Orientation'] ?? 0] ?? 0;
        if ($rot) $src = imagerotate($src, $rot, 0) ?: $src;
    }
    $maxW = IMAGE_WIDTH[$kind] ?? IMAGE_WIDTH['general'];
    $w = imagesx($src); $h = imagesy($src);
    if ($w > $maxW) { $src = imagescale($src, $maxW) ?: $src; }
    imagealphablending($src, false); imagesavealpha($src, true);   // keep transparency
    $dir = __DIR__ . '/../uploads';
    if (!is_dir($dir)) @mkdir($dir, 0755, true);
    $useWebp = function_exists('imagewebp');
    $name = base_convert((string)time(), 10, 36) . '-' . bin2hex(random_bytes(5)) . ($useWebp ? '.webp' : '.jpg');
    $ok = $useWebp ? imagewebp($src, "$dir/$name", 82) : imagejpeg($src, "$dir/$name", 85);
    if (!$ok) throw new ApiError(500, 'Could not save the image on the server');
    $base = rtrim((string)(cfg()['api_url'] ?? ''), '/');
    return ['url' => "$base/uploads/$name", 'size' => (int)filesize("$dir/$name")];
}
