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
      url: 'https://www.vigicrues.gouv.fr/services/1/InfoVigiCru.geojson'
    }
  }],
  hooks: {
    tasks: {
      after: {
        readJson: {
        },
        reprojectGeoJson: { 
          from: 'EPSG:2154' 
        },
        generateStations: {
          hook: 'apply',
          function: (item) => {
            let sectionFeatures = []
            let features = _.get(item, 'data.features', [])
            _.forEach(features, feature => {
              // FIXME: simplification seems to fail on multilinestring
              if (feature.geometry.type === 'LineString') {
                const simplifiedFeature = turf.simplify(feature, {tolerance: 0.001, highQuality: true})
                let sectionFeature = turf.buffer(simplifiedFeature, 0.1)
                _.set(sectionFeature, 'properties.name', feature.properties.LbEntCru) // neded for timeseries
                sectionFeatures.push(sectionFeature)
              } else {
                console.log('Skipping multiline geometry for ', feature.properties.LbEntCru)
              }
            })
            item.data = sectionFeatures
          }
        },
        writeSections: {
          hook: 'updateMongoCollection',
          collection: 'vigicrues-sections',
          filter: { 'properties.gid': '<%= properties.gid %>' },
          upsert : true,
          transform: {
            omit: [
              'properties.LbEntCru',
              'properties.NivInfViCr'
            ],
            inPlace: false
          },
          chunkSize: 256
        },
        generateForecasts: {
          hook: 'apply',
          function: (item) => {
            let forecastFeatures = []
            _.forEach(item.data, feature => {
              let forecastFeature = turf.envelope(feature)
              _.set(forecastFeature, 'time', moment.utc().toDate())
              _.set(forecastFeature, 'properties.gid', feature.properties.gid) // neded for timeseries
              _.set(forecastFeature, 'properties.name', feature.properties.LbEntCru) // neded for timeseries
              _.set(forecastFeature, 'properties.NivSituVigiCruEnt', feature.properties.NivInfViCr) // neded for timeseries
              forecastFeatures.push(forecastFeature)
            })
            item.data = forecastFeatures
          }
        },
        writeForecasts: {
          hook: 'writeMongoCollection',
          collection: 'vigicrues-forecasts',
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
            { 'properties.NivSituVigiCruEnt': 1 },
            { 'properties.gid': 1, 'properties.NivSituVigiCruEnt': 1, time: -1 },
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
