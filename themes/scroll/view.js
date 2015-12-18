$.fn.tram = function (fnc) {
    if( typeof fnc == "function" ) {
        // if a function is passed, call it in the context of a 'tram'ed this, but return the original object
        fnc.apply( tram(this) );
        return this;
    } else {
        // else return a 'tram'ed this
        return tram(this);
    }
}

// get rgb color values from a hex or rgb(a) string
  // inspired by http://stackoverflow.com/questions/6805740/jquery-colour-to-rgba
function getColor(s) {
    var patt;
    var base = 10;
    // short hex
    if( s.substr(0,1) == '#' && s.length == 4 ) {
        patt = /^#([\da-fA-F])([\da-fA-F])([\da-fA-F])$/;
        base = 16; //base 16 = hex
    // hex
    } else if( s.substr(0,1) == '#' ) {
        patt = /^#([\da-fA-F]{2})([\da-fA-F]{2})([\da-fA-F]{2})$/;
        base = 16;
    // rgba
    } else if( s.substr(0,4) == 'rgba' ) {
        patt = /^rgba\(([\d]{1,3})\, ?([\d]{1,3})\, ?([\d]{1,3})\, ?([\d\.]*)\)$/;
    // rgb
    } else if( s.substr(0,3) == 'rgb' ) {
        patt = /^rgb\(([\d]{1,3})\, ?([\d]{1,3})\, ?([\d]{1,3})\)$/;
    }
    var m = patt.exec(s);
    return {r: parseInt( m[1], base),
            g: parseInt( m[2], base),
            b: parseInt( m[3], base),
            a: parseFloat( m[4]||1 )};
}

function sortFrames() {
    var frames = [];
    var ids = []
    var it = frameContainer.frame_iterator();
    var frame;
    while( frame = it.next() ) {
        frame.show();
        var id = frame.get_page();
        ids.push(id);
        frames[id] = frame;
    }
    
    ids.sort();
    var container = frameContainer.element();
    for( var i = 0; i<ids.length; ++i ) {
        container.prepend( frames[ids[i]].element() );
    }
}

// scroll manager
var scroll = {
    _animated: false,
    _to: null, // destination element
    _follow: null, //follow this frame without delay
    _timeout: null, //stores a timeout
    _hysteresis: 10, //in px, page change will only trigger that many pixels into the next page

    //create function that will follow a frame (without animation)
    follow: function( element ) {
        this.listener(false);
        this._follow = element;
        var top = element.offset().top;
        tram($(window)).set({'scrollTop': top});
        this.listener(true);
    },

    unfollow: function() {
        this._follow = null;
    },

    to: function( element, callback ) {
        this.listener(false);
        this._to = element;
        var top = element.offset().top;
        this._animated = true;
        var $this = this;
        tram($('html,body')).start({'scrollTop': top}).then(function() { //FIX: $(window) can not be animated
            $this._animated = false;
            $this._follow = this._to;
            $this.listener(true);

            if( typeof callback == "function" ) {
                callback();
            }
        });
    },

    delta: function( delta ) {
        if( this._follow != null ) {
            this.follow( this._follow );
            return;
        }
        if( delta == 0 ) {
            return;
        }
        // add delta to current scroll position
        var currentTop = $(window).scrollTop();
        this.listener(false);
        $(window).scrollTop( currentTop + delta );
        this.listener(true);
        // if it has been animating, continue animation
        if( this._animated ) {
            this.to( this._to );
        }
    },

    listener: function( enable ) {
        $(window)[enable?'on':'off']('scroll', this.onScroll);
        if( !enable ) {
            window.clearTimeout(this._timeout);
        }
    },

    onScroll: function() {
        //limit frequency of onscroll events triggered
        scroll.listener(false);
        scroll._timeout = window.setTimeout(function() {
            //ignore if lightbox is showing
            if( lightbox.is_visible() ) { 
                scroll.listener(true);
                return;
            }

            var semi_window = $(window).height()/2;
            var top = $(window).scrollTop() + semi_window/2;
            // adjust current frame depending on scroll position
            while(true) {
                var current_frame = frameContainer.get_current_frame().element();
                if( top < current_frame.offset().top ) {
                    navigate.goto( frameContainer.get_page() + 1, true );
                    continue;
                } else if( top > current_frame.offset().top + current_frame.height() ) {
                    navigate.goto( frameContainer.get_page() - 1, true );
                    continue;
                }
                break;
            }
           
            // for small pages: switch to the last/first page at the edges of the scroll space
            if( top > $('html').height() - 3*semi_window/2 - 10 ) {
                navigate.goto( frameContainer.get_page() - 1, true );
            }
            if( top < semi_window/2 + 10  ) {
                navigate.goto( frameContainer.get_page() + 1, true );
            }

            scroll.listener(true);
        }, 500);
    }
}

