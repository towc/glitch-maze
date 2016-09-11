var s = c.width = c.height = 512,
    ctx = c.getContext( '2d' ),

    // cell state flags
    EMPTY = 0,
    WALL = 1,
    END = 2,

    chars = '1234567890=qwertyuiop[]asdfghjkl;\'#zxcvbnm,./`¬!"£$%^&*()_+QWERTYUIOP{}ASDFGHJKL:@~|ZXCVBNM<>?"',

    game = {},
    temp = {};

game.levelNum = game.highestLevel = +localStorage.levelNum || 0;
game.level = [];
    
function genLevel(){
  
  game.level = [];

  var size = Math.pow( 2, game.levelNum / 2 + 3 ) |0;
  if( size % 2 === 0 )
    size += 1;

  for( var x = 0; x < size; ++x ){

    game.level.push( [] );
    for( var y = 0; y < size; ++y ){
      
      game.level[x].push( WALL );
    }
  }

  // depth first algorithm
  // using strings so I can have a simple .indexOf rather than manually checking every coordinate object
  var stack = [[1,1]],
      checked = ["1,1"],
      conquered = 1;

  game.level[1][1] = EMPTY;

  temp.stack = stack;
  temp.maxStackLength = 1;
  temp.farthest = [1,1];
  temp.checked = checked;
  temp.conquered = conquered;
  temp.toConquer = (size-1)*(size-1)/4;
  temp.size = size;

  // stopping the generation every so often to have time to show a progress bar without needing a web worker
  temp.levelGenInterval = window.setInterval( function(){
    
    var stack = temp.stack,
        checked = temp.checked,
        conquered = temp.conquered,
        done = false,
        head = stack[ stack.length - 1 ];

    for( var i = 0; i < 2000; ++i ){

      var possibilities = [
        checkLevelGenFrom( head, -2, 0 ),
        checkLevelGenFrom( head, +2, 0 ),
        checkLevelGenFrom( head, 0, -2 ),
        checkLevelGenFrom( head, 0, +2 )
      ].filter( Boolean ); // if undefined is returned, remove from array, so you can choose evenly between possibilities

      if( possibilities.length > 0 ){
        
        var next = possibilities[ Math.random() * possibilities.length |0 ],
            nx = head[ 0 ] + next[ 0 ],
            ny = head[ 1 ] + next[ 1 ];

        game.level[ nx ][ ny ] = EMPTY;
        game.level[ head[ 0 ] + next[ 0 ]/2 ][ head[ 1 ] + next[ 1 ]/2 ] = EMPTY;

        stack.push( [ nx, ny ] );
        checked.push( nx + ',' + ny );

        if( stack.length > temp.maxStackLength ){
          
          temp.maxStackLength = stack.length
          temp.farthest = [ nx, ny ];
        }

        head[ 0 ] = nx;
        head[ 1 ] = ny;

        ++conquered;

      } else {
       
        if( stack.length === 1 ){
          done = true;
          break;
        } 
        stack.pop();
        head = stack[ stack.length - 1 ];
      }
      
    }

    temp.stack = stack;
    temp.checked = checked;
    temp.conquered = conquered;
   
    displayLevelProgress( conquered );
    
    if( done ){
 
      window.clearInterval( temp.levelGenInterval );
 
      // set up the end point
      game.level[1][1] = END;
 
      onLevelGenDone();
 
    }

  }, 16 );
}
function checkLevelGenFrom( head, dx, dy ){
  
  var x = head[ 0 ] + dx,
      y = head[ 1 ] + dy;

  if( x < 0 || y < 0 || x >= temp.size || y >= temp.size )
    return void(0);

  var str = x + ',' + y;
  if( temp.checked.indexOf( str ) === -1 )
    return [ dx, dy ]
}
game.levelText = [
  'wasd hjkl ←↑↓→',
  'reach top left',
  'tap space for breakpoints',
  'P or M for menu',
  'always at farthest point',
  'faster → smaller chars',
  'size is 2^(level/2+3)+1',
  'lots of time to waste?',
  'you\'re mental',
  'don\'t you have a life?',
]
function displayLevelProgress( conquered ){
  
  ctx.fillStyle = '#111';
  ctx.fillRect( 128, 192, 256, 128 );

  ctx.font = '20px monospace';
  ctx.fillStyle = '#eee';

  var proportion = conquered / temp.toConquer;

  var text = 'level ' + game.levelNum + ' gen',
      len = ctx.measureText( text ).width;

  ctx.fillText( text, 256 - len / 2, 220 );

  ctx.fillStyle = '#2a4';
  ctx.fillRect( 150, 240, proportion * 212 |0, 32 );
  
  ctx.fillStyle = '#eee';
  ctx.font = '25px monospace';
  var text = ( proportion * 100 |0 ) + '%',
      len = ctx.measureText( text ).width;

  ctx.fillText( text, 256 - len / 2, 265 );

  ctx.font = '14px monospace';
  var text = game.levelText[ game.levelNum ],
      len = ctx.measureText( text ).width;

  ctx.fillText( text, 256 - len / 2, 300 );

}
function onLevelGenDone(){

  game.player.x = temp.farthest[ 0 ];
  game.player.y = temp.farthest[ 1 ];
  game.player.ox = .5;
  game.player.oy = .5;

  game.player.breakpointNum = ( game.levelNum + 1 ) * 2;
  game.player.breakpoints.length = 0;
  
  game.levelBeginTime = new Date();

  // give enough time to read the text
  anim();
}

