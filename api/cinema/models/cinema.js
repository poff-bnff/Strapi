'use strict';

/**
 * Read the documentation (https://strapi.io/documentation/v3.x/concepts/models.html#lifecycle-hooks)
 * to customize this model
 */

const https = require('https');

module.exports = {};

// 

// module.exports = {
//     lifecycles: {
//       beforeCreate: async (data) => {
//         if (data.name_et) {
//           data.name_et = 'UUS!' + data.name_et
//         }
//       },
//       beforeUpdate: async (params, data) => {

//           if (data.name_et) {
//               data.name_et = 'PAREM' + data.name_et
// 	  }
// 	  let name = data.name_et

//       var postData = JSON.stringify({"key":"f0fd5eytVAO71_OF-gqhTw","message":{"from_email":"info@poff.ee","subject":"Tere","text":"Tere Mariann, StrapiBackend siin!"+ name,"to":[{"email":"tapferm@gmail.com","type":"to"}]}})
//       process.stdout.write('postData: ' + postData)

//       const options = {
//           hostname: 'mandrillapp.com',
//           port: 443,
//           path: '/api/1.0/messages/send',
//           method: 'POST',
//           headers: { 'Content-Type': 'application/json',
//               'Content-Length': postData.length
//           }
//       }
//       const req = https.request(
//           options, (res) => {
//               console.log('statusCode:', res.statusCode);
//               console.log('headers:', res.headers);

//                 res.on('data', (d) => {
//                       process.stdout.write(d);
//                 });
//           }
//       );

//       req.on('error', (e) => {
//             console.log(e);
//       });
//       req.write(postData);
//       req.end();


//       },
//     },
//   };

