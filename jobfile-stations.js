const dbUrl = process.env.DB_URL || 'mongodb://127.0.0.1:27017/vigicrues'

module.exports = {
  id: 'vigicrues-stations',
  store: 'fs',
  options: {
    workersLimit: 1,
    faultTolerant: false
  },
  tasks: [{
    id: 'vigicrues/stations',
    type: 'wfs',
    options: {
      url: 'http://services.sandre.eaufrance.fr/geo/hyd',
      version: '1.1.0',
      typename: 'StationHydro_FXX',
      outputFormat: 'geojson'
    }
  }],
  hooks: {
    tasks: {
      after: {
        unzipFromStore: {
          input: { key: '<%= id %>', store: 'fs' },
          output: { path: 'vigicrues', store: 'fs' }
        },
        readJson: {
          key: 'vigicrues/StationHydro_FXX-geojson.dat'
        },
        transformJson: {
          transformPath: 'features',
          filter: { 'properties.LbAffichageStationHydro': { $regex: '^Vigicrues' } }
        },
        writeJsonMemory: {
          hook: 'writeJson',
          key: '<%= id %>',
          store: 'memory'
        },
        gzipToStore: {
          input: { key: '<%= id %>', store: 'memory' },
          output: { key: '<%= id %>', store: 'fs' }
        },
        deleteMongoCollection: {
          collection: 'vigicrues-stations'
        },
        writeMongoCollection: {
          collection: 'vigicrues-stations'
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
          collection: 'vigicrues-stations',
          indices: [
            { CdStationH: 1 }, 
            { geometry: '2dsphere' }
          ]
        }
      },
      after: {
        disconnectMongo: {
          clientPath: 'taskTemplate.client'
        },
        removeStores: ['memory', 'fs']
      },
      error: {
        disconnectMongo: {
          clientPath: 'taskTemplate.client'
        },
        removeStores: ['memory', 'fs']
      }
    }
  }
}
