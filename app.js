//modules ==========================================


// Modules for handling xml requests and responses
var jsxml = require("node-jsxml");
var XMLWriter = require('xml-writer');
var request = require("request");

// File streaming
var fs = require('fs');

//Variables we'll use throughout the app

// admin username & pw: OF COURSE you won't hard-code these in the real world:
var admin = {username: "admin", password: "adminpw"};

//location of the server
var tableauServer = "http://russellchri05e1"; 

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
        var siteID = '9037bbd3-c08f-413f-a213-c3e126950cba';

        //First, build the XML for the POST
        var dsXml = new XMLWriter();
        dsXml.startElement('tsRequest')
                    .startElement('datasource')
                    .writeAttribute('name', 'Stock Data')
                        .startElement('project')
                            // ID of the Default Project in REST site. Lookup with REST API or PGAdmin3
                            .writeAttribute('id', 'efaffc44-89ec-11e3-972e-0bebbf58ccb0')
                        .endElement()
                    .endElement()
                .endElement();
        console.log(dsXml.toString());
    
        
        
        request( 
            {
                method: 'POST',
                //proxy:'http://localhost:8888', // So I can pick up calls in Charles and/or Fiddler
                //preambleCRLF: false, //tried 'true' as well, no difference
                //postambleCRLF: false, //tried 'true' as well, no difference
                uri:  tableauServer + '/api/2.0/sites/' + siteID + '/datasources?overwrite=true',
                headers: {
                    'Content-Type': "multipart/mixed",
                    'X-Tableau-Auth': adminAuthToken
                },
                multipart: [
                  {
                    'Content-Disposition': "name='request_payload'",
                    'Content-Type': 'text/xml',
                     body: dsXml.toString()
                  },
                  { 
                    'Content-Disposition': "name='tableau_datasource'; filename='Stock Data.tde'",
                    'Content-Type': 'application/octet-stream',
                    body: fs.createReadStream('Stock Data.tde',{encoding: 'base64'}) //tried ascii, utf8 as well
                  }

                ]
            },
            function(err, response, body) {
                if(err) {
                    callback(err);
                    return;
                } else {
                    //If the request was succesful we get xml back that contains the id and name of the added user.
                    console.log('success', body);
                }
                callback(null);
                return;
            }
        );	
    
        
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
			url: tableauServer + '/api/2.0/auth/signin',
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




