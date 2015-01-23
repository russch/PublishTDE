//modules ==========================================


// Modules for handling xml requests and responses
var jsxml = require("node-jsxml");
var XMLWriter = require('xml-writer');
var request = require("request");
var http = require("http");
var FormData = require('form-data');

// File streaming
var fs = require('fs');

//Variables we'll use throughout the app

// admin username & pw: OF COURSE you won't hard-code these in the real world:
var admin = {username: "admin", password: "adminPassWord"};
//location of the server
var tableauServer = "localhost"; 

//variable to hold auth token of an admin user so we can do stuff easily
var adminAuthToken;


//date and time

var d = new Date();
var n = d.toDateString();
var t = d.toLocaleTimeString();
// Helper functions


// Simple upload of a TDE file < 64MB inline in the request.
var simplePublish = function(callback) {
        //Site ID of your 'REST' site. Lookup with REST API or PGAdmin3                       
        var siteID = '98823511-cfc3-4e24-9790-27e1855fed75';

        //First, build the XML for the POST
        var dsXml = new XMLWriter();
        dsXml.startElement('tsRequest')
                    .startElement('datasource')
                    .writeAttribute('name', 'Some Data Source Name')
                        .startElement('project')
                            // ID of the Default Project in REST site. Lookup with REST API or PGAdmin3
                            .writeAttribute('id', 'a8a1c0c6-0e49-4243-a271-d49f79c7ccdb')
                        .endElement()
                    .endElement()
                .endElement();
        console.log(dsXml.toString());
    
    var CRLF = '\r\n';
    var form = new FormData();


    form.append('request_payload', dsXml.toString(), {contentType: 'text/xml'});
    form.append('tableau_datasource', fs.createReadStream('c:\someFile.tde'),{contentType: 'application/octet-stream'});

    form.submit(
        {
            host: tableauServer,
            //port: 8888, // for proxy
            path: '/api/2.0/sites/' + siteID + '/datasources?overwrite=true',
            //method: 'POST',
            headers: {
                'X-Tableau-Auth': adminAuthToken, 
                'Content-Type': 'multipart/mixed; boundary=' + form.getBoundary()
            }
        }, function(err, res) {
              if (err) throw err;
             console.log(res.statusCode);
             var str = '';
              //another chunk of data has been recieved, so append it to `str`

              res.on('data', function (chunk) {
                str += chunk;
              });

              //the whole response has been recieved, so we just print it out here
              res.on('end', function () {
                console.log(str);

              });

        });
        



    callback(null);   
        
    }

// Get a token for authenticationf createUser requests
var adminLogin = function (callback){
    // Used to login an admin.username 
	var loginxml = new XMLWriter();
	loginxml.startElement('tsRequest').startElement('credentials').writeAttribute('name', admin.username)
		.writeAttribute('password', admin.password).startElement('site').writeAttribute('contentUrl', 'rest');
	request.post( 
		{
			url: "http://" + tableauServer + '/api/2.0/auth/signin',
			body: loginxml.toString(),
			headers: {'Content-Type': 'text/xml'}
		},
        // Callback to handle the response 
		function(err, response, body) {
			if(err) {
				callback(err);
				return;
			} else {
				// In order to grab information from the response, we turn it into an xml object and use a module
				// called node-jsxml to parse the xml. node-jsxml allows us to use child(), attribute(), and some other functions
				// to locate specific elements and pieces of information that we need.
				// Here, we need to grab the 'token' attribute and store it in the session cookie.
				var authXML = new jsxml.XML(body);
				try {
                    adminAuthToken = authXML.child('credentials').attribute("token").getValue();
                }
                catch (err)
                {
                    console.log ("Your servername, username or password are incorrect");
                    adminAuthToken = -1;
                }
                
				console.log("Auth token: " + adminAuthToken);
                callback(null);
                return;
            }
        }
    );
    
}






console.log("Application Launching...");
console.log("Logging in....");
console.log("Begin: " + n + ' ' + t);
adminLogin(function() {
       
    simplePublish(function(){
        console.log("End: " + n + ' ' + t);     
    });

});




