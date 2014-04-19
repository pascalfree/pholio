//add methode to pulsate
jQuery.fn.pulse = function ( condition, speed ) {
  if( !condition() ) { return; } //check condition first
  $(this).fadeTo( speed, 0.5 ).fadeIn( speed, function() {
    $(this).pulse( condition, speed ); //recursive call
  })
  if( !condition() ) { $(this).stop(true).css({'opacity':'1'}); } // abort if condition becomes false
}

$(function() {
  // initialize navigation animation
  $('div.navigator').css({ opacity: 0 }).hover( function() {
    $(this).animate({'opacity': 0.3 });
  }, function() {
    $(this).animate({'opacity': 0 });
  })
  
    //only show navigation arrows on mousemove
    // do the same for the close icon in the lightbox
    var autohidden = $('div.arrow, #close');
    autohidden.css({ opacity: 0 })
    var arrow_timer;
    var arrow_hider = function() {
        // show arrows (stop hiding animation first)
        autohidden.stop(true).animate({'opacity': 1 });
        // hide arrows after delay, unless mouse is still moving
        // in that case start this function again
        arrow_timer = setTimeout(function() {
            $('body').one('mousemove', arrow_hider);
            autohidden.animate({'opacity': 0 });
        }, 1764) // 1.764 second delay (why not?)
    }
    $('body').one('mousemove', arrow_hider)
    // do not hide arrows, if mouse is hovering the navigator area
    $('div.navigator').hover( function() {
        //disable hiding after mousemove
        $('body').off('mousemove', arrow_hider);
        clearTimeout(arrow_timer);
    }, function() {
        //reenable hiding after mousemove
        $('body').one('mousemove', arrow_hider);
    })

  // pulse image while lightbox is loading
  $('div#lightbox').on('load_lightbox_start.pho', function(e) {
    // highlight image and show loader on it
    loader = $('<div class="loader">').hide();
    e.image.fadeTo( 'slow', 0.6 )
           .prepend(loader.fadeTo('slow', 0.6))
  });
  
  // show lightbox when it's loaded
  $('div#lightbox').on('load_lightbox_end.pho', function() {
    // make opaque remove loader
    $('.image').stop(true).css({'opacity':'1'})
        .find('.loader:first').remove();
   
    // try full screen
    var lb = $('div#lightbox').get(0);
    if( lb.requestFullScreen ) {
      lb.requestFullScreen();
    } else if( lb.mozRequestFullScreen ) {
      lb.mozRequestFullScreen();
    } else if( lb.webkitRequestFullScreen ) {
      lb.webkitRequestFullScreen();
    }

    // unhide image
    $('img#lightbox_img').show();
    // show lightbox
    $('div#lightbox').fadeIn( function() {
      $('#close').fadeIn();
    });
  });
  
    // transition when moving to next/prev image in lightbox
    $('div#lightbox').on('move_lightbox_start.pho', function(e) {
        // the old image
        var img = $(this).find('img#lightbox_img');
    
        //show loader
        loader = $('<div class="loader_container"><div class="loader"></div>').hide();
        img.after( loader.fadeTo('slow', 0.6) );
        
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
    $('div#lightbox').on('move_lightbox_end.pho', function(e) {
        var delay = 300; 
        $('img#lightbox_img').fadeIn( delay );
        // fade out old image
        $('img.ghost, .loader_container').stop(true).fadeOut( delay , function() {
            this.remove();
        });
    });
  
  // hide lightbox
  $('div#lightbox').on('hide_lightbox.pho', function() {
    // hide close button
    $('#close').hide();
    // fade out lightbox, and remove image
    $('div#lightbox').fadeOut(function() {
      $('div#lightbox img').attr('src', '');
    });
    
    // close full screen
    var lb = $('div#lightbox').get(0);
    if( lb.cancelFullscreen ) {
      lb.cancelFullscreen();
    } else if( lb.mozCancelFullscreen ) {
      lb.mozCancelFullscreen();
    } else if( lb.webkitCancelFullscreen ) {
      lb.webkitCancelFullscreen();
    }
  });
  
  // fullscreen
  function do_fullscreen() {
    var lb = $('body').get(0);
    if( lb.requestFullScreen ) {
      lb.requestFullScreen();
    } else if( lb.mozRequestFullScreen ) {
      lb.mozRequestFullScreen();
    } else if( lb.webkitRequestFullScreen ) {
      lb.webkitRequestFullScreen();
    }
  }
  function close_fullscreen() {
    if( document.cancelFullScreen ) {
      document.cancelFullScreen();
    } else if( document.mozCancelFullScreen ) {
      document.mozCancelFullScreen();
    } else if( document.webkitCancelFullScreen ) {
      document.webkitCancelFullScreen();
    }
  }
  //$('#frame_container').get(0).onclick = do_fullscreen
  //$('#lightbox').get(0).onclick = close_fullscreen
  
  // show caption
  $('body').on('show_caption.pho', '.image', function() {
    $(this).find('.caption').stop(false, true).fadeIn();
  });
  
  // hide caption
  $('body').on('hide_caption.pho', '.image', function() {
    $(this).find('.caption').stop().fadeOut();
  });
  
  // move frame to left
  $('#frame_container').on('move_left.pho',function(e) {
    // animate
    var frame_element = e.current.finish().animate({'left':'100%'}, 'slow', function() { 
            $(this).hide();
        })
        .prev().finish().show().animate({'left':'0'}, 'slow');
        
    //copy background color 
    var color = frame_element.children('div.viewer').css('background-color');
    frame_element.css({'background-color':color});
    
    $('body,html,#frame_container').finish().animate({'scrollTop':0}, 'slow'); //body for chrome, html for firefox
  })
  
  // move frame to right
  $('#frame_container').on('move_right.pho',function(e) {
    // animate
    var frame_element = e.current.finish().animate({'left':'-100%'}, 'slow', function() { 
          $(this).hide();
        })
        .next().finish().show().animate({'left':'0'}, 'slow');
    
    //copy background color 
    var color = frame_element.children('div.viewer').css('background-color');
    frame_element.css({'background-color':color});
    
    $('body,html').finish().animate({'scrollTop':0}, 'slow');
  });
  
  // show/hide touch_footer
  $('#touch_footer').on('show_touch_footer.pho', function() {
    $(this).fadeIn();
    window.setTimeout(function() { touch_footer(false) }, 4000);
  })
  .on('hide_touch_footer.pho', function() {
    $(this).fadeOut();
  })
});
