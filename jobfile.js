const moment = require('moment')
const _ = require('lodash')
const turf = require('@turf/turf')

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
          function: (item) => {
            let features = []
            _.forEach(item.data.features, feature => {
              let bufferFeature = turf.buffer(turf.simplify(feature, {tolerance: 0.001, highQuality: true}), 0.1)
              _.set(bufferFeature, 'time', moment.utc().toDate())
              _.set(bufferFeature, 'properties.name', feature.properties.NomEntVigiCru) // neded for timeseries
              features.push(bufferFeature)
            })
            item.data.features = features
          }
        },
        writeForecasts: {
          hook: 'writeMongoCollection',
          collection: 'vigicrues-forecasts'
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
              'time',
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
