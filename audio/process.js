/*********************************************************************************
*     File Name           :     process.js
*     Created By          :     shanzi
*     Creation Date       :     [2013-04-10 23:50]
*     Last Modified       :     [2013-04-10 23:55]
*     Description         :      
**********************************************************************************/

require("./me.js")
require("./projects.js")
require("./contacts.js")

for(var k in WAVEDATA){
    var kv = WAVEDATA[k];
    for(var i in kv){
        kv[i] = kv[i]*2;
    }
}

console.log("WAVEDATA=",WAVEDATA);

