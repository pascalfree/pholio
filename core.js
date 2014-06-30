//// VARIABLES
//global vars
html = {};
html.touch = false;
html.max_page = -1;

//// UTILITY

/**
* hash( frame, image, user, history = true ): write parameters to hash (parameters are optional)
*   @param history: if set to false, the hash change will not affect the browsers history
* hash(): get current hash as array
* hash()[0]: frame number as integer, false if no frame number is defined
* hash()[1]: image path as a string, undefined if not set
*/
function hash( frame, image, user, history ) {
  // default values
  history = history!==false ? true : false;

  // get value
  var h = window.location.hash.substr(1);
  h = h.split(',');
  // normalize
  hash._normalize(h);

  // set new value
  // [ frame, image_norm, user ] = hash._normalize( [frame, image, user] ); //normalize //fix: this is not yet implemented in chrome
  fiu = hash._normalize( [frame, image, user] );
  frame = fiu[0]; image_norm = fiu[1]; user = fiu[2];

  var changed = false;
  if( $.type(frame) == 'string' || $.type(frame) == 'number' ) {
    changed = h[0] != frame; // only detect actual change
    h[0] = frame;
  }
  if( $.type(image) == 'string' ) { //check unnormalized image, because undefined is not a string
    changed = changed || h[1] != image_norm;
    h[1] = image_norm;
  }
  if( $.type(user) == 'string' ) {
    changed = changed || h[1] != image;
    h[2] = user;
  }
  if( changed ) {
    if( history ) {
      window.location.hash = h.join(',');
    } else {
      //by: http://dev.enekoalonso.com/2008/12/29/modifying-the-url-hash-without-affecting-the-browser-history/
      window.location.replace(window.location.href.split('#')[0] + '#' + h.join(','))
    }
  }

  // get value
  return h
}

// static method to normalize input and output
hash._normalize = function(h) {
  h[0] = parseInt( h[0] );
  // remove ambiguities
  if( isNaN( h[0] ) ) {
    h[0] = false;
  }
  if( '' == h[1] ) {
    h[1] = undefined;
  }
  return h;
}

// returns true if a single picture is viewed
function is_full_view() {
  return hash()[1] != undefined;
}

/**
 *  image_loader: loads the smallest available image larger or equal to the given size
 *  @param image: an image container element //TODO: document these
 *  @param size: minimum size of the image to be loaded
 *  @param current (optional): img element that will be replaced. New image will not be loaded, if it is the same.
 *  @return: an img element on success and false, if no image was found (or is the same as the current image)
 */
function image_loader(image, size, current) {
  image = $(image);

  // only load new images, larger than previously loaded images.
  // The large image is cached
  loaded_size = image.data('loaded_size') || 0;
  size = size > loaded_size? size : loaded_size;

  // find next available image size
  // look in image div
  var sizes = image.data('size') || [];
  sizes = sizes.slice(0);
  // look in viewer
  if( v_sizes = image.parent('.viewer').data('size') ) {
    $.merge(sizes, v_sizes.slice(0))
  }
  // use global sizes
  if( g_sizes = config.IMAGE_SIZES.slice(0) ) { //slice to copy
    $.merge(sizes, g_sizes);
  }

  //get maximum size available
  var max_size = Math.max.apply(Math, sizes);

  var available_size;
  // false if no sizes found:
  if( 0 == sizes.length ) {
    available_size = false;
  } else {
    // remove values < size
    if( size ) {
      var i = 0;
      while( i<sizes.length ) {
        if( sizes[i] < size ) {
          sizes.splice(i,1);
        } else {
          ++i;
        }
      }
    }
    available_size = sizes.sort();
  }

  var size_iterator = 0;
  var img_url = image.attr('id');
  var img_ext = image.data('ext');
  var img = $('<img alt="'+ img_url +'">');

  // abort, if the current img is the same as the new image.
  if( current && current.attr('src') == img_url + '_' + available_size[0] + img_ext ) {
    return false;
  }

  var next_name = function() {
    //tried everything nothing worked
    if(-1 == size_iterator) {
      return false;
    }
    // try largest file
    if(!available_size || size_iterator >= available_size.length) {
      size_iterator = -1;
      return img_url + img_ext;
    } else { // try next size
      return img_url + '_' + available_size[size_iterator++] + img_ext;
    }
  }

  // try to load next bigger image, if size is not available
  // because the load event is called on an image if the src attribute is changed inside the error event handler (and the error event isn't anymore), the next img is loaded on a new img element, until it loads successfully. Then the src is copied to the real image.

    //image loaded (really). apply src to real src.
    var apply_src = function() {
        $(this).off('error');
        img.attr('src', $(this).attr('src') );
        // store size of successfully loaded image
        if( size_iterator == -1 ) {
            image.data('loaded_size', max_size+1);
        } else {
            image.data('loaded_size', available_size[size_iterator-1]);
        }
    }

  var retry = function() {
    var n = next_name();
    //img.off('error',retry);
    if( n ) {
      proxy_img = $('<img>').on('error',retry);
      proxy_img.on('load', apply_src).attr('src', config.PAGE_FOLDER+'/'+n);
    } else {
      $('<img>').off('error',retry);
    }
  }
  retry();

  return img;
}

