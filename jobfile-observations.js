const krawler = require('@kalisio/krawler')
const hooks = krawler.hooks
const _ = require('lodash')

const dbUrl = process.env.DB_URL || 'mongodb://127.0.0.1:27017/vigicrues'

let stations = null

// Create a custom hook to generate tasks
let generateTasks = (options) => {
  return (hook) => {
    let tasks = []
    stations = hook.data.stations
    stations.forEach(station => {
      options.series.forEach(serie => {
        let task = {
          id: station.properties.CdStationH + '-' + serie,
          initialTime: options.initialTime,
          CdStationH: station.properties.CdStationH,
          serie: serie,
          options: {
            url: options.baseUrl + 'CdStationHydro=' + station.properties.CdStationH + '&GrdSerie=' + serie + '&FormatSortie=simple&FormatDate=iso',
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
      before: {
        readMongoCollection: {
          collection: 'vigicrues-observations',
          dataPath: 'data.recentDataTime',
          query: { 'properties.CdStationH': '<%= CdStationH %>', 'properties.<%= serie %>': { $exists: true } },
          sort: { time: -1 },
          limit: 1
        }
      },
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
            let lastTime = item.initialTime
            if (item.recentDataTime.length === 1) {
              lastTime = item.recentDataTime[0].time.getTime()
            }
            // Must check wether the task query has succeeded or not
            if (!_.isNil(item.data.Serie)) {
              stationId = item.data.Serie.CdStationHydro
              // Ensure we have a station              
              let stationObject = _.find(stations, (station) => { return station.properties.CdStationH === item.CdStationH })
              if (!_.isNil(stationObject)) {
                _.forEach(item.data.Serie.ObssHydro, (obs) => {
                  let timeObsUTC= new Date(obs[0]).getTime()
                  if (timeObsUTC > lastTime) {
                    let feature = Object.assign({}, stationObject)
                    // Remove unused properties
                    delete feature._id
                    delete feature.CoordXStat
                    delete feature.CoordYStat
                    delete feature.ProjCoord
                    delete feature.CdAncienRef
                    // Add new properties
                    feature['time'] = new Date(timeObsUTC).toISOString()
                    feature.properties[item.serie] = obs[1]
                    // Push the feature
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
          chunkSize: 256,
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
            { 'properties.CdStationH': 1 }, 
            { geometry: '2dsphere' }
          ],
        },
        readMongoCollection: {
          clientPath: 'taskTemplate.client',
          collection: 'vigicrues-stations',
          dataPath: 'data.stations'
        },
        generateTasks: {
          baseUrl: 'https://www.vigicrues.gouv.fr/services/observations.json?',
          series:  ["H", "Q"],
          initialTime: Date.now() - 604800000 // 7 days
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