// init when document is ready
$(function() {
    //only show navigation arrows on mousemove
    // do the same for the close icon and caption in the lightbox
    var autohidden = tram( navigate.get_arrow().add(lightbox.navigate.get_arrow()).add(lightbox.navigate.get_close()).add(lightbox.get_caption()) )
                         .set({ 'opacity': 0, 'display': 'block' }).add('opacity 0.276s ease-in-out');
    var arrow_timer;
    var arrow_hider = function() {
        // show arrows (stop hiding animation first)
        autohidden.start({'opacity': 0.8 }).wait(1764).then({'opacity': 0 });
        // hide arrows after delay, unless mouse is still moving
        // in that case start this function again
        arrow_timer = setTimeout(function() {
            $('body').one('mousemove', arrow_hider);
            autohidden.start({'opacity': 0 });
        }, 1764) // 1.764 second delay (why not?)
    }
    $('body').one('mousemove', arrow_hider)
    // do not hide arrows, if mouse is hovering the navigator area (or the caption)
    navigate.get().add(lightbox.navigate.get()).add(lightbox.get_caption()).hover( function() {
        //disable hiding after mousemove
        $('body').off('mousemove', arrow_hider);
        clearTimeout(arrow_timer);
        autohidden.start({'opacity': 0.8 }).wait(4764).then({'opacity': 0 });
    }, function() {
        //reenable hiding after mousemove
        $('body').one('mousemove', arrow_hider);
    })
    
    
    // set scrollTop animation
    var html_body = $('body, html'); //body for chrome, html for firefox
    tram(html_body).add('scroll-top 0.561s ease-out')
    

    // CAPTION
    // show caption
    $('body').on('show_caption.pho', Caption.select(), function() {
        $(this).tram().add('opacity 0.321s ease-in-out').start({'opacity': 0.5});
    });

    // hide caption
    $('body').on('hide_caption.pho', Caption.select(), function() {
        $(this).tram().start({'opacity':0});
    });
    
    // IMAGE
    var flat_loaders = [];

    // start loading an image
    $('body').on('load_image_start.pho', Image.select(), function(e) {
        // add a flat loader to the loading image, but only show first loader in page
        var flat_loader = $('<div class="flat_loader"></div>');
        flat_loaders.push( flat_loader );
        // only show loader of first element.
        if( flat_loaders.length != 1 ) {
            flat_loader.hide();
        }
        $(this).append( flat_loader );
    });
    // finished loading the image
    $('body').on('load_image_end.pho', Image.select(), function(e) {
        // position of current frame before adding the image
        var top_before = frameContainer.get_current_frame().element().offset().top;

        var image = e.image.element();
        var img = e.image.get_img();
        // remove floader
        flat_loaders.shift().remove();
        // insert image
        tram(img).set({'opacity':0});
        image.prepend(img);
        // fade in image
        tram(img).add('opacity 0.576s ease-out').start({'opacity':1});
        // show next loader
        if( flat_loaders.length > 0 ) {
            flat_loaders[0].show();
        }

        // position of current frame after adding the image
        var top_after = frameContainer.get_current_frame().element().offset().top;
        scroll.delta( top_after - top_before );
    });
    
    
    // follow frame while loading
    var follow_once = true;
    frameContainer.on_frame_added(function() {
        if( follow_once ) {
            scroll.follow( frameContainer.get_current_frame().element() );
            follow_once = false;
        }
        scroll.delta(0); //follow when frame is appended
    });
});


