# Backzimon-Node
[![Build Status][travis-badge]][travis-badge-url]

This is Zimon, a simple dashboard for Zivis. 
The repository at hand contains the Node.js backend.


## Developer Setup

```bash
git clone git@github.com:realzimon/backzimon-node.git
cd backzimon-node
npm install
npm install -g nodemon # if you do not already have it
node nodemon
```

##Initialise the Database

Connect to your mongoDB instance and create the database: zimon

```
use zimon
```

After you have created the db you can initialise the database with the following command:

```
npm run db:init
```

This will remove all previous entries of the database documents (zivis and quotes) and insert the values from the config files. 

## Testing

You can run the test suite using:

```
npm test
```

[travis-badge]: https://travis-ci.org/realzimon/backzimon-node.svg?branch=master
[travis-badge-url]: https://travis-ci.org/realzimon/backzimon-node