// function queue class
/* usage:
//   var il = new function_queue();
//   var f = function..
//   var g = function..
//   il.put(f); il.put(g);
//   il.ex(g); // will be called, when it's the first in the queue
//   il.ex(f); // f will be called, then g will be called
// why? images will show up in intended order, not jumping around.
*/
function function_queue() {
  var f_list = []; // queue of functions
  var ex_list = []; // queue of functions to call

  function exex() {
    var i;
    while( -1 != (i = $.inArray(f_list[0], ex_list)) ) { // while first function in queue should be executed
      var f = f_list[0];
      // remove functio from lists;
      f_list.splice(0,1);
      ex_list.splice(i,1);
      // execute function
      f();
    }
  }

  // push function to list
  this.put = function(f) {
    f_list.push(f);
  }

  // push function to list to be called, then try to call functions according to queue
  this.ex = function(f) {
    ex_list.push(f);
    exex();
  }
}

/*
* show_in_background will make an invisible object visible in the background, such that it's size can be determined
*/
function show_in_background( element ) {
    // variables to store original properties of elements
    var was_hidden = false;;
    var restore_zindex;
    var restore_display;
    element = $(element);
    var parent = false;

    this.show = function() {
        // save properties
        restore_display = element.css('display');
        if( !element.is(':visible') ) {
            was_hidden = true;
            restore_zindex = element.css('zindex');
            // make visible (in background)
            element.css({ 'zindex' : '-1' }).show();
        }
        // do the same for the parent element (recursive)
        var parent_element = element.parent();
        if( parent_element[0] != document ) {
            parent = new show_in_background( parent_element );
            parent.show();
        }
    }

    this.restore = function() {
        // restore element
        if( was_hidden ) {
            element.css({ 'zindex' : restore_zindex, 'display' : restore_display});
        }
        // restore parent;
        if( parent ) {
            parent.restore();
        }
    }
}

//// INITIALIZATION

//initialize when loaded
$(document).ready(function() {
  //initialize window location hash
  if( hash()[0] === false ) { hash(config.DEFAULT_PAGE, null, null, false); }
  var h = hash();

  //initialize frames
  frame.init_container( h[0] );

  //trigger init event
  $(document).trigger('init.pho')

  //reload images if window is resized
  $(window).on("debouncedresize", function(e) {
    lightbox.reload_image();
    frame.reload_images();
  });
});

//// CAPTION

var caption = {
  show: function(e) {
    $(this).trigger('show_caption.pho');
  },

  hide: function(e) {
    $(this).trigger('hide_caption.pho');
  }
}

//// LIGHTBOX

//initialize lightbox
$(document).on('init.pho', function() {
  lightbox.init_events();

   //initialize keyboard shortcuts
  $('body').on('keydown', function(e) {
      if( 27 == e.keyCode ) { // esc
          lightbox.hide();
      }
  });

  //init onhashchange
  $(window).on('hashchange', lightbox.navigate.move_event('hash'));

  //initialize keyboard shortcuts
  $('body').on('keydown', function(e) {
      if( 37 == e.keyCode ) { // left
          lightbox.navigate.move('left');
      } else if( 39 == e.keyCode ) { // right
          lightbox.navigate.move('right');
      }
  });

  // switch to touch mode
  $(window).one('touchstart', function() {
      if (screen.width < 820) {
          // hide navigation
          lightbox.navigate.hide();
      }
  });
});

