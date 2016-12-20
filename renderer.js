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
});