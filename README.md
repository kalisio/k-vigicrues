# k-vigicrues

[![Build Status](https://travis-ci.org/kalisio/k-vigicrues.png?branch=master)](https://travis-ci.org/kalisio/k-vigicrues)

A [Krawler](https://kalisio.github.io/krawler/) based service to download data from French flood warning system [Vigicrues](https://www.vigicrues.gouv.fr/)

## Description

The **k-vigicrues** job allow to flood alerts from the following url: `https://www.vigicrues.gouv.fr/services/vigicrues.geojson`.

The downloaded data are stored in a [MongoDB](https://www.mongodb.com/) collection named `vigicrues`

By default, the job is executed every 15 minutes.

## Configuration

| Variable | Description |
|--- | --- |
| `DB_URL` | The mongoDB database URL. The default value is `mongodb://127.0.0.1:27017/vigicrues` |
| `DEBUG` | Enables debug output. Set it to `krawler*` to enable full output. By default it is undefined. |

## Deployment

We personally use [Kargo](https://kalisio.github.io/kargo/) to deploy the service.

## Contributing

Please refer to [contribution section](./CONTRIBUTING.md) for more details.

## Authors

This project is sponsored by 

![Kalisio](https://s3.eu-central-1.amazonaws.com/kalisioscope/kalisio/kalisio-logo-black-256x84.png)

## License

This project is licensed under the MIT License - see the [license file](./LICENCE) for details



