const krawler = require('@kalisio/krawler')
const hooks = krawler.hooks
const path = require('path')
const makeDebug = require('debug')
const _ = require('lodash')
//const fs = require('fs')

const debug = makeDebug('krawler:examples')

const stations = require('./vigicrues/stations.json').features
const baseUrl = 'https://www.vigicrues.gouv.fr/services/observations.json?'

// Create a custom hook to generate tasks
let generateTasks = (options) => {
  return (hook) => {
    let tasks = []
    options.stations.forEach(station => {
      debug('Generate tasks for station', station)
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
    debug('Generated download tasks', tasks)
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
    id: 'vigicrues/<%= taskId %>',
    type: 'http'
  },
  hooks: {
    tasks: {
      after: {
        readJson: {},
        /* To debug */
        writeJsonFS: {
          hook: 'writeJson',
          store: 'fs'
        },
        writeJsonS3: {
          hook: 'writeJson',
          store: 's3',
          storageOptions: {
            ACL: 'public-read'
          }
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
        generateTasks: {
          baseUrl: baseUrl,
          series: [ 'H', 'Q'],
          stations: stations
        }
      },
      after: {
        removeStores: ['memory', 'fs', 's3']
      }
    }
  }
}