var lightbox = {
    _restore: [],
    _current_image: undefined, //html element (from frame) of currently displayed image

    //initialize values
    __init: function() {
        this._lightbox = "div#pho-lightbox";
        this._img_id = "pho-lightbox_img";
        this._img = 'img#' + this._img_id;
        this._caption = 'div#pho-lightbox_caption';
        this._state = this.get().is(":visible")*2; // 0: invisible, 1: showing, 2: visible, 3: hiding
    },

    // initialize lightbox events
    init_events: function() {
        var lb = this.get();
        //opacity is set here because jquery makes it cross-browser
        lb.css({'opacity':'1'}).hide()
          .on($.getTapEvent(), this.hide);
        //initialize swipe gesture in lightbox
        lb.on('swipeleft', this.navigate.move_event('right'))
          .on('swiperight', this.navigate.move_event('left'));

        //initialize lightbox navigation
        $(this.navigate._right).on($.getTapEvent(), lightbox.navigate.move_event('right'));
        $(this.navigate._left).on($.getTapEvent(), lightbox.navigate.move_event('left'));
    },

    // return lightbox element
    get: function() {
        return $(this._lightbox);
    },

    // return img element of lightbox
    get_img: function() {
        return $(this._img);
    },

    // return lightbox caption element
    get_caption: function() {
        return $(this._caption);
    },

    _extract_css_size: function(string, abs_size) {
        // detect: % or px value
        if( string.substr(-1) == '%' ) {
            return parseInt(string)/100 * abs_size;
        }
        return parseInt(string)
    },

    //helper: return width that image will have in lightbox (approx.)
    get_image_width: function(image) {
        //read the ratio from the data field, if not set, try to calculate.
        var ratio = image.find('img').data('ratio');
        ratio = ratio || image.width()/image.height()

        var img = this.get_img();
        // detect: % or px value
        var max_height = this._extract_css_size( img.css('max-height'), $(window).height() );
        var max_width = this._extract_css_size( img.css('max-width'), $(window).width() );
        // max is wider than image
        if( max_width/max_height > ratio ) {
            return max_height*ratio;
        } else { // max is narrower than image
            return max_width;
        }
    },

    _load: function(image, callback) {
        /*# load image and read meta data from frame
        @param image: html element from frame of image to be loaded
        @param callback: callback function, will be called with:
                callback(img, caption, ...)
        */
        var image = $(image);
        var img = image_loader(image, this.get_image_width(image), this.get_img());
        var lightbox = this;
        img.load(function() {
            var e = lightbox.get();

            //insert image
            lightbox.get_img().replaceWith( $(this).attr('id', lightbox._img_id).hide() );

            //load caption
            e.trigger({type:'lightbox_caption_load.pho', text:image.find('.caption span').text(), color:image.css('color')});

            //update hash
            hash( null, image.attr('id') );

            // tootle lightbox navigation (hide if no more images)
            lightbox.navigate.toggle();

            callback($(this));
        });
        return img;
    },

    reload_image: function() {
        // only if lightbox is visible or showing.
        if( this._state == 1 || this._state == 2 ) {
            // reload currently displayed image (probably in higher resolution)
            var img = image_loader(this._current_image, this.get_image_width(this._current_image));
            var lightbox = this;
            img.load(function() {
                lightbox.get_img().replaceWith( $(this).attr('id', lightbox._img_id) );
            });
        }
    },

    show: function(e) {
        //ignore, if lightbox is not 'invisible' or 'hiding'
        if( lightbox._state != 0 && lightbox._state != 3 ) {
            return;
        }
        lightbox._state = 1; //showing

        var image = $(this);
        lightbox._current_image = image; //store current image for later usage.

        lightbox._load(image, function() {
            // cancel, if state is not 'showing' anymore
            if( lightbox._state != 1) {
                lightbox.get().trigger({type:'load_lightbox_cancel.pho', image:image});
                return;
            }

            //finish animation
            lightbox.get().trigger({type:'load_lightbox_end.pho', image:image});
            lightbox._state = 2; //visible
        });

        //start animation
        lightbox.get().trigger({type:'load_lightbox_start.pho', image:image});
    },

    navigate: {
        //# navigation inside the lightbox
        _hidden: false,
        _left: 'div#pho-lightbox_navigation_left',
        _right: 'div#pho-lightbox_navigation_right',
        _arrow_left: 'div#pho-lightbox_navigation_arrow_left',
        _arrow_right: 'div#pho-lightbox_navigation_arrow_right',
        _close: 'pho-lightbox_close',

        // return navigation elements
        get: function() {
            return $(this._left + ', ' + this._right);
        },

        // return navigation arrows
        get_arrow: function() {
            return $(this._arrow_left + ', ' + this._arrow_right);
        },

        // return close element
        get_close: function() {
            return $(this._close);
        },

        toggle: function() {
            //# show of hide navigation depending on if there is a previous/next image
            $(this._left + ', '+ this._arrow_left).toggle(  lightbox._current_image.prevAll('.image').length != 0 && !lightbox.navigate._hidden );
            $(this._right + ', '+ this._arrow_right).toggle( lightbox._current_image.nextAll('.image').length != 0 && !lightbox.navigate._hidden );
        },

        move_event: function(to) {
            return function(e) {
                e.stopPropagation();
                return lightbox.navigate.move(to);
            }
        },

        move: function(to) {
            /*# display previous or next image
            @param to: 'left', 'right' or 'hash'.
                       'hash' will try to identify a left or right action from the location hash, and apply it.
            */
            //skip if lightbox is not visible
            if( lightbox._state != 2 ) {
                return;
            }

            // hash function (history back)
            if( to == 'hash' ) {
                var h = hash();

                //do nothing if lightbox is not visible, or image from hash matches displayed image (current)
                if( lightbox._state!=2 || h[1] == lightbox._current_image.attr('id') ) {
                    return;
                }

                // move left or right depending on hash value
                if( h[1] == lightbox._current_image.prevAll('.image').first().attr('id') ) {
                    to = 'left';
                } else if( h[1] == lightbox._current_image.nextAll('.image').first().attr('id') ) {
                    to = 'right';
                } else {
                    location.reload();
                    return;
                }
            }

            // get new image to be displayed
            var to_image; //init with empty jquery obj
            if( to == 'left' ) {
                to_image = lightbox._current_image.prevAll('.image').first();
            } else if( 'right' ) {
                to_image = lightbox._current_image.nextAll('.image').first();
            }

            // this function should not be called, if no image exists at direction to move to
            if( !to_image || to_image.length == 0 ) {
                //throw "Warning: Tried to move to inexistant image in lightbox.navigate.";
                //ignore
                return;
            }

            $(lightbox._lightbox).trigger({type:'move_lightbox_start.pho', to:to});

            // set new current image
            lightbox._current_image = to_image;

            // start an event for the transition to the new image --> animation.js
            img = lightbox._load(to_image, function(img) {
                $(lightbox._lightbox).trigger({type:'move_lightbox_end.pho', image:to_image, img:img, to:to});
            });
        },

        // hide navigation
        hide: function() {
            lightbox.navigate._hidden = true;
            lightbox.navigate.toggle();
        }

    },

  hide: function(e) {
    //ignore, if lightbox is not 'showing' or 'visible'
    if( lightbox._state != 1 && lightbox._state != 2 ) {
        return;
    }
    lightbox._state = 3; //hiding

    $(lightbox._lightbox).trigger('hide_lightbox.pho');

    //update hash
    hash( null, "" );

    $(lightbox._lightbox).promise().done(function() {
        // mark invisible, if has been hiding
        if( lightbox._state == 3 ) {
            lightbox._state = 0; //invisible
        }
    });
  },

  toggle: function(e) {
    // show/hide lightbox
    var image = $(this);
    if( !image.length ) {
        lightbox.hide();
    } else if( image.length ) { //fix: only show lightbox if image is set (length > 0)
        lightbox.show.apply(image);
    }
  }
}

