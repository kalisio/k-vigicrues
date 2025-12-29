# k-vigicrues

[![Latest Release](https://img.shields.io/github/v/tag/kalisio/k-vigicrues?sort=semver&label=latest)](https://github.com/kalisio/k-vigicrues/releases)
[![CI](https://github.com/kalisio/k-vigicrues/actions/workflows/main.yaml/badge.svg)](https://github.com/kalisio/k-vigicrues/actions/workflows/main.yaml)
[![Quality Gate Status](https://sonar.portal.kalisio.com/api/project_badges/measure?project=kalisio-k-vigicrues&metric=alert_status&token=sqb_cdce2ee6e7404852f3ba469081586bb17a8b643c)](https://sonar.portal.kalisio.com/dashboard?id=kalisio-k-vigicrues)
[![Maintainability Issues](https://sonar.portal.kalisio.com/api/project_badges/measure?project=kalisio-k-vigicrues&metric=software_quality_maintainability_issues&token=sqb_cdce2ee6e7404852f3ba469081586bb17a8b643c)](https://sonar.portal.kalisio.com/dashboard?id=kalisio-k-vigicrues)
[![Coverage](https://sonar.portal.kalisio.com/api/project_badges/measure?project=kalisio-k-vigicrues&metric=coverage&token=sqb_cdce2ee6e7404852f3ba469081586bb17a8b643c)](https://sonar.portal.kalisio.com/dashboard?id=kalisio-k-vigicrues)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A [Krawler](https://kalisio.github.io/krawler/) based service to download data from French flood warning system [Vigicrues](https://www.vigicrues.gouv.fr/)

To get support from **Vigicrues**, use the following contact address: <vigicrues@developpement-durable.gouv.fr>

## Description

The **k-vigicrues** job allow to scrape flood alerts from the following services: [https://www.vigicrues.gouv.fr/services/1/](https://www.vigicrues.gouv.fr/services/1/). The downloaded data are stored in a [MongoDB](https://www.mongodb.com/) database and more precisely in the collection `vigicrues`.

All records are stored in [GeoJson](https://fr.wikipedia.org/wiki/GeoJSON) format.

The job is executed according a specific cron expression. By default every 3 hours.

## Configuration

| Variable | Description |
|--- | --- |
| `DB_URL` | The mongoDB database URL. The default value is `mongodb://127.0.0.1:27017/vigicrues`. |
| `DEBUG` | Enables debug output. Set it to `krawler*` to enable full output. By default it is undefined. |

## Deployment

We personally use [Kargo](https://kalisio.github.io/kargo/) to deploy the service.

## Contributing

Please refer to [contribution section](./CONTRIBUTING.md) for more details.

## Authors

This project is sponsored by 

![Kalisio](https://s3.eu-central-1.amazonaws.com/kalisioscope/kalisio/kalisio-logo-black-256x84.png)

## License

This project is licensed under the MIT License - see the [license file](./LICENSE) for details



