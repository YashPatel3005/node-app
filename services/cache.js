const mongoose = require('mongoose')
//redis
const redis = require('redis')
const redisUrl = 'redis://127.0.0.1:6379';
const client = redis.createClient(redisUrl)
const util = require('util');
client.get = util.promisify(client.get)

const exec = mongoose.Query.prototype.exec


mongoose.Query.prototype.cache = function(options = {}) {
    this.enableCache = true;
    this.hashKey = JSON.stringify(options.key || 'default');

    return this;
};

mongoose.Query.prototype.exec = async function () {
    console.log('I am about to run query');

    if (!this.enableCache) {
        console.log('Data Source: Database');
        return exec.apply(this, arguments);
    }
   
    const key = JSON.stringify(Object.assign({}, this.getQuery(), {
        collection: this.mongooseCollection.name,
    }));

    // //see if we have a value for 'key' in redis
    const cachedValue = await client.get(key)

    //if we do,returnn that
    if(cachedValue){
        const parsedCache = JSON.parse(cachedValue);

        console.log('Data Source: Cache');

        return Array.isArray(parsedCache) 
                ?  parsedCache.map(doc => new this.model(doc)) 
                :  new this.model(parsedCache);
   }
    // ///otherwise,issue the query and store the result in redis

    const result = await exec.apply(this,arguments)  
    
    client.set(key,JSON.stringify(result),'EX',300)
    console.log('Data Source: Database');

    return result
}

// module.exports = {
//     clearCache(hashKey) {
//         console.log('Cache cleaned');
//         client.del(JSON.stringify(hashKey));
//     }
// }