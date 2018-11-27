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
            url: options.baseUrl + 'CdStationHydro=' + station.properties.CdStationH + '&GrdSerie=' + serie + '&FormatSortie=simple&FormatDate=iso',
            station: station.properties.CdStationH,
            serie: serie,
            lastTime: options.lastTime
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
    workersLimit: 4,
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
        apply: {
          function: (item) => {
            let features = []
            // Must check wether the task query has succeeded or not
            if (!_.isNil(item.data.Serie)) {
              stationId = item.data.Serie.CdStationHydro
              // Ensure we have a station              
              let stationObject = _.find(stations, (station) => { return station.properties.CdStationH === item.options.station })
              if (!_.isNil(stationObject)) {
                _.forEach(item.data.Serie.ObssHydro, (obs) => {
                  let timeObsUTC= new Date(obs[0]).getTime()
                  if (timeObsUTC > item.options.lastTime) {
                    let feature = Object.assign({}, stationObject)
                    feature['time'] = new Date(timeObsUTC).toISOString()
                    feature.properties[item.options.serie] = obs[1]
                    features.push(feature)
                  }
                })
              }
            }
            item.data = features
          }
        },
        gzipToStore: {
          input: { key: '<%= id %>', store: 'memory' },
          output: { key: '<%= id %>', store: 'fs',
            params: { ContentType: 'application/json', ContentEncoding: 'gzip' }
          }
        },
        writeMongoCollection: {
          chunkSize: 512,
          collection: 'vigicrues-observations',
          transform: { unitMapping: { time: { asDate: 'utc' } } }
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
        }],
        connectMongo: {
          url: dbUrl,
          // Required so that client is forwarded from job to tasks
          clientPath: 'taskTemplate.client'
        },
        createMongoCollection: {
          clientPath: 'taskTemplate.client',
          collection: 'vigicrues-observations',
          indices: [ 
            [{ time: 1 }, { expireAfterSeconds: 604800 }], // 7 days
            { CdStationH: 1 }, 
            { geometry: '2dsphere' }
          ],
        },
        generateTasks: {
          baseUrl: 'https://www.vigicrues.gouv.fr/services/observations.json?',
          series:  ["H", "Q"],
          lastTime: Date.now() - 1800000 // 30 minutes
        }
      },
      after: {
        disconnectMongo: {
          clientPath: 'taskTemplate.client'
        },
        removeStores: ['memory', 'fs']
      }
    }
  }
}