// initialize viewer
$(document).on('init_viewer.pho', Viewer.select(), function(e) {
    //make images clickable
    e.images.on($.getTapEvent(), function() {
        // blur before showing lightbox
        lightbox.show.apply( $(this).blur() );
    });
    //make selectable by keyboard
    e.images.on('keypress', function(e) {
        if( e.which == 13 ) { //Enter key
            lightbox.show.apply( $(this) );
        }
    });
});


// initialize navigator
$(document).on('init_navigate.pho', function(e) {
    //initialize keyboard shortcuts
    $('body').on('keydown', function(e) {
        var keyCode = e.keyCode || e.which;
        if( 37 == keyCode ) { // left
            navigate.move('next');
        } else if( 39 == keyCode ) { // right
            navigate.move('prev');
        }
    });

    $( navigate.select('navigation_next') ).on($.getTapEvent(), navigate.move_event('next'));
    $( navigate.select('navigation_prev') ).on($.getTapEvent(), navigate.move_event('prev'));

    frameContainer.on_frame_added( function() {
        navigate.toggle();
    });

    // initialize navigation animation
    navigate.get().add(lightbox.navigate.get()).css({ opacity: 0 }).hover( function() {
        tram(this).start({'opacity': 0.3 }).wait(4764).then({'opacity': 0 });
    }, function() {
        tram(this).start({'opacity': 0 })
    }).tram().add('opacity 0.312s ease-in-out');
    
    // show/hide touch_footer
    navigate.get_touch_footer().on('show_touch_footer.pho', function() {
        tram(this).set({'opacity':0, 'display':'block'}).start({'opacity':0.7});
        window.setTimeout(function() {
            navigate.init_touch_footer(false);
        }, 3000);
    })
    .on('hide_touch_footer.pho', function() {
        tram(this).start({'opacity':0}).then({'display':'none'});
    })
    .tram().add('opacity 0.161s ease-in')
});


