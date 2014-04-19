//// VARIABLES
//global vars
html = {};
html.touch = false;
html.frame_element = '<div class="frame" tabindex="-1"></div>';
html.max_page = -1;
html.viewports = [800,500]; // list of available scaled images
   

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
  [ frame, image_norm, user ] = hash._normalize( [frame, image, user] ); //normalize
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

function image_loader(image, size) {
  image = $(image);
  // find next available image size
  // look in image div
  var sizes = image.data('size') || [];
  sizes = sizes.slice(0);
  // look in viewer
  if( v_sizes = image.parent('.viewer').data('size') ) {
    $.merge(sizes, v_sizes.slice(0))
  }
  // use global sizes
  if( g_sizes = html.viewports.slice(0) ) { //slice to copy
    $.merge(sizes, g_sizes);
  }
  var size;
  // false if no sizes found:
  if( 0 == sizes.length ) {
    size = false;
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
    size = sizes.sort();
  }
  
  var size_iterator = 0;
  var img = $('<img>');
  var img_url = image.attr('id');

  var next_name = function() {
    //tried everything nothing worked
    if(-1 == size_iterator) {
      return false;
    }
    // try largest file
    if(!size || size_iterator >= size.length) {
      return img_url;
      size_iterator = -1;
    } else { // try next size
      return img_url + '_' + size[size_iterator++];
    }
  }

  // try to load next bigger image, if size is not available
  // because the load event is called on an image if the src attribute is changed inside the error event handler (and the error event isn't anymore), the next img is loaded on a new img element, until it loads successfully. Then the src is copied to the real image.
  
  //image loaded (really). apply src to real src.
  var apply_src = function() {
    $(this).off('error');
    img.attr('src', $(this).attr('src') );
  }
  
  var retry = function() {
    var n = next_name();
    //img.off('error',retry);
    if( n ) {
      proxy_img = $('<img>').on('error',retry);
      proxy_img.on('load', apply_src).attr('src', config.PAGE_FOLDER+'/'+n);
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

//// INITIALIZATION

//initialize when loaded
$(document).ready(function() {
  //initialize window location hash
  if( hash()[0] === false ) { hash(config.DEFAULT_PAGE, null, null, false); }  
  var h = hash();

  //initialize frames
  if( h[0]>0 ) {
    frame.create( $('.frame:first').attr('id','page'+(h[0]-1)).css({'left':'-100%'}).hide());
  }
  frame.create( $('.frame:eq(1)').attr('id','page'+h[0]).css({'left':'0'}).focus() ); //first visible frame
  frame.create( $('.frame:eq(2)').attr('id','page'+(h[0]+1)).css({'left':'100%'}).hide());

  //trigger init event
  $(document).trigger('init.pho')

  //initialize body and html background color 
  //(otherwise some bad color is visible when moving to the side and scrolling up to a frame with less height)
  $('body, html').css({'background-color': $('div.current').css('background-color') });
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
  $('div#lightbox').css({'opacity':'1'}).hide().on($.getTapEvent(), lightbox.hide);
  
   //initialize keyboard shortcuts
  $('body').on('keydown', function(e) { 
      if( 27 == e.keyCode ) { // esc
          lightbox.hide();
      }
  });
  
  //init onhashchange
  $(window).on('hashchange', lightbox.navigate.move_event('hash'));  
  
  //initialize lightbox navigation
  $('div#lightbox_navigator_right').on($.getTapEvent(), lightbox.navigate.move_event('right'));
  $('div#lightbox_navigator_left').on($.getTapEvent(), lightbox.navigate.move_event('left'));
  
  //initialize keyboard shortcuts
  $('body').on('keydown', function(e) { 
      if( 37 == e.keyCode ) { // left
          lightbox.navigate.move('left');
      } else if( 39 == e.keyCode ) { // right
          lightbox.navigate.move('right');
      }
  });
});

var lightbox = {
    _e: 'div#lightbox',
    _visible: undefined,
    _restore: [],
    _current_image: undefined, //html element (from frame) of currently displayed image
  
    _extract_css_size: function(string, abs_size) {
        // detect: % or px value
        if( string.substr(-1) == '%' ) {
            return parseInt(string)/100 * abs_size;
        }
        return parseInt(string)
    },
  
    //return width that image will have in lightbox (approx.)
    get_image_width: function(image) {
        //read the ratio from the data field, if not set, try to calculate.
        var ratio = image.find('img').data('ratio');
        ratio = ratio || image.width()/image.height()
        
        var img = $(lightbox._e).find('img#lightbox_img');
        // detect: % or px value
        var max_height = lightbox._extract_css_size( img.css('max-height'), $(window).height() );
        var max_width = lightbox._extract_css_size( img.css('max-width'), $(window).width() );
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
        image = $(image);
        var img = image_loader(image, lightbox.get_image_width(image));
        img.load(function() {
            var e = $(lightbox._e);

            //insert image
            e.find('img#lightbox_img').replaceWith( $(this).attr('id','lightbox_img').hide() );
            
            //load caption
            var text = image.find('.caption span').text();
            if( text == '' ) {
                // if there is no caption, give away space
                var c = e.find('.lightbox_caption');
                if( !lightbox._restore['lightbox_height'] ) {
                    lightbox._restore['lightbox_height'] = c.css('height');
                }
                c.css({'height':'5%'}).text('');
            } else {
                // display captions
                e.find('.lightbox_caption').height( lightbox._restore['lightbox_height'] )
                    .text( text ).css({'color': image.css('color') });
                lightbox._restore['lightbox_height'] = null;
            }
            
            //adjust color
            e.css({'background-color': image.css('background-color'), 'top':0})
        
            //update hash
            hash( null, image.attr('id') );
        
            // tootle lightbox navigation (hide if no more images)
            lightbox.navigate.toggle();
        
            callback($(this));
        });
        return img;
    },
  
    show: function(e) {
        lightbox._visible = true;

        var image = $(this);
        lightbox._current_image = image; //store current image for later usage.
        
        lightbox._load(image, function() {  
            //hide scrollbar
            lightbox._restore.scrollTop = $(document).scrollTop();
            $('body, html').css({'overflow': 'hidden'});
            $('#frame_container').css({'display': 'none'});
                   
            //finish animation
            $(lightbox._e).trigger({type:'load_lightbox_end.pho', image:image});
        });

        //start animation
        $(lightbox._e).trigger({type:'load_lightbox_start.pho', image:image});
    },
  
    navigate: {
        //# navigation inside the lightbox
        
        toggle: function() {
            //# show of hide navigation depending on if there is a previous/next image
            $('div#lightbox_navigator_left, div#lightbox_arrow_left').toggle(  lightbox._current_image.prevAll('.image').length != 0 );
            $('div#lightbox_navigator_right, div#lightbox_arrow_right').toggle( lightbox._current_image.nextAll('.image').length != 0  );
        },
        
        move_event: function(to) {
            return function(e) { 
                e.stopPropagation()
                return lightbox.navigate.move(to); 
            }
        },
        
        move: function(to) {
            /*# display previous or next image 
            @param to: 'left', 'right' or 'hash'. 
                       'hash' will try to identify a left or right action from the location hash, and apply it.
            */
            //skip if lightbox is not visible
            if( !is_full_view() ) {
                return;
            }
            
            // hash function (history back)
            if( to == 'hash' ) {
                var h = hash();
                
                //do nothing if image from hash matches displayed image (current)
                if( h[1] == lightbox._current_image.attr('id') ) {
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
            
            $(lightbox._e).trigger({type:'move_lightbox_start.pho'});
            
            // set new current image
            lightbox._current_image = to_image;
            
            // start an event for the transition to the new image --> animation.js
            img = lightbox._load(to_image, function(img) {
                $(lightbox._e).trigger({type:'move_lightbox_end.pho', img:img});
            });
        }

    },
  
  hide: function(e) {  
    $('body, html').css({'background-color': $('div.current').css('background-color'), 'overflow': ''});
    $('#frame_container').css({'display': ''});
    $(document).scrollTop(lightbox._restore.scrollTop);
    $('#lightbox').css('top',lightbox._restore.scrollTop);

    $(lightbox._e).trigger('hide_lightbox.pho');

    //update hash
    hash( null, "" );
    
    $(lightbox._e).promise().done(function() {
        lightbox._visible = false;
    });
  },
  
  toggle: function(e) {
    // show/hide lightbox
    var image = $(this);
    if( !image.length && lightbox._visible ) { lightbox.hide(); }
    else if( !lightbox._visible ){ lightbox.show.apply(image); }
  }
}

//// NAVIGATION

//initialize navigation
$(document).on('init.pho', function() {
  //init onhashchange
  $(window).on('hashchange', navigate.move_event('hash'));
  
  //initialize navigation action
  $('div#navigator_right').on($.getTapEvent(), navigate.move_event('right'));
  $('div#navigator_left').on($.getTapEvent(), navigate.move_event('left'));
  navigate.toggle();
  
  //initialize swipe gesture
  $('body').on('swipeleft', navigate.move_event('right'));
  $('body').on('swiperight', navigate.move_event('left'));
  
  //for small screens: hide navigation, swipe instead
  $(window).one('touchstart', function() {
      if (screen.width < 820) {
          html.touch = true;
          // hide navigation
          navigate.toggle();
          // show touch footer
          navigate._touch_footer();
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
  toggle: function() {
    //check if navigators should be visible or not
    var page = parseInt( $('div.current').attr('id').substr(4) );
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
      $('div#navigator_right, div#arrow_right').hide();
      $('div#navigator_left, div#arrow_left').hide();
    } else {
      $('div#navigator_right, div#arrow_right').toggle(ret['right']);
      $('div#navigator_left, div#arrow_left').toggle(ret['left']);
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
  
      navigate._touch_footer(false); //hide touch footer
      
      if( navigate.toggle()[to] == 0 || is_full_view() ) { return; } //last element, can't go right / or is viewing single picture
  
      var current = $('div.current');
      
      var new_frame = navigate['_'+to](current);

      //set document background (yes it's necessary!)
      $('body, html').css({'background-color': new_frame.css('background-color')});

      //change "current" flag (css-class) to frame on the right and focus new frame
      current.removeClass('current');
      new_frame.addClass('current')

      $('#frame_container').trigger({type:'move_'+to+'.pho',current:current});
      
      //update hash
      hash( new_frame.attr('id').substr(4) );
      //wait for animations to finish
      new_frame.promise().done(function() {
        // focus frame
        new_frame.focus();
      });

      navigate.toggle();
  },
  
  _hash: function() {
    var h = hash();
    var curr = parseFloat( $('div.current').attr('id').substr(4) );

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
    if( current.prev().is($('.frame:first')) ) {
      frame.create( $('#frame_container').prepend(html.frame_element).children(':first').css({'left':'-100%'}).hide());
    }
    return current.prev();
  },
  
  _right: function(current) {
    //append new frame if this is the last frame.
    if( current.next().is($('.frame:last')) ) {
      frame.create( $('#frame_container').append(html.frame_element).children(':last').css({'left':'100%'}).hide());
    }
    return current.next();
  },
  
  _touch_footer: function(enable) {
    if(!html.touch) { return; }
    enable = (enable===undefined)? true : enable;
    
    if(enable) {
      $('#touch_footer').trigger('show_touch_footer.pho');
    } else {
      $('#touch_footer').trigger('hide_touch_footer.pho');
    }  
  }
}

//// FRAME

var frame = {
  create: function( frame_element ) {
    //load page and fill into frame
    // find number for new frame
    if( !frame_element.attr('id') ) {
      if( n = frame_element.prev().attr('id') ) { n = parseFloat( n.substr(4) ) + 1; }  
      else if( n = frame_element.next().attr('id') ) { n = parseFloat( n.substr(4) ) - 1 }
      else { return; }
      frame_element.attr('id','page'+n);
    }

    curr = parseFloat( frame_element.attr('id').substr(4) );
    if( curr < 0 ) { return; } //don't load pages below 0
    //load and insert page
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
        if(frame_element.is( $('div.current') )) { 
          navigate.move('hash'); // load image etc.
        }
      });
    })(curr);
  },

  // return width of image. image = div element
  get_image_width: function(image) {
    image = $(image);
    var frame = image.parents('.frame');
    var restore_z = frame.css('z-index');
    var restore_disp = frame.css('display');
    frame.css('z-index',-1).show();
    var width = image.width();
    frame.css({'z-index':restore_z, 'display':restore_disp});
    return width;
  },

  _init_viewer: function( frame_element ) {
    //copy background color 
    var color = frame_element.children('div.viewer').css('background-color');
    frame_element.css({'background-color':color});

    var images = frame_element.find('.image');
    var queue = new function_queue();
    //load images
    images.each( function() {
      var img = $(this);
      var ext = img.data('ext') || ""; //get file extension if any;
      var img_url = img.attr('alt');
      if( !img_url ) { img_url = img.attr('id') }
      
      var img_element = image_loader(img, frame.get_image_width(img)).hide();

      var show = function() {
        img.prepend( img_element.fadeIn().css('display','') ); //"display" should be block (defined in css) 
      };
      queue.put(show);
      img_element.load(function() {
        // store the image ratio in the element
        $(this).data('ratio', this.width/this.height);
        
        queue.ex(show);
      })
      img.hover( caption.show, caption.hide );
      $('.caption').css({'opacity': config.CSS_CAPTION_OPACITY}) //works in IE
    });

    //make images clickable
    images.on($.getTapEvent(), lightbox.show );
    
    //enable external links
    frame_element.find('[class^=ref_]').attr('target','_blank');
  }
}
