const electron = require('electron');
var now = require("performance-now");
var spotify = require('spotify-node-applescript');
var Track = require('js/modules/track.module.js');
var Enum = require('js/modules/common/enums.js');
const ipcMain = electron.ipcMain;
var track = new Track();

// Module to control application life.
const app = electron.app;
// Module to create native browser window.
const BrowserWindow = electron.BrowserWindow;

const path = require('path');
const url = require('url');


// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow

function spotifyPausedEventHandler(){
  console.log("Event: Spotify Paused.");
}

function spotifyStoppedEventHandler(){
  console.log("Event: Spotify Stopped.");
}

function spotifyTrackChangedEventHandler(){
  console.log("Event: Track Changed.");
}

function spotifyTrackPositionChangedEventHandler(current_position){
    current_position = current_position*1000;
    console.log("Event: position changed to: " + current_position);
    
    /*
    This is for testing. Eventaully, we want to send the LRC array and current index to the form event handler and let it deal with how to display
    the lyrics. I don't want to send just a line of text because that's not general and dynamic enough for the forms to do whatever they want.
    */

    if(track.lyrics.getCurrentLineIndex() != null)
      mainWindow.webContents.send('ping', {current_position:current_position, track:track, line: track.lyrics.getCurrentLine() });
    else
      mainWindow.webContents.send('ping', {current_position:current_position, track:track, line:'' });

}

function createWindow(){
  // Create the browser window.
    mainWindow = new BrowserWindow({width: 800, height: 600});

    // and load the index.html of the app.
    mainWindow.loadURL(url.format({
      pathname: path.join(__dirname, 'index.html'),
      protocol: 'file:',
      slashes: true
    }));

    // Open the DevTools.
    mainWindow.webContents.openDevTools();

}

//Fire status events (stopped, paused)
function fireSpotifyEvents(spotifyInstance){  
    if(spotifyInstance && spotifyInstance.state === 'stopped'){
      spotifyStoppedEventHandler();
    }
    else if(spotifyInstance && spotifyInstance.state === 'paused'){
      spotifyPausedEventHandler();
    }
}

//check if track changed and update accordingly
function checkForTrackChange(spotifyInstance, current_spotify_track){
  if(spotifyInstance && (spotifyInstance.state === 'playing' || spotifyInstance.state === 'paused')){
      if(track.isSet() === false || (track.isSet() ===true && current_spotify_track && current_spotify_track.id &&  track.properties.id != current_spotify_track.id)){         
          //re-initalize track to new info:
          track = new Track();
          track.properties = current_spotify_track;

          if(track.isSet())
            track.loadLyrics();
          
          //fire event
          //console.log("New track: ", track);
          spotifyTrackChangedEventHandler();
      }
  }
}

//check for track progress and fire events
function checkForTrackProgressBar(spotifyInstance, current_spotify_track){
  if(spotifyInstance && (spotifyInstance.state === 'playing')){
       //check we have lyrics ready for this trac
       if(spotifyInstance.position && spotifyInstance.position >= 0 && track.lyrics.isSet() && track.lyrics.getState() === Enum.lyricsStatus.get('ready')){
            //update current line index (need to send time in ms)
            track.lyrics.updateCurrentLine(spotifyInstance.position * 1000);
        }

        //fire event
        spotifyTrackPositionChangedEventHandler(spotifyInstance.position);
  }
}

//check for download failure and retry download
function checkForLyricsDownloadFailure(spotifyInstance, current_spotify_track){
  if (track.isSet() && track.lyrics.getState() === Enum.lyricsStatus.get('no-internet') && track.lyrics.getTimeSinceLastDownloadTrial() > 30){
    console.log("Retrying to download lyrics.");

    //download lyrics 
    //track.LoadLyrics();
  }
}

function MonitorSpotify () {
    createWindow();

    (function(){
        // do some stuff
      var execution_start_time = now();

      spotify.isRunning(function(err, isRunning){

          if(isRunning){
               spotify.getState(function(err, spotifyInstance){
                  //make sure we got state object of spotify
                  if(spotifyInstance){
                    spotify.getTrack(function(err, current_spotify_track){

                      //make sure we got some track from spotify
                      if(current_spotify_track && current_spotify_track.id){                          
                          //1-Fire status events
                          fireSpotifyEvents(spotifyInstance);

                          //2-handle track change (handle first time run too)
                          checkForTrackChange(spotifyInstance, current_spotify_track);

                          //3-handle progress of track
                          checkForTrackProgressBar(spotifyInstance, current_spotify_track);

                          //4-handle trying to download lyrics again (when network issue happens for example)
                          checkForLyricsDownloadFailure(spotifyInstance, current_spotify_track);

                      }
                      else{
                         if(err)
                          /*log error: the err is an object=
                          { Error: /Users/Ahmed/Documents/electron_app/electron-quick-start/node_modules/spotify-node-applescript/lib/scripts/get_state.applescript:109:111: execution error: Can’t make id of «class pTrk» of application "Spotify" into type Unicode text. (-1700),
                            exitCode: 1 }
                          */

                        console.log("Error getting spotify track information");
                        //show error message
                        //stop
                      }
                     
                    });

                  
                  }
                  else{
                    if(err)
                      /*log error: the err is an object=
                      { Error: /Users/Ahmed/Documents/electron_app/electron-quick-start/node_modules/spotify-node-applescript/lib/scripts/get_state.applescript:109:111: execution error: Can’t make id of «class pTrk» of application "Spotify" into type Unicode text. (-1700),
                        exitCode: 1 }
                      */

                      /*we get here when:
                          1-Turn off spotify on PC. Run on phone, change track, reopen spotify on PC. spotify shows we're playing on phone we get error here!
                          so it's a spotify thing because it's playing on multiple devices. this is continous error

                          2-When spotify is close and we just open it (while it's loading, we fail to get state and get this error). Same when we close it. this will happen
                          once and state changes to either not running or (player || paused) based on action we took.                                                    
                      */

                    console.log("Make sure spotify is running okay.");
                    //show error message                    
                  }
              });
          }
          else{
            console.log("spotify is not running");
          }
                 
      });


    var execution_end_time = now();
    console.log("Monitor Cycle took " + (execution_end_time - execution_start_time) + " milliseconds to finish executing code.");

    setTimeout(arguments.callee, 1000);
})();

 
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', MonitorSpotify);

// Quit when all windows are closed.
app.on('window-all-closed', function () {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit()
  }
});

app.on('activate', function () {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) {
    MonitorSpotify()
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
