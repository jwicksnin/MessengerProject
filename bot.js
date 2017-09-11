//
// This is main file containing code implementing the Express server and functionality for the Express echo bot.
//
'use strict';
const express = require('express');
const bodyParser = require('body-parser');
const request = require('request');
const path = require('path');
const messengerButton = "<html><head><title>Facebook Messenger Bot</title></head><body><h1>Facebook Messenger Bot</h1>This is a bot based on Messenger Platform QuickStart. For more details, see their <a href=\"https://developers.facebook.com/docs/messenger-platform/guides/quick-start\">docs</a>.<script src=\"https://button.glitch.me/button.js\" data-style=\"glitch\"></script><div class=\"glitchButton\" style=\"position:fixed;top:20px;right:20px;\"></div></body></html>";

// The rest of the code implements the routes for our Express server.
let app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: true
}));

// Webhook validation
app.get('/webhook', function(req, res) {
  if (req.query['hub.mode'] === 'subscribe' &&
      req.query['hub.verify_token'] === process.env.VERIFY_TOKEN) {
    console.log("Validating webhook");
    res.status(200).send(req.query['hub.challenge']);
  } else {
    console.error("Failed validation. Make sure the validation tokens match.");
    res.sendStatus(403);          
  }
});

// Display the web page
app.get('/', function(req, res) {
  res.writeHead(200, {'Content-Type': 'text/html'});
  res.write(messengerButton);
  res.end();
});

// Message processing
app.post('/webhook', function (req, res) {
  console.log(req.body);
  const data = req.body;

  // Make sure this is a page subscription
  if (data.object === 'page') {
    
    // Iterate over each entry - there may be multiple if batched
    data.entry.forEach(function(entry) {
      const pageID = entry.id;
      const timeOfEvent = entry.time;

      // Iterate over each messaging event
      entry.messaging.forEach(function(event) {
        if (event.message) {
          receivedMessage(event);
        } else if (event.postback) {
          receivedPostback(event);   
        } else {
          console.log("Webhook received unknown event: ", event);
        }
      });
    });

    // Assume all went well.
    //
    // You must send back a 200, within 20 seconds, to let us know
    // you've successfully received the callback. Otherwise, the request
    // will time out and we will keep trying to resend.
    res.sendStatus(200);
  }
});

// Incoming events handling
function receivedMessage(event) {
  const senderID = event.sender.id;
  const recipientID = event.recipient.id;
  const { message, timestamp } = event;

  console.log("Received message for user %d and page %d at %d with message:", 
    senderID, recipientID, timestamp);
  console.log(JSON.stringify(message));

  const { mid, text, attachments } = message;

  if (text) {
    // If we receive a text message, check to see if it matches a keyword
    // and send back the template example. Otherwise, just echo the text we received.
    switch (text) {
      case 'generic':
        sendGenericMessage(senderID);
        break;

      case 'annie':
        sendPictureCarousel(senderID);

      default:
        sendTextMessage(senderID, text);
    }
  } else if (attachments) {
    sendTextMessage(senderID, "Message with attachment received");
  }
}

function receivedPostback(event) {
  const senderID = event.sender.id;
  const recipientID = event.recipient.id;
  const timeOfPostback = event.timestamp;

  // The 'payload' param is a developer-defined field which is set in a postback 
  // button for Structured Messages. 
  const payload = event.postback.payload;

  console.log("Received postback for user %d and page %d with payload '%s' " + 
    "at %d", senderID, recipientID, payload, timeOfPostback);

  // When a postback is called, we'll send a message back to the sender to 
  // let them know it was successful
  switch (payload) {
    case 'annie-pumpkin':
      sendTextMessage(senderID, "I also like to eat pumpkin!");
      break;

    case 'annie-view':
      sendTextMessage(senderID, "I love the rain!");
      break;

    case 'annie-sleeping':
      sendTextMessage(senderID, "I wore myself out opening my own presents!");
      break;

    default:
      sendTextMessage(senderID, "Postback called");
  }
}

//////////////////////////
// Sending helpers
//////////////////////////
function sendTextMessage(recipientId, messageText) {
  const messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      text: messageText
    }
  };

  callSendAPI(messageData);
}

function sendGenericMessage(recipientId) {
  const messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      attachment: {
        type: "template",
        payload: {
          template_type: "generic",
          elements: [{
            title: "rift",
            subtitle: "Next-generation virtual reality",
            item_url: "https://www.oculus.com/en-us/rift/",               
            image_url: "http://messengerdemo.parseapp.com/img/rift.png",
            buttons: [{
              type: "web_url",
              url: "https://www.oculus.com/en-us/rift/",
              title: "Open Web URL"
            }, {
              type: "postback",
              title: "Call Postback",
              payload: "Payload for first bubble",
            }],
          }, {
            title: "touch",
            subtitle: "Your Hands, Now in VR",
            item_url: "https://www.oculus.com/en-us/touch/",               
            image_url: "http://messengerdemo.parseapp.com/img/touch.png",
            buttons: [{
              type: "web_url",
              url: "https://www.oculus.com/en-us/touch/",
              title: "Open Web URL"
            }, {
              type: "postback",
              title: "Call Postback",
              payload: "Payload for second bubble",
            }]
          }]
        }
      }
    }
  };  

  callSendAPI(messageData);
}
function sendPictureCarousel(recipientID) {
  const messageData = {
    recipient: {
      id: recipientID
    },
    message: {
      attachment: {
        type: "template",
        payload: {
          template_type: "generic",
          elements: [{
            title: "Annie Is a Pumpkin",
            image_url: "https://scontent-sea1-1.xx.fbcdn.net/v/t1.0-9/11220467_10101832167398838_8915419354638245338_n.jpg?oh=ac9cf18e0cf3ac0c62ac64083ad73127&oe=5A193345",
            buttons: [{
              type: "postback",
              title: "I Like This One",
              payload: "annie-pumpkin",
            }],
          },
          {
            title: "Annie With a View",
            image_url: "https://scontent-sea1-1.xx.fbcdn.net/v/t1.0-0/p206x206/988373_10100901073393688_1882962262_n.jpg?oh=661bd765d29eee70715b84d650d2a688&oe=5A547C1D",
            buttons: [{
              type: "postback",
              title: "I Like This One",
              payload: "annie-view",
            }],
          },
          {
            title: "Annie Is Exhausted",
            image_url: "https://scontent-sea1-1.xx.fbcdn.net/v/t1.0-0/q81/p206x206/1798247_10101420839872498_7841486312264934356_n.jpg?oh=f6975db096b6dc4b378783152a139449&oe=5A1375C2",
            buttons: [{
              type: "postback",
              title: "I Like This One",
              payload: "annie-sleeping",
            }],
          }]
        }
      }
    }
  };  

  callSendAPI(messageData);
}

function callSendAPI(messageData) {
  return new Promise((resolve, reject) => {
    request({
    uri: 'https://graph.facebook.com/v2.6/me/messages',
    qs: { access_token: process.env.PAGE_ACCESS_TOKEN },
    method: 'POST',
    json: messageData

    }, function (error, response, body) {
      if (!error && response.statusCode == 200) {
        const recipientId = body.recipient_id;
        const messageId = body.message_id;

        console.log("Sufccessfully sent generic message with id %s to recipient %s",
          messageId, recipientId);
        resolve(body);
      } else {
        console.error("Unable to send message.");
        console.error(response);
        console.error(error);
        reject(error);
      }
    });
  });
}

// Set Express to listen out for HTTP requests
const server = app.listen(process.env.PORT || 3000, function () {
  console.log("Listening on port %s", server.address().port);
});