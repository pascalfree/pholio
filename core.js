//// VARIABLES
//global vars
html = {};
html.touch = false;

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
 *  @param image: an Image object //TODO: document these
 *  @param size: minimum size of the image to be loaded
 *  @param current (optional): img element that will be replaced. New image will not be loaded, if it is the same.
 *  @return: an img element on success and false, if no image was found (or is the same as the current image)
 */
function image_loader(image, size, current) {
  //image = $(image);
  image_loader.loaded_size = image_loader.loaded_size || {};

  // only load new images, larger than previously loaded images.
  // The large image is cached
  loaded_size = image_loader.loaded_size[image.id()] || 0;
  size = size > loaded_size? size : loaded_size;

  // find next available image size
  // use global sizes
  var sizes = config.IMAGE_SIZES || [];
  sizes = sizes.slice(0);
  // look in viewer
  $.merge(sizes, image.viewer.sizes.slice(0))
  // look in image div
  $.merge(sizes, image.sizes.slice(0))

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
  var img_url = image._img_name;
  var img_ext = image._img_ext;
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
            image_loader.loaded_size[image.id()] = max_size+1;
        } else {
            image_loader.loaded_size[image.id()] = available_size[size_iterator-1];
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
  var param_list = []; // parameters to pass with function calls

  function exex() {
    var i;
    while( -1 != (i = $.inArray(f_list[0], ex_list)) ) { // while first function in queue should be executed
      var f = f_list[0];
      var param = param_list[ i ];
      // remove function from lists;
      f_list.splice(0,1);
      ex_list.splice(i,1);
      param_list.splice(i,1);
      // execute function
      f.apply(this, param);
    }
  }

  // push function to list
  this.put = function(f) {
    f_list.push(f);
  }

  // push function to list to be called, then try to call functions according to queue
  this.ex = function(f, params) {
    ex_list.push(f);
    param_list[ ex_list.indexOf(f) ] = params;
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

// Functions to perform a callback, once a process is finished
// used to extend other objects with $.extend(Obj.prototype, new Done());
function Done() {
    this._Done_done = false;
    this._Done_done_callback = null;
}

// callback when Object is finished loading
Done.prototype.done = function( callback ) {
    if( this._done ) {
        callback();
    } else {
        this._Done_done_callback = callback;
    }
}

Done.prototype._set_done = function() {
    this._Done_done = true;
    if( this._Done_done_callback !== null ) {
        this._Done_done_callback();
    }
}

//// INITIALIZATION

//initialize when loaded
$(document).ready(function() {
  //initialize window location hash
  if( hash()[0] === false ) { hash(config.DEFAULT_PAGE, null, null, false); }
  var h = hash();

  //initialize frames
  frameContainer = new FrameContainer( h[0] );

  // wait for frameContainer to load
  frameContainer.done(function() {
      //trigger init event
      $(document).trigger('init.pho');

      //reload images if window is resized
      $(window).on("debouncedresize", function(e) {
        lightbox.reload_image();
        frameContainer.reload_images();
      });
  });
});

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

  // load lightbox if hash contains image id
  var h = hash();
  lightbox.toggle.apply( $("[id='"+h[1]+"']") );
});

