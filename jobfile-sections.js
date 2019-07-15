const config = require('./config')

const dbUrl = process.env.DB_URL || 'mongodb://127.0.0.1:27017/vigicrues'

module.exports = {
  id: 'vigicrues-sections',
  store: 'memory',
  options: {
    workersLimit: 1,
    faultTolerant: true
  },
  tasks: [{
    id: 'vigicrues/sections',
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
        omitCRS: {
          hook: 'transformJson',
          omit: ['crs']
        },
        applyStyle: {
          hook: 'transformJson',
          transformPath: 'features',
          filter: { 'properties.NivSituVigiCruEnt': { $gt: 0 } }, // Filter according to alert level
          // Leaflet style
          //mapping: { 'properties.NivSituVigiCruEnt': { path: 'style.color', values: { 1: 'green', 2: 'yellow', 3: 'orange', 4: 'red' }, delete: false } }
          // Simplespec style
          mapping: { 'properties.NivSituVigiCruEnt': { path: 'properties.stroke', values: { 1: config.sectionsColors[0], 2: config.sectionsColors[1], 3: config.sectionsColors[2], 4: config.sectionsColors[3] }, delete: false } }
        },   
        /* To debug */
        writeJsonMemory: {
          hook: 'writeJson',
          key: '<%= id %>',
          store: 'memory'
        },
        gzipToStore: {
          input: { key: '<%= id %>', store: 'memory' },
          output: { key: '<%= id %>', store: 'fs' }
        },
        writeMongoCollection: {
          collection: 'vigicrues-sections'
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
        dropMongoCollection: {
          clientPath: 'taskTemplate.client',
          collection: 'vigicrues-sections'
        },
        createMongoCollection: {
          clientPath: 'taskTemplate.client',
          collection: 'vigicrues-sections',
          indices: [{ gid: 1 }]
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
