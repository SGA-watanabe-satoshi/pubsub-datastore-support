'use strict';

// [START app]
const express = require('express');
const bodyParser = require('body-parser');
const url = require('url');
const PubSub = require('@google-cloud/pubsub');
const Datastore = require('@google-cloud/datastore');
const config = require('./config');

const datastore = Datastore({projectId: config.GCLOUD_PROJECT, namespace: config.DATASTORE_NAMESPACE});
const pubsub = PubSub({projectId: config.GCLOUD_PROJECT});

const app = express();
app.use(bodyParser.json({extended: true}));

function parseQuery(req) {
    if (req == null){
        return null;
    }
    let parameters = {};
    let u = url.parse(req.url);
    if (u.query) {
        var q = u.query.split('&');

        q.forEach(function (param) {
            var pair = param.split('=');
            if (parameters[decodeURIComponent(pair[0])]) {
            if (Array.isArray(parameters[decodeURIComponent(pair[0])])) {
                parameters[decodeURIComponent(pair[0])].push(decodeURIComponent(pair[1]));
            } else {
                parameters[decodeURIComponent(pair[0])] = [parameters[decodeURIComponent(pair[0])]];
                parameters[decodeURIComponent(pair[0])].push(decodeURIComponent(pair[1]));
            }
            } else {
            parameters[decodeURIComponent(pair[0])] = decodeURIComponent(pair[1]);
            }
        });
    }
    return parameters;
}

function queryAllData(kind, datas, cursor) {
    const query = datastore.createQuery(kind);
    if(cursor) {
        query.start(cursor);
    }
    if(!datas) {
        datas = [];
    }
    return datastore.runQuery(query).then((results)=>{
        const rows = results[0];
        datas = datas.concat(rows);
        if(results[1].moreResults !== Datastore.NO_MORE_RESULTS){
            return queryAllData(kind, datas, results[1].endCursor);
        }else{
            return datas;
        }
    });
}

app.get('/', (req, res) => {
  res.status(200).send('app now running!').end();
});

app.post('/publish', (req, res)=>{   
    const topic = pubsub.topic(config.PUBSUB_TOPIC);
    const publisher = topic.publisher();
    const dataBuffer = Buffer.from(JSON.stringify(req.body));
    publisher.publish(dataBuffer)
    .then((results) => {
      const messageId = results[0];
      res.status(200).send(`Message ${messageId} published.`).end();
    }).catch((e)=>{
        res.status(500).header({"Content-Type":"application/json"}).json(e).end();    
    });
});

app.get('/datastore', (req, res)=>{
    const params = parseQuery(req);

    if(params.all){
        queryAllData(config.DATASTORE_KIND).then((results)=>{
            res.status(200).header({"Content-Type":"application/json"}).json(results).end();
        }).catch((e)=>{
            res.status(500).header({"Content-Type":"application/json"}).json(e).end();
        });    
    }else{
        const query = datastore.createQuery(config.DATASTORE_KIND);
        if(params.cursor){
            query.start(params.cursor);
        }
        datastore.runQuery(query).then((results)=>{
            res.status(200).header({"Content-Type":"application/json"}).json(results).end();
        }).catch((e)=>{
            res.status(500).header({"Content-Type":"application/json"}).json(e).end();
        });
    }
});

app.get('/expire', (req, res)=>{
    const query = datastore.createQuery(config.DATASTORE_KIND);
    const deleteKeys = [];

    queryAllData(config.DATASTORE_KIND).then((results)=>{
        const currentTime = new Date().getTime();
        results.forEach((result)=>{
            try{
                if(currentTime - new Date(result.created).getTime() > 60 * 1000 * 3){
                    const key = result[datastore.KEY];
                    deleteKeys.push(key);
                }
            }catch(e){
                const key = result[datastore.KEY];
                deleteKeys.push(key);
            }
        });
        if(deleteKeys.length > 0){
            datastore.delete(deleteKeys).then(()=>{
                res.status(200).send(`delete ${deleteKeys.length} expire records.`).end();                            
            }).catch((e)=>{
                res.status(500).header({"Content-Type":"application/json"}).json(e).end();                
            });
        }else{
            res.status(200).send('no expire records.');            
        }
    }).catch((e)=>{
        res.status(500).header({"Content-Type":"application/json"}).json(e).end();
    });
});

// Start the server
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
//   console.log(`Config: ${JSON.stringify(config)}`);
  console.log(`App listening on port ${PORT}`);
  console.log('Press Ctrl+C to quit.');
});
// [END app]