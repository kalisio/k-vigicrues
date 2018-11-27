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
          mapping: { 'properties.NivSituVigiCruEnt': { path: 'properties.stroke', values: { 1: '#00FF00', 2: '#FFFF00', 3: '#FFBF00', 4: '#FF0000' }, delete: false } }
        },   
        /* To debug */
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
        removeStores: ['memory', 'fs', 's3']
      }
    }
  }
}
