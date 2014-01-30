//config
PAGE_FOLDER = 'pages';
DEFAULT_PAGE = 0;

//global vars
FRAME_ELEMENT = '<div class="frame"></div>';
MAX_PAGE = -1;

$(document).ready(init); //initialize when loaded

function init() {
  //initialize onhashchange
  $(window).bind('hashchange', move_by_hash);
  
  //initialize window location hash
  if( !window.location.hash ) { window.location.hash = DEFAULT_PAGE; }  
  var h = parseFloat(window.location.hash.substr(1));

  //initialize lightbox
  $('div#lightbox').css({'opacity':'1'}).hide().click( hide_lightbox );


  //initialize frames
  if( h>0 ) {
    fill_frame( $('.frame:first').attr('id','page'+(h-1)).hide().css({'left':'-100%'}) );
  }
  fill_frame( $('.frame:eq(1)').attr('id','page'+h).css({'left':'0'}) ); //first visible frame
  fill_frame( $('.frame:eq(2)').attr('id','page'+(h+1)).hide().css({'left':'100%'}) );

  //initialize navigation action
  $('div.navigator').css({ opacity: 0 }).hover( function() {
      $(this).animate({'opacity': 0.3 });
    }, function() {
      $(this).animate({'opacity': 0 });
  })
  $('div#navigator_right').click(move_right);
  $('div#navigator_left').click(move_left);
  toggle_navigator();

  //initialize body and html background color
  $('body, html').css({'background-color': $('div.current').css('background-color') });
}

function init_viewer( frame ) {
  //copy background color 
  var color = frame.children('div.viewer').css('background-color');
  frame.css({'background-color':color});

  var images = frame.find('.image');
  //load images
  images.each( function() {
    var img = $(this).attr('alt');
    if( !img ) { img = $(this).attr('id') }
    $(this).append($('<img>')).find('img').attr('src', PAGE_FOLDER+'/'+img);
  });

  //make images clickable
  images.click( show_lightbox );
}

function show_lightbox(e) {
  //load image
  var img = $(this).attr('id');
  $('div#lightbox img').attr('src', PAGE_FOLDER+'/'+img);

  //adjust color /and scroll to top
  var color = $(this).css('background-color');
  $('div#lightbox, body, html').css({'background-color':color}); //.animate({'scrollTop':0}, 'fast');

  e.stopPropagation();
  //$(document).one('click',hide_lightbox);

  //adjust height and fade in
  if( $(window).height() != $(document).height() ) {
    $('div#lightbox').css({'overflow':'hidden'});
  } else {
    $('div#lightbox').css({'overflow':'auto'});
  }

  $('div#lightbox').fadeIn( function() {
    $('body, html, div.current').height( 0 ).css({'overflow-y':'hidden'});
    $(this).css({'overflow':'auto'})
    $('#close').fadeIn();
  }); //height( $(document).height() )
}

function hide_lightbox() {
  $('#close').hide();
  $('body, html, div.current').css({'height':'', 'overflow-y':'auto'});
  $('body, html').css({'background-color': $('div.current').css('background-color') });//.animate({'scrollTop':0}, 'fast');

  //adjust height and fade in
  if( $(window).height() != $(document).height() ) {
    $('div#lightbox').css({'overflow':'hidden'});
  } else {
    $('div#lightbox').css({'overflow':'auto'});
  }

  $('div#lightbox').fadeOut();
  $('div#lightbox img').attr('src', '');
}

function toggle_navigator() {
  //check if navigators should be visible or not
  var page = parseFloat( $('div.current').attr('id').substr(4) );
  var ret = new Array;

  if( MAX_PAGE != -1 && page == MAX_PAGE ) { 
    $('div#navigator_right, div#arrow_right').hide();
    ret[0] = 0;
  } else {
    $('div#navigator_right, div#arrow_right').show();
    ret[0] = 1;
  }

  if( page == 0 ) {
    $('div#navigator_left, div#arrow_left').hide();
    ret[1] = 0;
  } else {
    $('div#navigator_left, div#arrow_left').show();
    ret[1] = 1;
  }

  return ret;
}

function move_by_hash() {
  //move left or right depending on hash value
  var hash = parseFloat( window.location.hash.substr(1) );
  var curr = parseFloat( $('div.current').attr('id').substr(4) );

  hide_lightbox();

  if( hash == curr ) { return; }
  else if( hash == curr+1 ) { move_right(); }
  else if( hash == curr-1 ) { move_left(); }
  else { location.reload(); }
}

function move_right() {
  if( toggle_navigator()[0] == 0 ) { return; } //last element, can't go right
  
  var current = $('div.current');
  //append new frame if this is the last frame.
  if( current.next().is($('.frame:last')) ) {
    fill_frame( $('#frame_container').append(FRAME_ELEMENT).children(':last').css({'left':'100%'}).hide() );
  }

  //set document background
  $('body, html').css({'background-color': current.next().css('background-color'), 'overflow-x':'hidden'});

  //move to right frame
  var current_frame = current.removeClass('current').animate({'left':'-100%'}, function() { 
                        $('body, html').css({'overflow-x':'auto'});
                        $(this).hide() 
                      })
                    .next().show().addClass('current').animate({'left':'0','scrollTop':0});
  $('body, html').animate({'scrollTop':0});

  //update hash
  window.location.hash = parseFloat( current_frame.attr('id').substr(4) );

  toggle_navigator()
}

function move_left() {
  if( toggle_navigator()[1] == 0 ) { return; } // first element, can't go left

  var current = $('div.current');
  //prepend new frame if this is the first frame.
  if( current.prev().is($('.frame:first')) ) {
    fill_frame( $('#frame_container').prepend(FRAME_ELEMENT).children(':first').css({'left':'-100%'}).hide() );
  }
  
  //set document background
  $('body, html').css({'background-color': current.prev().css('background-color') , 'overflow-x':'hidden'});

  //move to right frame
  var current_frame = current.removeClass('current').animate({'left':'100%'}, function() { 
                          $('body, html').css({'overflow-x':'auto'});
                          $(this).hide();
                      })
                      .prev().show().addClass('current').animate({'left':'0','scrollTop':0});
  $('body, html').animate({'scrollTop':0});

  //update hash
  window.location.hash = parseFloat( current_frame.attr('id').substr(4) );

  toggle_navigator();
}

function fill_frame( frame ) {
  //load page and fill into frame
  // find number for new frame
  if( !frame.attr('id') ) {
    if( n = frame.prev().attr('id') ) { n = parseFloat( n.substr(4) ) + 1; }  
    else if( n = frame.next().attr('id') ) { n = parseFloat( n.substr(4) ) - 1 }
    else { return; }
    frame.attr('id','page'+n);
  }

  curr = parseFloat( frame.attr('id').substr(4) );
  if( curr < 0 ) { return; } //don't load pages below 0
  //load and insert page
  frame.load(PAGE_FOLDER+'/'+curr+'.html', function(resp, status) {
    if( status == "error") { //found last page
      MAX_PAGE = (MAX_PAGE==-1)? curr-1 : MAX_PAGE;
      toggle_navigator();
      return;
    }
    init_viewer( frame ); //initialize viewer
  })
}

//next:
/*
- move_left [done]
- Pfeile links und rechts
- template für Fotos
- Ajax um nächste Seite zu laden (statisch html) [done]
- Bild bei klick vergrössern [done]
*/
