const path = require('path')
const fs = require('fs')

module.exports = {
  id: 'vigicrues-stations',
  store: 'memory',
  options: {
    workersLimit: 1,
    faultTolerant: true
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
        }]
      },
      after: {
        removeStores: ['memory', 'fs', 's3']
      }
    }
  }
}