//initialize the lightbox
$(document).on('init_lightbox.pho', lightbox.select('lightbox'), function() {
    var restore = [];
    var $this = $(this);

    //initialize keyboard shortcuts
    $('body').on('keydown', function(e) {
        if( 27 == e.keyCode ) { // esc
            lightbox.hide();
        } else if( 37 == e.keyCode ) { // left
            lightbox.navigate.move('prev');
        } else if( 39 == e.keyCode ) { // right
            lightbox.navigate.move('next');
        }
    });

    //opacity is set here because jquery makes it cross-browser
    $this.css({'opacity':'1'}).hide()
        .on($.getTapEvent(), lightbox.hide);
    //initialize swipe gesture in lightbox
    $this.on('swipeleft', lightbox.navigate.move_event('next'))
        .on('swiperight', lightbox.navigate.move_event('prev'));

    // pan image on touch, detect swipe
    {
        var ticking = false, ticker, tick = 1000/30;
        var swipe_threshold = 20, blocked;
        var tap_offset;
        var lightbox_img;
        var update_pan = function(touch_offset) {
            return function() {
                lightbox_img.set({'left': (touch_offset - tap_offset.x)*0.7});
                ticking = false;
            }
        }
        var on_tapmove = function(e, touch) {
            if(!ticking && !blocked) {
                ticker = window.setTimeout(update_pan( touch.offset.x ), tick);
                ticking = true;
            }
        };
        $this.on('tapstart', function(e, touch) {
            tap_offset = touch.offset;
            lightbox_img = tram(lightbox.select('img')).add('left 0.4s ease-out');
            $(lightbox.select('img')).css({'position':'relative'});
            blocked = false;
            $(this).on('tapmove', on_tapmove);
        })
        .on('tapend', function(e, touch) {
            $(this).off('tapmove');
            window.clearTimeout( ticker );
            ticking = false;

            //detect a swipe
            var swiped = false;
            if( !blocked ) {
                var offset_x = touch.offset.x - tap_offset.x;
                var offset_y = touch.offset.y - tap_offset.y;
                if( Math.abs(offset_x) > 1.5*Math.abs(offset_y) ) { //exclude mostly vertical swipes
                    if( offset_x > swipe_threshold ) {
                        swiped = lightbox.navigate.move('prev')
                    }
                    else if( offset_x < -swipe_threshold ) {
                        swiped = lightbox.navigate.move('next')
                    }
                }
            }

            if( lightbox_img && !swiped ) lightbox_img.start({'left': 0 });
        })
        $this[0].addEventListener('touchstart', function(e) {
            // Detect multi touch gestures and disable swipe in that case
            if( blocked = e.touches.length > 1 ) {
                if( lightbox_img ) lightbox_img.set({'left': 0 });
            }
        });
    }

    //initialize lightbox navigation
    $( lightbox.navigate.select('navigation_next') ).on($.getTapEvent(), lightbox.navigate.move_event('next'));
    $( lightbox.navigate.select('navigation_prev') ).on($.getTapEvent(), lightbox.navigate.move_event('prev'));
    
    
    tram($this).add('opacity 0.412s ease-in-out')
                  .add('background 0.176s ease-in-out');
    tram(lightbox.get_caption()).add('background 0.176s ease-in-out');

    var loader = $('<div class="loader">')

    // while lightbox is loading
    $this.on('load_lightbox_start.pho', function(e) {
        // highlight image and show loader on it
        e.image.element().tram().add('opacity 0.7s ease-out').start({'opacity': 0.6 });
        e.image.element().prepend(loader);
        tram(loader).add('opacity 0.7s ease-out').set({'opacity': 0 }).start({'opacity': 0.6 });
        // overlay: invisible lightbox
        tram(this).set({'opacity':0, 'display':'block'});
    });

    // restore image, that has/should have been loaded
    var restore_loading_image = function(e) {
        // make opaque remove loader
        e.image.element().tram(function() {
            this.set({'opacity':1})
        })
        loader.remove();
    }

    // cancel loading of lightbox
    $this.on('load_lightbox_cancel.pho', restore_loading_image );

    // show lightbox when it's loaded
    $this.on('load_lightbox_end.pho', function(e) {
        // remember the scroll position for later
        restore['scrollTop'] = $(window).scrollTop();
        // Hide the scrollbar without any content jumping around
        var width_with_scrollbar = $(window).width();
        $('body, html').css({'overflow': 'hidden'});
        $( Frame.select() ).css({'width': width_with_scrollbar/$(window).width()*100+'%'});

        restore_loading_image.call(this, e);

        // unhide image
        lightbox.get_img().attr('src', e.img.attr('src') ).show();
        // show lightbox
        tram(this).set({'background': e.image.element().css('background-color'), 'top': restore['scrollTop']  })
        .start({'opacity':1}).then( function() {
            tram(lightbox.navigate.get_close()).start({'opacity': 0.3}).wait(921).then({'opacity': 0});
            // put lightbox to top (after having full opacity), because mobile would allow to scroll up otherwise
            tram(lightbox.element()).set({'top': 0});

            var frame_container = frameContainer.element();
            restore['frame_container_display'] = frame_container.css('display');
            // hide container, because mobile will not care about the 'overflow hidden' of the body.
            frame_container.css({'display': 'none'});
        });
    })

    // hide lightbox
    $this.on('hide_lightbox.pho', function() {
        // restore frames
        frameContainer.element().css({ 'display': restore.frame_container_display });
        tram(window).set({ 'scrollTop': restore.scrollTop });
        tram(this).set({ 'top': restore.scrollTop });

        // fade out lightbox, and remove image
        tram(this).start({'opacity':0}).then(function() {
            this.set({'display':'none'});
            $(this).find('img').attr('src', '');

            //re-enable scrollbar
            $('body, html').css({'overflow': ''});
            $( Frame.select() ).css({ 'width': '100%' });
        });
    });

    var loader_container = $('<div class="loader_container"><div class="loader"></div></div>');

    // transition when moving to next/prev image in lightbox
    $this.on('move_lightbox_start.pho', function(e) {
        // the old image
        var img = lightbox.get_img();

        // cloning current image
        var ghost = img.clone();
        img.after(
            // force positioning above original image
            ghost.css({'position':'absolute'})
                 .offset( img.offset() )
        )
        // remove attribute after insert (removing it before didn't work)
        ghost.removeAttr('id');

        // reset img
        img.tram().set({'opacity':0}); //FIX: when setting `img.attr('src','')` the transition may be skipped
        loader_container.tram().set({'opacity':1});
        img.after( loader_container );
        ghost.tram().add('left 0.476s ease-out').start({'left': (e.to=='prev'?1:-1)*$this.width()}).then(function() { ghost.remove(); });
        img.add( loader_container )
              .css({'position':'relative'})
              .tram().set({'left':img.offset().left - (e.to=='prev'?1:-1)*$this.width()})
              .add('left 0.476s ease-out').start({'left':0});
    });

    // transition to another image in the lightbox
    $this.on('move_lightbox_end.pho', function(e) {
        // fade background color of lightbox
        tram(this).start({'background': e.image.element().css('background-color'), 'top':0});
        // fade in new image
        lightbox.get_img().attr('src', e.img.attr('src') )
                .tram().add('opacity 0.176s ease-out').set({'opacity':0, 'display':'block'}).start({'opacity':1});
        // remove old image and loader
        loader_container.tram().add('opacity 0.276s ease-in-out 0.112s').start({'opacity':0})
                        .then(function() { loader_container.remove(); });
    });

    // load caption of lightbox
    $this.on('lightbox_caption_load.pho', function(e) {
        if( e.text == '' ) {
            // if there is no caption, hide it
            lightbox.get_caption().hide();
        } else {
            // find background-color and make it transparent (0.5)
            var c = getColor(e.background);
            var color = 'rgba('+ c.r +','+ c.g +','+ c.b +',0.5)';
            // display captions
            lightbox.get_caption().show()
                .text( e.text ).css({'color': e.color , 'background-color': color });
        }
    });
});


// init when frameContainer is ready
$(document).on('init_frameContainer.pho', function() {
    var last_focus;

    function update_tabindex() {
        $( Image.select() ).each(function( i ) {
            $(this).attr('tabindex', i+1);
        });
        if( last_focus && frameContainer.get_current_frame().element().find(last_focus).length != 0 ) {
            last_focus.focus();
        }
    }
    update_tabindex();
    
    // keep track of focused image
    $('body').on('keyup', Image.select(), function(e) {
        var keyCode = e.keyCode || e.which;
        if( keyCode == 9 ) { //Tab key
            last_focus = $(':focus');
        }
    });
    
    frameContainer.on_frame_added(function() {
        // position of current frame before sorting the frames
        var top_before = frameContainer.get_current_frame().element().offset().top;

        // sort frames
        sortFrames();

        // position of current frame after sorting the frames
        var top_after = frameContainer.get_current_frame().element().offset().top;
        scroll.delta( top_after - top_before );
        
        update_tabindex();
    });

    // move frame to next/prev
    frameContainer.element().on('move_prev.pho move_next.pho',function(e) {
        var element = e.to.element();

        scroll.unfollow();
        // animate
        if( !e.quiet ) {
            scroll.to( element );
        }
    })
});
