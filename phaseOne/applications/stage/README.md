# Stage - UI

<div>
<img align="right" width="120vw" src="productDMS.svg" alt="arranger-logo"/>
</div>

Stage is a React-based user interface designed to prop up browser-accessible data portals. Although Stage can be used for any web application, it is designed to integrate with Overture's Ego and Arranger microservices.

Stage is a [Next.js](https://nextjs.org/) project bootstrapped with [create-next-app](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

For more information about Stage, including setup and how to integrate Overture microservices Arranger and Ego, see our [official Stage user documentation](https://www.overture.bio/documentation/stage/)

<!--Blockqoute-->

</br>

> <div>
> <img align="left" src="ov-logo.png" height="90"/>
> </div>
>
> Stage is part of the [Overture](https://www.overture.bio/) research software ecosystem. See our [related products](#related-products) for more information on how Overture is helping organize data and enable discovery.

<!--Blockqoute-->

</br>

## Features

- URL parameterization support
- Extensible layout, with primary and secondary menus
- Reusable UI components
- Theme customization

## Getting Started

1. Install the dependencies

```shell
  npm ci
```

2. Run the development server

```shell
  npm run dev
```

Once running, Stage is available from your [http://localhost:3000](http://localhost:3000)

You can edit the UI by modifying `pages/index.js`. The UI will auto-update as you edit.

**Note:** This app was tested using Node v16+. We recommend using this version if you encounter any issues.

### Troubleshooting Note:

Stage requires NPM v^8.3.0, to ensure all dependencies get installed correctly

```bash
# If you need to update your NPM version first, use the following command:
  npm i -g npm
```

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.
- [The Next.js GitHub repository](https://github.com/vercel/next.js/) - your feedback and contributions are welcome!


## Support & Contributions

- Filing an [issue](https://github.com/overture-stack/stage/issues)
- Making a [contribution](https://github.com/overture-stack/.github/blob/master/CONTRIBUTING.md)
- Connect with us on [Slack](https://join.slack.com/t/overture-bio/shared_invite/zt-21tdumtdh-9fP1TFeLepK4~Lc377rOYw)
- Add or Upvote a [feature request](https://github.com/overture-stack/stage/issues/new?assignees=&labels=&projects=&template=Feature_Requests.md)

## Related Products

<div>
  <img align="right" alt="Overture overview" src="https://www.overture.bio/static/124ca0fede460933c64fe4e50465b235/a6d66/system-diagram.png" width="45%" hspace="5">
</div>

Overture is an ecosystem of research software tools, each with narrow responsibilities, designed to reduce redundant programming efforts and enable developers and data scientists to build reliable systems that organize and share big data.

See the links below for additional information on our other research software tools:

</br>

| Software                                               | Description                                                                                       |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------- |
| [Ego](https://github.com/overture-stack/ego)           | An authorization and user management service                                                      |
| [Ego UI](https://github.com/overture-stack/ego-ui)     | A UI for managing Ego authentication and authorization services                                   |
| [Score](https://github.com/overture-stack/score)       | Transfer data to and from any cloud-based storage system                                          |
| [Song](https://github.com/overture-stack/song)         | Catalog and manage metadata associated to file data spread across cloud storage systems           |
| [Maestro](https://github.com/overture-stack/maestro)   | Organizing your distributed data into a centralized Elasticsearch index                           |
| [Arranger](https://github.com/overture-stack/arranger) | A search API with reusable UI components that build into configurable and functional data portals |
| [Stage](https://github.com/overture-stack/stage)       | A simple web browser UI that integrates Ego and Arranger                                          |

## Acknowledgements

Overture is supported by grant #U24CA253529 from the National Cancer Institute at the US National Institutes of Health, and additional funding from Genome Canada, the Canada Foundation for Innovation, the Canadian Institutes of Health Research, Canarie, and the Ontario Institute for Cancer Research.
