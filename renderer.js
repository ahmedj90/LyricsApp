/*var {ipcRenderer, remote} = require('electron');  
var main = remote.require("./main.js");
*/

const electron = window.require('electron');
const ipcRenderer = electron.ipcRenderer;



// Send async message to main process
//ipcRenderer.send('async', 1);


// Listen for main message
ipcRenderer.on('ping', (event, arg) => {  	
	var x = document.querySelectorAll("#curr_pos");
	x[0].textContent=arg.current_position;

	var z = document.querySelectorAll("#song_name");
	z[0].textContent=arg.track.properties.name;	

	var y = document.querySelectorAll("#line");
	y[0].textContent=arg.line;	

/*  if(track.lyrics.isSet() && track.lyrics.getState() === Enum.lyricsStatus.get('ready')){

		//1-find which line to hgihlight
        if(track.lyrics.getCurrentLineIndex() != null){
			//display line (s) however you want from the lrc array with getCurrentLineIndex to highlight current line.
        }

        //2-display the rest of lines
    }

*/
	
});