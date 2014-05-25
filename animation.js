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

$(function() {
    // initialize navigation animation
    $('div.navigator').css({ opacity: 0 }).hover( function() {
        tram(this).start({'opacity': 0.3 }).wait(4764).then({'opacity': 0 });
    }, function() {
        tram(this).start({'opacity': 0 })
    }).tram().add('opacity 0.312s ease-in-out');

    //only show navigation arrows on mousemove
    // do the same for the close icon in the lightbox
    var autohidden = tram($('div.arrow, #close')).set({ 'opacity': 0, 'display': 'block' }).add('opacity 0.276s ease-in-out');
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
    // do not hide arrows, if mouse is hovering the navigator area
    $('div.navigator').hover( function() {
        //disable hiding after mousemove
        $('body').off('mousemove', arrow_hider);
        clearTimeout(arrow_timer);
        autohidden.start({'opacity': 0.8 }).wait(4764).then({'opacity': 0 });
    }, function() {
        //reenable hiding after mousemove
        $('body').one('mousemove', arrow_hider);
    })

    var the_lightbox = $('div#lightbox');

    tram(the_lightbox).add('opacity 0.412s ease-in-out')
                      .add('background 0.176s ease-in-out');

    // while lightbox is loading
    the_lightbox.on('load_lightbox_start.pho', function(e) {
        // highlight image and show loader on it
        loader = $('<div class="loader">');
        e.image.tram().add('opacity 0.7s ease-out').start({'opacity': 0.6 });
        e.image.prepend(loader);
        tram(loader).add('opacity 0.7s ease-out').set({'opacity': 0 }).start({'opacity': 0.6 })
        // overlay: invisible lightbox
        tram($('div#lightbox')).set({'opacity':0, 'display':'block'})
    });

    // restore image, that has/should have been loaded
    var restore_loading_image = function() {
        // make opaque remove loader
        $('.image').tram(function() {
            this.set({'opacity':1})
        })
        .find('.loader:first').remove();
    }

    // cancel loading of lightbox
    the_lightbox.on('load_lightbox_cancel.pho', restore_loading_image );

    // show lightbox when it's loaded
    the_lightbox.on('load_lightbox_end.pho', function(e) {
        restore_loading_image.apply(this)

        // unhide image
        $('img#lightbox_img').show();
        // show lightbox
        tram($('div#lightbox')).set({'background': e.image.css('background-color') })
        .start({'opacity':1}).then( function() {
            tram($('#close')).start({'opacity': 0.3}).wait(921).then({'opacity': 0});
        });
    })

    // hide lightbox
    the_lightbox.on('hide_lightbox.pho', function() {
        // hide close button
        //--$('#close').hide();
        // fade out lightbox, and remove image
        var lightbox = $('div#lightbox')
        tram(lightbox).start({'opacity':0}).then(function() {
            this.set({'display':'none'});
            $('div#lightbox img').attr('src', '');
        });
    });

    // transition when moving to next/prev image in lightbox
    the_lightbox.on('move_lightbox_start.pho', function(e) {
        // the old image
        var img = $(this).find('img#lightbox_img');

        //show loader
        loader = $('<div class="loader_container"><div class="loader"></div>');
        loader.tram().add('opacity 0.276s ease-in-out 0.112s').set({'opacity':0});
        img.after( loader );
        loader.tram().start({'opacity':0.6})


        // create ghost overlay
        // cloning current image
        new_img = img.clone();
        img.after(
            // force positioning above original image
            new_img.css({'position':'absolute'})
                 .addClass('ghost')
                 .offset( img.offset() )
        )
        // remove attribute after insert (removing it before didn't work)
        new_img.removeAttr('id');
    });

    // transition to another image in the lightbox
    the_lightbox.on('move_lightbox_end.pho', function(e) {
        // fade background color of lightbox
        tram($('div#lightbox')).start({'background': e.image.css('background-color'), 'top':0})
        // fade in new image
        tram($('img#lightbox_img')).add('opacity 0.176s ease-out').set({'opacity':0, 'display':'block'}).start({'opacity':1});
        // fade out old image
        tram($('img.ghost, .loader_container')).add('opacity 0.176s ease-out').start({'opacity':0}).then(function() {
            $(this.el).remove();
        });
    });

    // show caption
    $('body').on('show_caption.pho', '.image', function() {
        $(this).find('.caption').tram().add('opacity 0.321s ease-in-out').start({'opacity': 0.5});
    });

    // hide caption
    $('body').on('hide_caption.pho', '.image', function() {
        $(this).find('.caption').tram().start({'opacity':0});
    });

    // set scrollTop animation
    var html_body = $('body, html'); //body for chrome, html for firefox
    tram(html_body).add('scroll-top 0.761s ease-out')
    html_body.attr('style',''); // workaround: remove style applied by tram (would hide the entire body)

    // move frame to left
    $('#frame_container').on('move_left.pho',function(e) {
        // animate
        tram(e.current).add('left 0.761s ease-out').start({'left':'100%'}).then(function() {
            this.set({'display': 'none'});
        })
        var frame_element = e.current.prev();
        tram(frame_element).add('left 0.761s ease-out').set({'left':'-100%', 'display':'block'}).start({'left':'0%'}).then(function() {
            frame_element.focus();
        });

        //copy background color
        var color = frame_element.children('div.viewer').css('background-color');
        frame_element.css({'background-color':color});

        tram($('body, html')).start({'scrollTop': 0});
    })

    // move frame to right
    $('#frame_container').on('move_right.pho',function(e) {
        // animate
        tram(e.current).add('left 0.761s ease-out').start({'left':'-100%'}).then(function() {
            this.set({'display': 'none'});
        })
        var frame_element = e.current.next();
        tram(frame_element).add('left 0.761s ease-out').set({'left':'100%', 'display':'block'}).start({'left':'0%'}).then(function() {
            frame_element.focus();
        });

        //copy background color
        var color = frame_element.children('div.viewer').css('background-color');
        frame_element.css({'background-color':color});

        tram($('body, html')).start({'scrollTop': 0});
    });

    // show/hide touch_footer
    $('#touch_footer').on('show_touch_footer.pho', function() {
        tram(this).set({'opacity':0, 'display':'block'}).start({'opacity':0.7});
        window.setTimeout(function() {
            navigate._touch_footer(false);
        }, 3000);
    })
    .on('hide_touch_footer.pho', function() {
        tram(this).start({'opacity':0}).then({'display':'none'});
    })
    .tram().add('opacity 0.161s ease-in')
});