lightbox.__init();

//// NAVIGATION

//initialize navigation
$(document).on('init.pho', function() {
  //init onhashchange
  $(window).on('hashchange', navigate.move_event('hash'));

  //initialize navigation action
  navigate.init_events();
  navigate.toggle();

  //initialize swipe gesture
  $('body').on('swipeleft', navigate.move_event('right'))
           .on('swiperight', navigate.move_event('left'));

  //for small screens: hide navigation, swipe instead
  $(window).one('touchstart', function() {
      if (screen.width < 820) {
          html.touch = true;
          // hide navigation
          navigate.toggle();
          // show touch footer
          navigate.init_touch_footer();
      }
  });

  //initialize keyboard shortcuts
  $('body').on('keydown', function(e) {
      if( 37 == e.keyCode ) { // left
          navigate.move('left');
      } else if( 39 == e.keyCode ) { // right
          navigate.move('right');
      }
  });
});

var navigate = {
    _navigation_left: 'div#pho-navigation_left',
    _navigation_right: 'div#pho-navigation_right',
    _arrow_left: 'div#pho-navigation_arrow_left',
    _arrow_right: 'div#pho-navigation_arrow_right',
    _touch_footer: 'div#pho-touch_footer',

    // return navigation elements
    get: function() {
        return $(this._navigation_left + ', ' + this._navigation_right);
    },

    // return navigation arrows
    get_arrow: function() {
        return $(this._arrow_left + ', ' + this._arrow_right);
    },

    // return touch footer element
    get_touch_footer: function() {
        return $(this._touch_footer);
    },

    init_events: function() {
        $(this._navigation_right).on($.getTapEvent(), navigate.move_event('right'));
        $(this._navigation_left).on($.getTapEvent(), navigate.move_event('left'));
    },

  toggle: function() {
    //check if navigators should be visible or not
    var page = frame.get_page();
    var ret = new Array;

    if( html.max_page != -1 && page == html.max_page ) {
      ret['right'] = false;
    } else {
      ret['right'] = true;
    }

    if( page == 0 ) {
      ret['left'] = false;
    } else {
      ret['left'] = true;
    }

    //hide/show navigation
    // hide on touch devices
    if(html.hasOwnProperty('touch') && html.touch) {
      $(this._navigation_right + ', ' + this._arrow_right).hide();
      $(this._navigation_left + ', ' + this._arrow_left).hide();
    } else {
      $(this._navigation_right + ', ' + this._arrow_right).toggle(ret['right']);
      $(this._navigation_left + ', ' + this._arrow_left).toggle(ret['left']);
    }

    return ret;
  },

  move_event: function(to) {
    return function() { return navigate.move(to); }
  },

  move: function(to) {
      if(to == 'hash') {
        return navigate._hash();
      }

      navigate.init_touch_footer(false); //hide touch footer

      if( navigate.toggle()[to] == 0 || is_full_view() ) { return; } //last element, can't go right / or is viewing single picture

      var current = frame.get_current();

      var new_frame = navigate['_'+to](current);

      //change "current" flag (css-class) to frame on the right and focus new frame
      frame.set_current( new_frame );

      frame.get_container().trigger({type:'move_'+to+'.pho', current:current});

      //update hash
      hash( frame.get_page() );

      navigate.toggle();
  },

  _hash: function() {
    var h = hash();
    var curr = frame.get_page();

    // move left or right depending on hash value
    if( h[0] != curr ) {
      if( h[0] == curr+1 ) { navigate.move('right'); }
      else if( h[0] == curr-1 ) { navigate.move('left'); }
      else { location.reload(); }
    }

    lightbox.toggle.apply($("[id='"+h[1]+"']"));
  },

  _left: function(current) {
    //prepend new frame if this is the first frame.
    frame.append();
    return current.prev();
  },

  _right: function(current) {
    //append new frame if this is the last frame.
    frame.append();
    return current.next();
  },

  init_touch_footer: function(enable) {
    if(!html.touch) {
        $(this._touch_footer).trigger('hide_touch_footer.pho');
        return;
    }
    enable = (enable===undefined)? true : enable;

    if(enable) {
      $(this._touch_footer).trigger('show_touch_footer.pho');
    } else {
      $(this._touch_footer).trigger('hide_touch_footer.pho');
    }
  }
}