game.touchStartX = window.innerWidth / 2;
game.touchStartY = window.innerHeight / 2;

window.addEventListener( 'touchstart', function(){ game.fingerDown = true; });
window.addEventListener( 'touchstart', manageTouch );
window.addEventListener( 'touchmove', manageTouch );
function manageTouch( e ){

  if( !game.fingerDown )
    return 0;
  
  var dx = e.touches[ 0 ].clientX - game.touchStartX,
      dy = e.touches[ 0 ].clientY - game.touchStartY;

  game.touchStartX = e.touches[ 0 ].clientX;
  game.touchStartY = e.touches[ 0 ].clientY;

  if( Math.abs( dx ) > 2 && Math.abs( dy ) > 2 ){

    //game.controls.pressed[ 4 ] = dx*dx + dy*dy < 900; // breakpoint
    game.controls.pressed[ 0 ] = dy < dx && dy < -dx; // up
    game.controls.pressed[ 1 ] = dy > dx && dy < -dx; // left
    game.controls.pressed[ 2 ] = dy > dx && dy > -dx; // down
    game.controls.pressed[ 3 ] = dy < dx && dy > -dx; // right

  }
};
function manageMouse( e ){
  
  if( !game.fingerDown )
    return 0;

  var dx = e.clientX - game.touchStartX,
      dy = e.clientY - game.touchStartY;

  game.touchStartX = e.clientX;
  game.touchStartY = e.clientY;

  if( Math.abs( dx ) > 2 && Math.abs( dy ) > 2 ){

    //game.controls.pressed[ 4 ] = dx*dx + dy*dy < 900; // breakpoint
    game.controls.pressed[ 0 ] = dy < dx && dy < -dx; // up
    game.controls.pressed[ 1 ] = dy > dx && dy < -dx; // left
    game.controls.pressed[ 2 ] = dy > dx && dy > -dx; // down
    game.controls.pressed[ 3 ] = dy < dx && dy > -dx; // right

  }
}
window.addEventListener( 'touchend', function(){

  game.fingerDown = false;

  game.touchStartX = window.innerWidth / 2;
  game.touchStartY = window.innerHeight / 2;
  
  for( var i = 0; i < game.controls.pressed.length; ++i )
    game.controls.pressed[ i ] = false;
});
window.addEventListener( 'mousedown', function(){ game.fingerDown = true; });
window.addEventListener( 'mousedown', manageMouse );
window.addEventListener( 'mousemove', manageMouse );
window.addEventListener( 'mouseup', function(){

  game.fingerDown = false;

  game.touchStartX = window.innerWidth / 2;
  game.touchStartY = window.innerHeight / 2;
  
  for( var i = 0; i < game.controls.pressed.length; ++i )
    game.controls.pressed[ i ] = false;
})
game.player = {
  x: 1,
  y: 1,

  ox: .5, // offset x
  oy: .5,

  vx: 0,
  vy: 0,

  ax: 0,
  ay: 0,

  mx: .6, // to multiply speed, kinda like an opposite of friction, but easier to keep track of
  my: .6,

  acc: .1,
  maxSpeed: .4, 

  tick: 0,

  breakpoints: [],
  ticksSinceLastBreakpoint: 0,

  ticksSinceLastMenuAction: 0,
  menuOpen: true,
}
game.screen = {
  x: 1.5,
  y: 1.5
}
game.controls = {
  pressed: [
    false, // up
    false, // left
    false, // down
    false, // right
    false, // breadcrumb
    false, // menu
  ],
  keyCodes: [
    [ 75, 38, 87 ],
    [ 72, 37, 65 ],
    [ 74, 40, 83 ],
    [ 76, 39, 68 ],
    [ 32, 13 ],
    [ 80, 77 ]
  ]
}
window.addEventListener( 'keydown', function( e ){

  var prevent = false;
  for( var i = 0; i < game.controls.keyCodes.length; ++i ){
    
    if( game.controls.keyCodes[ i ].indexOf( e.keyCode ) > -1 )
      game.controls.pressed[ i ] = true;
  }
});
window.addEventListener( 'keyup', function( e ){

  var prevent = false;
  for( var i = 0; i < game.controls.keyCodes.length; ++i ){
    
    if( game.controls.keyCodes[ i ].indexOf( e.keyCode ) > -1 )
      game.controls.pressed[ i ] = false;
  }
});
function anim(){

  game.state = 'anim';

  ++game.player.tick;
  ++game.player.ticksSinceLastBreakpoint;

  var animDone = false;

  ctx.fillStyle = 'rgba(0,0,0,.2)';
  ctx.fillRect( 0, 0, s, s );

  var size = game.level.length

  if( game.levelNum < 4 ){ // 2^(x/2+3) = log2(512/16) when x = 4, so whole map can fit in screen as long as the level is below 4
    
    game.screen.x = game.screen.y = size / 2;
  
  } else {
  
    game.screen.x -= ( game.screen.x - game.player.x - game.player.ox ) / 20;
    game.screen.y -= ( game.screen.y - game.player.y - game.player.oy ) / 20;
  
  }

  // player movement
  
  if( game.controls.pressed[ 4 ] && game.player.breakpoints.length < game.player.breakpointNum && game.player.ticksSinceLastBreakpoint > 30 ){
    game.player.ticksSinceLastBreakpoint = 0;
    game.player.breakpoints.push( { x: game.player.x, y: game.player.y } );
  }

  game.player.ax = ( game.controls.pressed[ 3 ] - game.controls.pressed[ 1 ] ) * game.player.acc;
  game.player.ay = ( game.controls.pressed[ 2 ] - game.controls.pressed[ 0 ] ) * game.player.acc;

  game.player.vx += game.player.ax;
  if( Math.abs( game.player.vx ) > game.player.maxSpeed )
    game.player.vx = game.player.maxSpeed * Math.sign( game.player.vx );

  game.player.vy += game.player.ay;
  if( Math.abs( game.player.vy ) > game.player.maxSpeed )
    game.player.vy = game.player.maxSpeed * Math.sign( game.player.vx );

  game.player.ox += game.player.vx;
  game.player.oy += game.player.vy;

  game.player.vx *= game.player.mx;
  game.player.vy *= game.player.my;

  if( game.player.ox > 1 ){
    switch( game.level[ game.player.x + 1 ][ game.player.y ] ){
      case EMPTY:
        game.player.x += 1;
        game.player.ox -= 1;
        break;
      case WALL:
        game.player.ox = 1;
        break;
      case END:
        animDone = true;
    }
  }
  if( game.player.ox < 0 ){
    switch( game.level[ game.player.x - 1 ][ game.player.y ] ){
      case EMPTY:
        game.player.x += -1;
        game.player.ox -= -1;
        break;
      case WALL:
        game.player.ox = 0;
        break;
      case END:
        animDone = true;
    }
  }
  if( game.player.oy > 1 ){
    switch( game.level[ game.player.x ][ game.player.y + 1 ] ){
      case EMPTY:
        game.player.y += 1;
        game.player.oy -= 1;
        break;
      case WALL:
        game.player.oy = 1;
        break;
      case END:
        animDone = true;    
    }
  }
  if( game.player.oy < 0 ){
    switch( game.level[ game.player.x ][ game.player.y - 1 ] ){
      case EMPTY:
        game.player.y += -1;
        game.player.oy -= -1;
        break;
      case WALL:
        game.player.oy = 0;
        break;
      case END:
        animDone = true;
    }
  }

  var fx = game.screen.x - 16 |0, // 16 = 512/2 / 16
      fy = game.screen.y - 16 |0,

      tx = game.screen.x - fx - size / 2 + 1,
      ty = game.screen.y - fy - size / 2 + 1;

  if( game.levelNum >= 4 ){
    tx = -game.screen.x + 17;
    ty = -game.screen.y + 17;
  }

  if( game.player.tick < 120 ){

    ctx.font = game.player.tick / 120 * 16 + 'px monospace'; 
  
  } else ctx.font = Math.min( .3 + .7 * ( ( game.player.maxSpeed - ( Math.abs( game.player.vx ) + Math.abs( game.player.vy ) ) ) / game.player.maxSpeed ), .75 + ( game.player.tick % 60 ) / 240 ) * 16 + 'px monospace';
  
  for( var x = Math.max( fx, 0 ); x < Math.min( fx + 32, size ); ++x ){
    
    for( var y = Math.max( fy, 0 ); y < Math.min( fy + 32, size); ++y ){
      
      if( game.level[ x ][ y ] === WALL && Math.random() < .3 ){
        ctx.fillStyle = 'hsla(' + ( ( x + y ) * 3 + game.player.tick ) + ',80%,50%,1)';
        ctx.fillText( chars[ Math.random() * chars.length |0 ], ( tx + x ) * 16, ( ty + y ) * 16 );
      }
    }
  }

  ctx.fillStyle = '#ccc';
  ctx.fillText( chars[ Math.random() * chars.length |0 ], ( tx + 1 ) * 16, ( ty + 1 ) * 16 );

  ctx.font = '8px monospace';
  ctx.fillStyle = '#fff';
  ctx.fillText( chars[ Math.random() * chars.length |0 ], ( tx - .5 + game.player.x + game.player.ox ) * 16, ( ty - .5 + game.player.y + game.player.oy ) * 16 );

  ctx.fillStyle = '#888';
  for( var i = 0; i < game.player.breakpoints.length; ++i )
    ctx.fillText( chars[ Math.random() * chars.length |0 ], ( tx + game.player.breakpoints[ i ].x ) * 16, ( ty + game.player.breakpoints[ i ].y ) * 16 );

  if( game.controls.pressed[ 5 ] ){
    
    animDone = true;
    openMenu( false );
  
  } else if( !animDone ){
    window.requestAnimationFrame( anim );
  
  } else { 
    openMenu( true );
  }

  ctx.fillStyle = '#aaa';
  ctx.font = '16px monospace';
  var text = 'breakpoints: ' + ( game.player.breakpointNum - game.player.breakpoints.length ) + ';';

  ctx.fillText( text, 20 + Math.random() * 2, 490 + Math.random() * 2 );

  var date = (new Date((new Date) - game.levelBeginTime)),
      minutes = '' + date.getMinutes(),
      seconds = '' + date.getSeconds();

  if( minutes.length === 1 )
    minutes = '0' + minutes;
  if( seconds.length === 1 )
    seconds = '0' + seconds;

  var text = 'time: ' + minutes + '.' + seconds + ';';
  ctx.fillText( text, 20 + Math.random() * 2, 470 + Math.random() * 2 );
}

