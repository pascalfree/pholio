# Pholio Documentation: Pages

## Naming

Pages are HTML-files inside the `PAGE_FOLDER` as defined in `config.js` (default is `pages/`).
They are named with consecutive numbers, starting with 0.

i.e. 0.html, 1.html, etc.

Pholio will detect these pages and allow switching between them.

## Architecture

### The Viewer

Each page has one parent element, the *Viewer*:

    <div class="pho-viewer">
    
The `background-color` of the viewer element will be set for the entire page (regardless of the viewer size).

The page can be designed as desired but the following patterns will have an effect on the behaviour of pholio.

### The Image

For each *image* element, pholio will load the defined image. Clicking on the image will open the lightbox
Minimal:

    <div class="pho-image" id="<<Base name of image, without extension>>" data-ext="<<Image file extension>>"></div>
    
For an image in the folder `/0/example_image.jpg` this would be the image element:

    <div class="pho-image" id="0/example_image" data-ext=".jpg"></div>

#### Lightbox parameters

The image element can be used to style the lightbox per image.

* The *background color* of the lightbox is the `background-color` set for the *image* element (default: black)
* The font color of the caption in the lightbox is the `color` set for the *image* element (default: white)

Example: Lightbox with black text on white background:
    
    <div class="pho-image" id="0/example_image" data-ext=".jpg" style="background-color: white; color: black"></div>

#### Image sizes

Images are available in different sizes (TODO:needs documentation). If a size is not available for all images (on the page) it can be set for specific pages:

    <div class="pho-image" id="0/example_image" data-ext=".jpg" data-size="[523, 815]"></div>

This image is (expected to be) also available as `0/example_image_523.jpg` and `0/example_image_815.jpg`.

#### The Caption

Each image may have a caption. It is displayed on the image on mouseover and as the title in the lightbox.
Example of caption for an image:

    <div class="pho-image" id="0/example_image" data-ext=".jpg">
       <div class="pho-caption"><span>This is a caption</span></div>
    </div>
    
##### Caption Styling

The appearance of the caption box on the image can be modified using the following classes on the *caption* element.

* `white` will change the background color of the caption box from black to white.
* `text_black` changes the text color of the caption from white to black.
* `caption_top` aligns the box to the top of the image instea of the bottom.
* `caption_left` will align the text to the left instead of to the right.

Full example:

    <div class="pho-image" id="0/example_image" data-ext=".jpg">
       <div class="pho-caption white text_black caption_top caption_left"><span>This is a caption</span></div>
    </div>
    
##### Caption Links

Captions may contain an icon link to the same image on an image hosting service.
Currently icons for *500px* and *flickr* are included in pholio.

Example:

    <div class="pho-caption">
       <a class="ref-500px" alt="500px" title="500px" href="http://500px.com/photo/xxxxxxx"></a>
       <a class="ref-flickr" alt="flickr" title="flickr" href="http://www.flickr.com/photos/xxxx/xxxxxxxxx/"></a>
       <span>Some caption</span>
    </div>
    
## Examples

See  [pages/template.html]
