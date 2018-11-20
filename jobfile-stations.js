const dbUrl = process.env.DB_URL || 'mongodb://127.0.0.1:27017/vigicrues'

module.exports = {
  id: 'vigicrues-stations',
  store: 'memory',
  options: {
    workersLimit: 1,
    faultTolerant: false
  },
  tasks: [{
    id: 'vigicrues/stations',
    type: 'http',
    options: {
      // https://www.data.gouv.fr/fr/datasets/stations-hydrometriques-metropole/
      url: 'https://www.data.gouv.fr/fr/datasets/r/843df751-15eb-4871-abb1-f2e51659a697'
    }
  }],
  hooks: {
    tasks: {
      after: {
        readJson: {},
        transformJson: {
          transformPath: 'features',
          filter: { 'properties.LbAffiStaH': { $regex: '^Vigicrues' } }
        },
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
          collection: 'stations'
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
          collection: 'stations'
        },
        createMongoCollection: {
          clientPath: 'taskTemplate.client',
          collection: 'stations',
          indices: [{ CdStationH: 1 }, { geometry: '2dsphere' }]
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
