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

$(function() {
    var restore = [];

    // initialize navigation animation
    navigate.get().add(lightbox.navigate.get()).css({ opacity: 0 }).hover( function() {
        tram(this).start({'opacity': 0.3 }).wait(4764).then({'opacity': 0 });
    }, function() {
        tram(this).start({'opacity': 0 })
    }).tram().add('opacity 0.312s ease-in-out');

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

    var the_lightbox = lightbox.element();

    tram(the_lightbox).add('opacity 0.412s ease-in-out')
                      .add('background 0.176s ease-in-out');
    tram(lightbox.get_caption()).add('background 0.176s ease-in-out');

    var loader = $('<div class="loader">')

    // while lightbox is loading
    the_lightbox.on('load_lightbox_start.pho', function(e) {
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
    the_lightbox.on('load_lightbox_cancel.pho', restore_loading_image );

    // show lightbox when it's loaded
    the_lightbox.on('load_lightbox_end.pho', function(e) {
        // remember the scroll position for later
        restore['scrollTop'] = $(document).scrollTop();
        // Hide the scrollbar without any content jumping around
        var width_with_scrollbar = $(window).width();
        var frame = frameContainer.get_current_frame().element();
        $('body, html').css({'overflow': 'hidden'});
        frame.css({'width': width_with_scrollbar/$(window).width()*100+'%'});

        restore_loading_image.call(this, e);

        // unhide image
        lightbox.get_img().show();
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
    the_lightbox.on('hide_lightbox.pho', function() {
        // restore frames
        frameContainer.element().css({ 'display': restore.frame_container_display });
        tram(document).set({ 'scrollTop': restore.scrollTop });
        tram(this).set({ 'top': restore.scrollTop });

        // fade out lightbox, and remove image
        tram(this).start({'opacity':0}).then(function() {
            this.set({'display':'none'});
            $(this).find('img').attr('src', '');

            //re-enable scrollbar
            $('body, html').css({'overflow': ''});
            frameContainer.get_current_frame().element().css({ 'width': '100%' });
        });
    });

    var loader_container = $('<div class="loader_container"><div class="loader"></div>');
    var ghost = null;

    // transition when moving to next/prev image in lightbox
    the_lightbox.on('move_lightbox_start.pho', function(e) {
        // the old image
        var img = lightbox.get_img();

        //show loader
        loader_container.tram().add('opacity 0.276s ease-in-out 0.112s').set({'opacity':0});
        img.after( loader_container );
        loader_container.tram().start({'opacity':0.6})

        // create ghost overlay
        // delete old ghost
        if( ghost !== null ) {
            ghost.remove();
        }
        // cloning current image
        ghost = img.clone();
        img.after(
            // force positioning above original image
            ghost.css({'position':'absolute'})
                 .offset( img.offset() )
        )
        // remove attribute after insert (removing it before didn't work)
        ghost.removeAttr('id');
    });

    // transition to another image in the lightbox
    the_lightbox.on('move_lightbox_end.pho', function(e) {
        // fade background color of lightbox
        tram(this).start({'background': e.image.element().css('background-color'), 'top':0})
        // fade in new image
        tram(lightbox.get_img()).add('opacity 0.176s ease-out').set({'opacity':0, 'display':'block'}).start({'opacity':1});
        // fade out old image
        tram(ghost.add(loader_container )).add('opacity 0.176s ease-out').start({'opacity':0}).then(function() {
            $(this.el).remove();
        });
    });

    // load caption of lightbox
    the_lightbox.on('lightbox_caption_load.pho', function(e) {
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

    // show caption
    $('body').on('show_caption.pho', '.caption, .pho-caption', function() {
        $(this).tram().add('opacity 0.321s ease-in-out').start({'opacity': 0.5});
    });

    // hide caption
    $('body').on('hide_caption.pho', '.caption, .pho-caption', function() {
        $(this).tram().start({'opacity':0});
    });

    var flat_loaders = [];

    // start loading an image
    $('body').on('load_image_start.pho', '.image, .pho-image', function(e) {
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
    $('body').on('load_image_end.pho', '.image, .pho-image', function(e) {
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
    });

    // set scrollTop animation
    var html_body = $('body, html'); //body for chrome, html for firefox
    tram(html_body).add('scroll-top 0.561s ease-out')
    html_body.attr('style',''); // workaround: remove style applied by tram (would hide the entire body)

    // move frame to left
    frameContainer.element().on('move_left.pho',function(e) {
        // animate
        tram(e.from.element()).add('left 0.561s ease-out').set({'left':'0%'}).start({'left':'100%'}).then(function() {
            this.set({'display': 'none'});
        })

        //set document background (yes it's necessary!)
        var to = e.to.element();
        $('body, html').css({'background-color': to.css('background-color')});
        tram(to).add('left 0.561s ease-out').set({'left':'-100%', 'display':'block'}).start({'left':'0%'}).then(function() {
            to.focus();
        });

        //copy background color
        var color = to.children('div.viewer').css('background-color');
        to.css({'background-color':color});

        tram($('body, html')).start({'scrollTop': 0});
    })

    // move frame to right
    frameContainer.element().on('move_right.pho',function(e) {
        // animate
        tram(e.from.element()).add('left 0.561s ease-out').set({'left':'0%'}).start({'left':'-100%'}).then(function() {
            this.set({'display': 'none'});
        })

        //set document background (yes it's necessary!)
        var to = e.to.element();
        $('body, html').css({'background-color': to.css('background-color')});
        tram(to).add('left 0.561s ease-out').set({'left':'100%', 'display':'block'}).start({'left':'0%'}).then(function() {
            to.focus();
        });

        //copy background color
        var color = to.children('div.viewer').css('background-color');
        to.css({'background-color':color});

        tram($('body, html')).start({'scrollTop': 0});
    });

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