game.glitchSchema = [
  '111 1 x  1     1  ',
  '1   1   111 11 111',
  '1 1 1 1  1  1  1 1',
  '111 1 1  11 11 1 1',
];

game.menuTick = 0;

game.state = 'menu';
game.ticksSinceMenuInteraction = 0;
function openMenu( addLevel ){
  
  game.state = 'menu';
  ++game.ticksSinceMenuInteraction;
  ++game.menuTick;

  var menuDone = false;

  if( addLevel ){
    ++game.levelNum;
    if( game.levelNum > game.highestLevel ){
      game.highestLevel = game.levelNum;
      localStorage.levelNum = game.levelNum;
    }
  }

  ctx.fillStyle = 'rgba(0,0,0,.1)';
  ctx.fillRect( 0, 0, s, s );


  ctx.font = '16px monospace';
  var tx = 256 - game.glitchSchema[0].length * 16 / 2,
      ty = 100;

  for( var y = 0; y < game.glitchSchema.length; ++y ){
    
    for( var x = 0; x < game.glitchSchema[0].length; ++x ){
      
      if( game.glitchSchema[ y ][ x ] !== ' ' && Math.random() < .4 ){
        ctx.fillStyle = game.glitchSchema[ y ][ x ] === 'x' ? '#eee' : 'hsl(' + ( ( x + y ) * 4 + game.menuTick  ) + ',80%,50%)';
        ctx.fillText( chars[ Math.random() * chars.length |0 ], tx + x * 16, ty + y * 16 );
      }
    }
  }

  if( game.ticksSinceMenuInteraction > 10 ){
    
    var resetTick = true;

    if( game.controls.pressed[ 1 ] && game.levelNum > 0 ){
      --game.levelNum;
    
    } else if( game.controls.pressed[ 3 ] && game.levelNum < game.highestLevel ){
      ++game.levelNum;
    
    } else if( game.controls.pressed[ 0 ] || game.controls.pressed[ 2 ] || game.controls.pressed[ 4 ] || game.controls.pressed[ 5 ] ){
      menuDone = true;
      genLevel();
      

    } else resetTick = false;

    if( resetTick ){
      game.ticksSinceMenuInteraction = 0;
    }
  }

  var rand1 = Math.random() * 2,
      rand2 = Math.random() * 2;

  ctx.fillStyle = '#eee';
  ctx.font = '60px monospace';
  var len = ctx.measureText( game.levelNum ).width;
  ctx.fillText( game.levelNum, 256 - len / 2 + rand1, 265 + rand2 );

  ctx.font = '20px monospace';
  var len = ctx.measureText( game.levelText[ game.levelNum ] ).width;
  ctx.fillText( game.levelText[ game.levelNum ], 256 - len / 2 + rand1, 320 + rand2 );
 
  ctx.fillStyle = '#888';
  ctx.font = '16px monospace'; 
  ctx.fillText( '@MateiCopot', 235 + Math.random() * 2, 410 + Math.random() * 2 );
  ctx.fillText( '/towc.eu', 235 + Math.random() * 2, 440 + Math.random() * 2 );
  ctx.fillText( 'matei@copot.eu', 235 + Math.random() * 2, 380 + Math.random() * 2 );

  ctx.fillStyle = game.levelNum > 0 ? '#aaa' : '#333';
  ctx.beginPath();
  ctx.moveTo( 100,  243 );
  ctx.lineTo( 120, 223 );
  ctx.lineTo( 120, 263 );
  ctx.fill();

  ctx.fillStyle = game.levelNum < game.highestLevel ? '#aaa' : '#333';
  ctx.beginPath();
  ctx.moveTo( 412, 243 );
  ctx.lineTo( 392, 223 );
  ctx.lineTo( 392, 263 );
  ctx.fill();

  ctx.fillStyle = '#89e';
  ctx.fillText( 't', 180 + Math.random() * 2, 410 + Math.random() * 2 );

  ctx.fillStyle = '#45a';
  ctx.fillText( 'f', 180 + Math.random() * 2, 440 + Math.random() * 2 );

  ctx.fillStyle = '#a45';
  ctx.fillText( 'm', 180 + Math.random() * 2, 380 + Math.random() * 2 );


  if( !menuDone ){
    
    window.requestAnimationFrame( function(){openMenu()} );
  }
}

openMenu();

// audio

var t0 = new Date,
    player = new CPlayer;

player.init(song);
player.generate();

var wave = player.createWave(),
   audio = document.createElement('audio');

audio.src = URL.createObjectURL(new Blob([wave], {type: "audio/wav"}));
audio.play();
audio.loop=true;

// favicon
var favicon = document.createElement( 'canvas' );
favicon.width = favicon.height = 16;
var favCtx = favicon.getContext( '2d' );
for( var x = 0; x < 16; ++x ){
  
  for( var y = 0; y < 16; ++y ){
    
    if( Math.random() < .5 ){
      favCtx.fillStyle = 'hsl(' + ( ( x + y ) * 360 / 16 ) + ',60%,50%)';
      favCtx.fillRect( x, y, 1, 1 );
    }
  }
}
var link = document.createElement( 'link' );
link.type = 'image/x-icon';
link.rel = 'shortcut icon';
link.href = favicon.toDataURL('image/x-icon');
document.getElementsByTagName('head')[0].appendChild(link);
