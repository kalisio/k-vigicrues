const krawler = require('@kalisio/krawler')
const hooks = krawler.hooks
const _ = require('lodash')

const dbUrl = process.env.DB_URL || 'mongodb://127.0.0.1:27017/vigicrues'
const stations = require('./vigicrues/stations.json').features

// Create a custom hook to generate tasks
let generateTasks = (options) => {
  return (hook) => {
    let tasks = []
    stations.forEach(station => {
      options.series.forEach(serie => {
        let task = {
          id: station.properties.CdStationH + '-' + serie,
          options: {
            url: options.baseUrl + 'CdStationHydro=' + station.properties.CdStationH + '&GrdSerie=' + serie + '&FormatSortie=simple&FormatDate=iso'
          }
        }
        tasks.push(task)
      })
    })
    hook.data.tasks = tasks
    return hook
  }
}
hooks.registerHook('generateTasks', generateTasks)

module.exports = {
  id: 'vigicrues-observations',
  store: 'memory',
  options: {
    workersLimit: 2,
    faultTolerant: true
  },
  taskTemplate: {
    id: 'vigicrues/observations/<%= taskId %>',
    type: 'http'
  },
  hooks: {
    tasks: {
      after: {
        readJson: {},
        writeJsonMemory: {
          hook: 'writeJson',
          key: '<%= id %>',
          store: 'memory'
        },
        gzipToStore: {
          input: { key: '<%= id %>', store: 'memory' },
          output: { key: '<%= id %>', store: 's3',
            params: { ACL: 'public-read', ContentType: 'application/json', ContentEncoding: 'gzip' }
          }
        },
        writeJsonFS: {
          hook: 'writeJson',
          key: '<%= id %>.json',
          store: 'fs'
        },
        apply: {
          function: (item) => {
            let features = []
            let stationId = ''
            let quantity = ''
            // Must check wether the task query has succeeded or not
            if (!_.isNil(item.data.Serie)) {
              stationId = item.data.Serie.CdStationHydro
              quantity = item.data.Serie.GrdSerie
              // Ensure we have a station              
              let stationObject = _.find(stations, (station) => { return station.properties.CdStationH === stationId })
              if (!_.isNil(stationObject)) {
                _.forEach(item.data.Serie.ObssHydro, (obs) => {
                  let feature = Object.assign({}, stationObject)
                  feature['timestamp'] = obs[0]
                  feature.properties[quantity] = obs[1]
                  features.push(feature)
                })
              }
            }
            item.data = {
              features: features,
              station: stationId,
              quantity: quantity
            }
          }
        },
        deleteMongoCollection: {
          collection: 'observations',
          filter: { 'properties.CdStationH': '${data.station}', '<%= \'properties.\' + data.quantity %>': { $exists: true } }
        },
        writeMongoCollection: {
          dataPath: 'result.data.features',
          collection: 'observations',
          transform: { unitMapping: { timestamp: { asDate: 'utc' } } }
        },
        clearData: {}
      }
    },
    jobs: {
      before: {
        createStores: [{
          id: 'memory'
        }, {
          id: 'fs',
          options: {
            path: __dirname
          }
        }, {
          id: 's3',
          options: {
            client: {
              accessKeyId: process.env.S3_ACCESS_KEY,
              secretAccessKey: process.env.S3_SECRET_ACCESS_KEY
            },
            bucket: process.env.S3_BUCKET
          }
        }],
        connectMongo: {
          url: dbUrl,
          // Required so that client is forwarded from job to tasks
          clientPath: 'taskTemplate.client'
        },
        createMongoCollection: {
          clientPath: 'taskTemplate.client',
          collection: 'observations',
          indices: [{ timestamp: 1 }, { CdStationH: 1 }, { geometry: '2dsphere' }]
        },
        generateTasks: {
          baseUrl: 'https://www.vigicrues.gouv.fr/services/observations.json?',
          series: [ 'H', 'Q']
        }
      },
      after: {
        disconnectMongo: {
          clientPath: 'taskTemplate.client'
        },
        removeStores: ['memory', 'fs', 's3']
      }
    }
  }
}
