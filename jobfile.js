const moment = require('moment')
const _ = require('lodash')

const dbUrl = process.env.DB_URL || 'mongodb://127.0.0.1:27017/vigicrues'
const ttl = +process.env.TTL || (7 * 24 * 60 * 60)  // duration in seconds

module.exports = {
  id: 'vigicrues',
  store: 'memory',
  options: {
    workersLimit: 1,
    faultTolerant: true
  },
  tasks: [{
    id: 'vigicrues',
    type: 'http',
    options: {
      url: 'https://www.vigicrues.gouv.fr/services/vigicrues.geojson'
    }
  }],
  hooks: {
    tasks: {
      after: {
        readJson: {},
        reprojectGeoJson: { from: 'EPSG:2154' },
        apply: {
          // Build the forecast collection using the vigilance value (NivSituVigiCruEnt)
          // and a simplified geometry of the section. The simplifief geometry (MultiPoint) is 
          // derived from the original (MultiLineString) using the the mid point of each string.
          function: (item) => {
            let forecastFeatures = []
            _.forEach(item.data.features, feature => {
              let points = []
              _.forEach(feature.geometry.coordinates, coords => {
                points.push(coords[Math.floor(coords.length/2)])
              })
              forecastFeatures.push({
                type: 'Feature',
                time: moment.utc().toDate(),
                properties: {
                  gid: feature.properties.gid,
                  vigilance: feature.properties.NivSituVigiCruEnt
                },
                geometry: {
                  type: 'MultiPoint',
                  coordinates: points
                }
              })
            })
            item.data.forecastFeatures = forecastFeatures
          }
        },
        writeForecasts: {
          hook: 'writeMongoCollection',
          collection: 'vigicrues-forecasts',
          dataPath: 'result.data.forecastFeatures'
        },
        writeSections: {
          hook: 'updateMongoCollection',
          collection: 'vigicrues-sections',
          filter: { 'properties.gid': '<%= properties.gid %>' },
          upsert : true,
          transform: {
            transformPath: 'features',
            omit: [
              'id',
              'properties.NivSituVigiCruEnt'
            ]
          },
          chunkSize: 256
        },
        clearData: {}
      }
    },
    jobs: {
      before: {
        createStores: [{ id: 'memory' }],
        connectMongo: {
          url: dbUrl,
          // Required so that client is forwarded from job to tasks
          clientPath: 'taskTemplate.client'
        },
        createSectionsCollection: {
          hook: 'createMongoCollection',
          clientPath: 'taskTemplate.client',
          collection: 'vigicrues-sections',
          indices: [
            [{ 'properties.gid': 1 }, { unique: true }],
            { geometry: '2dsphere' }                                                                                                              
          ]
        },
        createForecastsCollection: {
          hook: 'createMongoCollection',
          clientPath: 'taskTemplate.client',
          collection: 'vigicrues-forecasts',
          indices: [
            [{ time: 1, 'properties.gid': 1 }, { unique: true }],
            { 'properties.vigilance': 1 },
            { 'properties.gid': 1, 'properties.vigilance': 1, time: -1 },
            [{ time: 1 }, { expireAfterSeconds: ttl }] // days in secs                                                                                                         
          ]
        }
      },
      after: {
        disconnectMongo: {
          clientPath: 'taskTemplate.client'
        },
        removeStores: ['memory']
      },
      error: {
        disconnectMongo: {
          clientPath: 'taskTemplate.client'
        },
        removeStores: ['memory']
      }
    }
  }
}