//// FRAME

var frame = {
    __init: function() {
        this._container = "div#pho-frame_container";
        this._frames_id = "pho-frame";
        this._frames = "div." + this._frames_id;
        this._current_frame_id = "pho-current";
        this._current_frame = "div."  + this._current_frame_id;
        this._page_id = "pho-page";
        this._dummy = '<div class="' + this._frames_id + '" tabindex="-1"></div>';
    },

    get_container: function() {
        return $(this._container);
    },

    // initializes all frames in the container
    init_container: function( page ) {
        this.create( $(this._frames + ':eq(1)').attr('id', this._page_id + page).focus() ); //first visible frame
        if( page>0 ) {
            this.create( $(this._frames + ':first').attr('id', this._page_id + (page-1)).hide());
        }
        this.create( $(this._frames + ':eq(2)').attr('id', this._page_id + (page+1)).hide());
    },

    // append new frames to the container, where necessary.
    append: function() {
        var current = this.get_current();
        // new first frame
        if( current.prev().is($(this._frames + ':first')) ) {
            // copy dummy html to new element
            this.create( this.get_container().prepend(this._dummy).children(':first').hide() );
        }
        // new last frame
        if( current.next().is($(this._frames + ':last')) ) {
            // copy dummy html to new element
            this.create( this.get_container().append(this._dummy).children(':last').hide() );
        }
    },

    // returns current frame element
    get_current: function() {
        return $(this._current_frame);
    },

    // set the current frame element
    set_current: function(new_current) {
        this.get_current().removeClass( this._current_frame_id );
        new_current.addClass( this._current_frame_id );
    },

  create: function( frame_element ) {
    //load page and fill into frame
    // find number for new frame
    if( !frame_element.attr('id') ) {
      if( frame_element.prev().attr('id') ) {
        n = this._get_id( frame_element.prev() ) + 1;
      } else if( frame_element.next().attr('id') ) {
        n = this._get_id( frame_element.next() ) - 1;
      }     else {
        return;
      }
      frame_element.attr('id', this._page_id + n);
    }

    curr = this._get_id( frame_element );
    if( curr < 0 ) { return; } //don't load pages below 0
    //load and insert page
    var frame = this;
    (function(current) {
      frame_element.load(config.PAGE_FOLDER+'/'+current+'.html', function(resp, status) {
        if( status == "error") { //found last page
          // set new limit
          html.max_page = (html.max_page==-1 || current <= html.max_page)? current-1 : html.max_page;
          //check if new limit is exceeded
          if(hash()[0] > html.max_page) {
            hash(html.max_page);
            navigate.move('hash'); //fix: onhashchange may miss
          }
          navigate.toggle();
          //frame_element.remove(); //buggy
          return;
        }
        frame._init_viewer( frame_element ); //initialize viewer
        if(frame_element.is( $(frame._current_frame) )) {
          navigate.move('hash'); // load image etc.
        }
      });
    })(curr);
  },

    get_page: function() {
        return this._get_id(this._current_frame);
    },

    // returns the page number of the frame
    _get_id: function( frame_element ) {
        return parseInt( $(frame_element).attr('id').substr(8) ); //len('pho-page') = 8
    },

    // return width of image. image = div element
    _get_image_width: function(image) {
        var e = new show_in_background(image);
        e.show();
        var width = image.width();
        e.restore();
        return width;
    },

  _init_viewer: function( frame_element ) {
    //copy background color
    var color = frame_element.children('div.viewer').css('background-color');
    frame_element.css({'background-color':color});

    var images = frame_element.find('.image');
    var queue = new function_queue();
    //load images
    var frame = this;
    images.each( function() {
      var img = $(this);
      var ext = img.data('ext') || ""; //get file extension if any;
      var img_url = img.attr('alt');
      if( !img_url ) { img_url = img.attr('id') }

      img.trigger('load_image_start.pho');
      var img_element = image_loader(img, frame._get_image_width(img));

      var show = function() {
        img.trigger({type:'load_image_end.pho', img:img_element});
      };
      queue.put(show);
      img_element.load(function() {
        // store the image ratio in the element
        $(this).data('ratio', this.width/this.height);

        queue.ex(show);
      })
      img.hover( caption.show, caption.hide );
    });

    //make images clickable
    images.on($.getTapEvent(), lightbox.show );

    //enable external links
    frame_element.find('[class^=ref_]').attr('target','_blank');
  },

    reload_images: function() {
        //reload images (maybe with higher resolution)
        // priority on current frame
        var images = $(this._current_frame).find('.image');
        images = $.merge(images, $(this._frames + ':not(' + this._current_frame + ')').find('.image'));

        var frame = this;
        images.each( function() {
            var img = $(this);
            // Do not load smaller images if larger is loaded.
            var img_element = image_loader(img, frame._get_image_width(img), img.find('img'));
            img_element.load(function() {
                img.find('img').replaceWith( $(this).data('ratio', this.width/this.height) );
            });
        });
    }
}
frame.__init();
