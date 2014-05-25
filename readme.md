# Pholio

Pholio is a semi-static template, that allows to design creative and individual photo galleries easily. Multiple Pictures can be arranged in frames using custom (static) html and css. Pholio then automatically adds life to the frames, making them interactive on desktop and on touch devices.

## Demo
  * [pholio.ihdg.ch](http://pholio.ihdg.ch/)

## Install

see [install.md](install.md)

## Why
While many online galleries are easy to set up and great to manage photo collections, they usually won't let the artist put up their pictures exactly how they want to. Customizing usually means, digging into a lot of code or writing some code from scratch.
Pholio lets the artist decide how the pictures are presented in simple html and css, while adding all the interactions automatically.

## How
A pholio website consists of one or more Frames. Each frame is a html snippet containing information about the formatting of the pictures and the text beeing displayed. Pholio allows to switch beetween this frames by clicking the arrows left and right of the page or by swiping on a touch screen devices. Each picture becomes clickable and will show up in a customized lightbox. 

## Interactions
  * Switch between different Frames
  * Click a picture to view in full size
  * Hover a picture to show caption
  * Add external links to picture.
  * enable history back (including animations)
  
## Extensability
  * customize animations in the separate animations.js file
  
## TODO
  * make all pages fluid [done]
  * let page decide, which image widths are available [progress]
  * preload larger scale images of current frame before clicking, make option to disable in settings.
  * guarantee that selected images have same height. create class: align_1 etc.
  * adjust caption font-size for small screens [done]
  * sometimes tries to load undefined_800 (if screen small)
  * click and side move in lightbox results in swipe event
  * if lightbox doesn't load for 2 seconds, show it with loading icon
  * only show navigation if mouse is moving
  * create namespaces: Core, Frames, Navigator, Lighbox, Caption [progress]
  * define necessary structure of frames
  * separate core from animations: content changes and control in core, visual changes in animations, rename animations to visual
  * full screen mode (STRG+F)?
  
## Thanks
  * jQuery Mobile Events - https://github.com/benmajor/jQuery-Mobile-Events
  * tram.js - https://github.com/BKWLD/tram