var lightbox = {
    _restore: [],
    _image_iterator: null, //iterator of images in current view

    //initialize values
    __init: function() {
        this._lightbox = "div#pho-lightbox";
        this._img_id = "pho-lightbox_img";
        this._img = 'img#' + this._img_id;
        this._caption = 'div#pho-lightbox_caption';
        this._state = this.element().is(":visible")*2; // 0: invisible, 1: showing, 2: visible, 3: hiding
    },

    // initialize lightbox events
    init_events: function() {
        var lb = this.element();
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
    element: function() {
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
        //read the ratio from the image.
        var ratio = image.ratio;
        ratio = ratio || image.get_img().width()/image.get_img().height()

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
        var img = image_loader(image, this.get_image_width(image), this.get_img());
        var lightbox = this;
        img.load(function() {
            var e = lightbox.element();

            //insert image
            lightbox.get_img().replaceWith( $(this).attr('id', lightbox._img_id).hide() );

            //load caption
            e.trigger({type:'lightbox_caption_load.pho', text:image.caption.text, color:image.element().css('color')});

            //update hash
            hash( null, image.id() );

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
            var image = this._image_iterator.current();
            var img = image_loader(image, this.get_image_width( image ));
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

        // get Image object from image element
        lightbox._image_iterator = frameContainer.get_current_frame().viewer.image_iterator();
        lightbox._image_iterator.set_current( $(this).attr('id') );
        var image = lightbox._image_iterator.current();
        //var image = $(this);
        //lightbox._current_image = image; //store current image for later usage.

        lightbox._load(image, function() {
            // cancel, if state is not 'showing' anymore
            if( lightbox._state != 1) {
                lightbox.element().trigger({type:'load_lightbox_cancel.pho', image:image});
                return;
            }

            //finish animation
            lightbox.element().trigger({type:'load_lightbox_end.pho', image:image});
            lightbox._state = 2; //visible
        });

        //start animation
        lightbox.element().trigger({type:'load_lightbox_start.pho', image:image});
    },

    navigate: {
        //# navigation inside the lightbox
        _hidden: false,
        _left: 'div#pho-lightbox_navigation_left',
        _right: 'div#pho-lightbox_navigation_right',
        _arrow_left: 'div#pho-lightbox_navigation_arrow_left',
        _arrow_right: 'div#pho-lightbox_navigation_arrow_right',
        _close: 'div#pho-lightbox_close',

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
            $(this._left + ', '+ this._arrow_left).toggle( !lightbox.navigate._hidden && lightbox._image_iterator.has_prev() );
            $(this._right + ', '+ this._arrow_right).toggle( !lightbox.navigate._hidden && lightbox._image_iterator.has_next() );
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
                var image = lightbox._image_iterator.current();

                //do nothing if image from hash matches displayed image (current)
                if( !h[1] || h[1] == image.id() ) {
                    return;
                }

                // move left or right depending on hash value
                if( h[1] == lightbox._image_iterator.clone().prev().id() ) {
                    to = 'left';
                } else if( h[1] == lightbox._image_iterator.clone().next().id() ) {
                    to = 'right';
                } else {
                    location.reload();
                    return;
                }
            }

            // get new image to be displayed
            var to_image; //init with empty jquery obj
            if( to == 'left' && lightbox._image_iterator.has_prev() ) {
                to_image = lightbox._image_iterator.prev();
            } else if( to == 'right' && lightbox._image_iterator.has_next() ) {
                to_image = lightbox._image_iterator.next();
            } else {
                //throw "Warning: Tried to move to inexistant image in lightbox.navigate.";
                //ignore
                return;
            }

            $(lightbox._lightbox).trigger({type:'move_lightbox_start.pho', to:to});

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

        var $this = this;
        frameContainer.on_frame_added( function() {
            $this.toggle();
        });
    },

  toggle: function() {
    //check if navigators should be visible or not
    var page = frameContainer.get_page();

    var ret = new Array;
    ret['right'] = frameContainer.has_page( page + 1 );
    ret['left'] = frameContainer.has_page( page - 1 );

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

      if( is_full_view() ) { return; } // is viewing single picture

      var current = frameContainer.get_page();
      var new_page = navigate['_'+to](current);

      //change current page
      frameContainer.set_page( new_page );

      //update hash
      hash( frameContainer.get_page() );

      navigate.toggle();
  },

  _hash: function() {
    var h = hash();
    frameContainer.set_page( h[0] );

    // show/hide lightbox if hash says so
    lightbox.toggle.apply( $("[id='"+h[1]+"']") );
  },

  _left: function(current) {
    return current-1;
  },

  _right: function(current) {
    return current+1;
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

//// FRAME CONTAINER

function FrameContainer( page ) {
    this._container = "div#pho-frame_container";

    this.frame = [];

    this._current = null;
    this._last = null;
    this._first = null;
    this._max_page = null;

    // event listeners
    this._listeners = {
        //'on_first_frame_added': [],
        'on_frame_added': []
    };

    // Initialize first frames
    var container = this.element();
    var frame = new Frame( page );
    var $this = this;
    frame.exists(function() {
        $this._current = page;
        $this._last = $this._first = page;
        this.insert_into( container );
        $this.frame[ page ] = this;

        frame.done(function() {
            $this._set_done();
        });

        //$this._call_listeners('on_first_frame_added');
        $this._call_listeners('on_frame_added', this);

        $this.append(); //async
    });
}

$.extend(FrameContainer.prototype, new Done());

FrameContainer.prototype.on_frame_added = function( listener ) {
    this._listeners['on_frame_added'].push( listener );
}

FrameContainer.prototype._call_listeners = function( event, parameters ) {
    for( listener in this._listeners[event] ) {
        this._listeners[event][listener].apply(this, parameters);
    }
}

// returns container element
FrameContainer.prototype.element = function() {
    return $(this._container);
}

// append new frames to the container, where necessary.
FrameContainer.prototype.append = function() {
    var $this = this;
    // left
    if( this._current == this._first && this._current != 0 ) {
        var newframe_left = new Frame( this._current-1 );
        newframe_left.exists(function() {
            $this._first--;
            newframe_left.insert_into( $this.element() ).hide();
            $this.frame[ $this._current-1 ] = newframe_left;
            $this._call_listeners('on_frame_added', newframe_left);
        });
    }
    // right
    if( this._current == this._last && this._current != this._max_page ) {
        var newframe_right = new Frame( this._current+1 );
        newframe_right.exists(function() {
            $this._last++;
            newframe_right.insert_into( $this.element() ).hide();
            $this.frame[ $this._current+1 ] = newframe_right;
            $this._call_listeners('on_frame_added', newframe_right);
        }, function() {
            $this._max_page = ($this._max_page == null || $this._current < $this._max_page)? $this._current : $this._max_page;
        });
    }
}

FrameContainer.prototype.get_page = function() {
    return this._current;
}

FrameContainer.prototype.get_current_frame = function() {
    return this.frame[this._current];
}

// return true if the page `page` exists, false otherwise
FrameContainer.prototype.has_page = function( page ) {
    return (page >= this._first && page <= this._last);
}

// set the current page
FrameContainer.prototype.set_page = function( page ) {
    // limit input
    page = Math.max(Math.min(page, this._last), this._first);
    // if nothing changes, do nothing
    if( this._current == page ) {
        return;
    }
    var from = this.frame[this._current];
    var direction = this._current > page ? 'left' : 'right';
    this._current = page;
    // trigger page change event
    frameContainer.element().trigger({type:'move_'+direction+'.pho', from:from, to:this.frame[page]});
    // append new frames if necessary
    this.append();
}

FrameContainer.prototype.reload_images = function() {
    // reload images in all frame starting with the current frame
    this.frame[this._current].reload_images();
    for( var i = this._first ; i <= this._last ; ++i ) {
        if( i != this._current ) {
            this.frame[i].reload_images();
        }
    }
}

//// FRAME
function Frame( id ) {
    // create and store html element
    this._e = $('<div id="' + this._page_id + id + '" class="' + this._id + '" tabindex="-1"></div>');
    this.viewer;
    this._exists = null;
    this._exists_callback_true = null;
    this._exists_callback_false = null;

    // load viewer
    if( id < 0 ) { return; } //don't load pages below 0
    //load and insert page
    var $this = this;
    this._e.load( config.PAGE_FOLDER + '/' + id + '.html', function(resp, status) {
        if( status == "error" ) { //found last page
            $this._set_exists( false );
            return;
        }
        $this._set_exists( true );

        var viewer = $this._e.children('.viewer, .pho-viewer');
        $this._e.css( {'background-color': viewer.css('background-color') } );

        $this.viewer = new Viewer( viewer );

        $this._set_done();
    });

    return this;
}

// add callback functionality
$.extend(Frame.prototype, new Done());

Frame.prototype._id = "pho-frame";
Frame.prototype._page_id = "pho-page";

Frame.prototype.element = function() {
    return $(this._e);
}

Frame.prototype.hide = function() {
    this._e.hide();
    return this;
}

Frame.prototype.show = function() {
    this._e.show();
    return this;
}

Frame.prototype.insert_into = function( parent ) {
    parent.append(this._e);
    return this;
}

Frame.prototype.reload_images = function() {
    this.viewer.reload_images();
}

Frame.prototype.exists = function(callback_true, callback_false) {
    if( this._exists !== null ) {
        if( this._exists ) {
            callback_true();
        } else {
            callback_false();
        }
    } else {
        this._exists_callback_true = callback_true;
        this._exists_callback_false = callback_false;
    }
}

Frame.prototype._set_exists = function(value) {
    this._exists = value;
    if( value && this._exists_callback_true !== null ) {
        (this._exists_callback_true)();
    } else if( !value && this._exists_callback_false !== null ) {
        (this._exists_callback_false)();
    }
}

//// PAGE

//// VIEWER
function Viewer( element ) {
    this._e = $(element);
    if( !this._e.hasClass('viewer') && !this._e.hasClass('pho-viewer') ) {
        throw "Error: Tried to initialize a Viewer object with a non viewer element.";
    }
    this._images = [];
    this.sizes = this._e.data('size') || [];

    var images = this._e.find('.image, .pho-image');
    var queue = new function_queue();
    //load images
    var $this = this;
    images.each( function() {
        var image_element = $(this);
        // create image element
        var image = new Image( image_element, $this )
        $this._images.push( image ); //store in view

        var show = function(image) {
            image_element.trigger({type:'load_image_end.pho', image:image}); //passing entire image object instead of img element inside image element
        };
        queue.put(show);

        image_element.trigger('load_image_start.pho');

        image.load( function() {
            queue.ex(show, [this]);
        } );
    });

    //make images clickable
    images.on($.getTapEvent(), lightbox.show );

    return this;
}

Viewer.prototype.reload_images= function() {
    //reload all images in viewer images (maybe with higher resolution)
    for( var i = 0; i < this._images.length; ++i ) {
        this._images[i].reload();
    }
}

// return an image iterator
Viewer.prototype.image_iterator = function() {
    return new Iterator(this._images);
}

/// Iterator

function Iterator( array_obj ) {
    this._array = array_obj.slice();
    this._ids = $.map( this._array, function(a) {
        return a.id();
    });
    this._current = -1;
}

// return next image
Iterator.prototype.next = function() {
    this._current++;
    if( this._current >= this._array.length ) {
        this._current = this._array.length;
        return false;
    } else {
        return this._array[this._current];
    }
}

// return current image
Iterator.prototype.current = function() {
    if( this._current >= this._array.length || this._current < 0 ) {
        return false;
    } else {
        return this._array[this._current];
    }
}

// return previous image
Iterator.prototype.prev = function() {
    this._current--;
    if( this._current < 0 ) {
        this._current = -1;
        return false;
    } else {
        return this._array[this._current];
    }
}

Iterator.prototype.has_next = function() {
    return this._current < this._array.length - 1;
}

Iterator.prototype.has_prev = function() {
    return this._current > 0;
}

Iterator.prototype.set_current = function( id ) {
    this._current = this._ids.indexOf(id);
}

Iterator.prototype.get = function( id ) {
    return this._array[ this._ids.indexOf(id) ];
}

Iterator.prototype.clone = function() {
    var clone = new Iterator( this._array );
    clone._current = this._current;
    return clone;
}

//// IMAGE
function Image( element, viewer ) {
    // check and store html element
    var image = $(element);
    if( !image.hasClass('image') && !image.hasClass('pho-image') ) {
        throw "Error: Tried to initialize an Image object with a non image element.";
    }
    this._e = image;

    // extract properties
    this._img_name = image.attr('id');
    this._img_ext = image.data('ext') || "";
    this.ratio = undefined;
    this.sizes = image.data('size') || [];
    this.caption = new Caption( image.find('.caption, .pho-caption') );
    this.viewer = viewer;

    // show caption on hover
    var $caption = this.caption;
    image.hover( function() {
        $caption.show();
    }, function() {
        $caption.hide();
    });

    return this;
}

Image.prototype.load = function( onload ) {
    // load image
    this._img = image_loader(this, this.get_width());
    var $this = this;
    this._img.load( function() {
        // store the aspect ratio
        $this.ratio = this.width/this.height;

        onload.apply($this);
    });
}

Image.prototype.element = function() {
    return $(this._e);
}

Image.prototype.get_img = function() {
    return $(this._img);
}

// return width of image
Image.prototype.get_width = function() { //_get_image_width
    var e = new show_in_background(this._e);
    e.show();
    var width = this._e.width();
    e.restore();
    return width;
}

Image.prototype.reload = function() {
    var old_img = this._img;
    this._img = image_loader(this, this.get_width());
    var $this = this;
    this._img.load(function() {
        // store the aspect ratio
        $this.ratio = this.width/this.height;

        old_img.replaceWith( $(this) );
    })
}

//return unique identifer of image element
Image.prototype.id = function() {
    return this._img_name;
}

//// CAPTION

function Caption( element ) {
    if( !element || !element.length ) {
        this.text = '';
        this._e = false;
        return this;
    }
    this._e = element;
    if( !element.hasClass('caption') && !element.hasClass('pho-caption') ) {
        throw "Error: Tried to initialize a Caption object with a non caption element.";
    }
    this.text = this._e.find('span').text();

    //enable external links
    element.find('[class^=ref_]').attr('target','_blank');

    return this;
}

Caption.prototype.show = function() {
    if( this._e ) this._e.trigger('show_caption.pho');
}

Caption.prototype.hide = function() {
    if( this._e ) this._e.trigger('hide_caption.pho');
}

