/**
 * Triggered from a message on a Cloud Pub/Sub topic.
 *
 * @param {!Object} event The Cloud Functions event.
 * @param {!Function} The callback function.
 */

const Datastore = require('@google-cloud/datastore');
const datastore = Datastore({namespace:'watanabe'});

exports.subscribe = function subscribe(event, callback) {
  // The Cloud Pub/Sub Message object.
  const pubsubMessage = event.data;

  // We're just going to log the message to prove that
  // it worked.
  try{
    const obj = JSON.parse(Buffer.from(pubsubMessage.data, 'base64').toString());
    if(obj && obj.userid){
      const key = datastore.key('Sample');
      const entity = {
          key: key,
          data: [
            {
              name: 'userid',
              value: obj.userid
            },
            {
              name: 'created',
              value: new Date().toJSON()
            }
          ]
        };
      datastore.save(entity).then(()=>{
        callback();
      }).catch((e)=>{
        console.log(e);
        callback();
      });    
    }else{
      callback();
    }
  }catch(e){
    console.log(e);
    callback();
  }

  // Don't forget to call the callback.
};
