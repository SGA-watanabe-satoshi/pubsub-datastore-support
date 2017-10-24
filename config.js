module.exports = {
    GCLOUD_PROJECT: process.env.GCLOUD_PROJECT || '',
    DATASTORE_NAMESPACE: process.env.DATASORE_NAMESPACE || 'watanabe',
    DATASTORE_KIND: process.env.DATASTORE_KIND || 'Sample',
    PUBSUB_TOPIC: process.env.PUBSUB_TOPIC || 'watanabe-sample'
}