const {
  BaseKonnector,
  requestFactory,
  signin,
  errors,
  scrape,
  saveBills,
  log,
  utils,
  hydrateAndFilter,
  addData
} = require('cozy-konnector-libs')
const moment = require('moment')
const rp = require('request-promise')

const startDate = moment()
  .subtract(31, 'day')
  .format('YYYY-MM-DD')
const endDate = moment().format('YYYY-MM-DD')

// const request = requestFactory({
//   // The debug mode shows all the details about HTTP requests and responses. Very useful for
//   // debugging but very verbose. This is why it is commented out by default
//   // debug: true,
//   // Activates [cheerio](https://cheerio.js.org/) parsing on each page
//   cheerio: true,
//   // If cheerio is activated do not forget to deactivate json parsing (which is activated by
//   // default in cozy-konnector-libs
//   json: false,
//   // This allows request-promise to keep cookies between requests
//   jar: true
// })

const baseUrl = 'https://gw.hml.api.enedis.fr'

// The start function is run by the BaseKonnector instance only when it got all the account
// information (fields). When you run this connector yourself in "standalone" mode or "dev" mode,
// the account information come from ./konnector-dev-config.json file
// cozyParameters are static parameters, independents from the account. Most often, it can be a
// secret api key.
async function start(fields) {
  try {
    const { access_token } = fields
    console.log(access_token)
    log('info', 'Fetching enedis data')
    const $ = await getData(access_token)
    log('info', 'Parsing data')
    const documents = await parseDocuments($)
    log('info', 'Saving data to Cozy')
    storeData(documents)
  } catch (err) {
    log('error', err.message)
  }

  // await saveBills(documents, fields, {
  //   // This is a bank identifier which will be used to link bills to bank operations. These
  //   // identifiers should be at least a word found in the title of a bank operation related to this
  //   // bill. It is not case sensitive.
  //   identifiers: ['books'],
  //   sourceAccount: this.accountId,
  //   sourceAccountIdentifier: fields.login
  // })
}

// This shows authentication using the [signin function](https://github.com/konnectors/libs/blob/master/packages/cozy-konnector-libs/docs/api.md#module_signin)
// even if this in another domain here, but it works as an example

async function getData(token) {
  var usagePointID = 32320647321714
  const dataRequest = {
    method: 'GET',
    uri:
      baseUrl +
      '/v3/metering_data/daily_consumption?start=' +
      startDate +
      '&end=' +
      endDate +
      '&usage_point_id=' +
      usagePointID,
    headers: {
      Accept: 'application/json',
      Authorization: 'Bearer ' + token
    }
  }
  try {
    const response = await rp(dataRequest)
    return response
  } catch (error) {
    throw error
  }
}

function storeData(data) {
  data = JSON.parse(data)
  var dataToStore = data.usage_point[0].meter_reading.interval_reading
  console.log(dataToStore)
  return hydrateAndFilter(dataToStore, 'io.enedis.day', {
    keys: ['rank']
  }).then(filteredDocuments => {
    addData(filteredDocuments, 'io.enedis.day')
  })
}

// The goal of this function is to parse a HTML page wrapped by a cheerio instance
// and return an array of JS objects which will be saved to the cozy by saveBills
// (https://github.com/konnectors/libs/blob/master/packages/cozy-konnector-libs/docs/api.md#savebills)
function parseDocuments($) {
  // You can find documentation about the scrape function here:
  // https://github.com/konnectors/libs/blob/master/packages/cozy-konnector-libs/docs/api.md#scrape
  log($)
  return $
}

module.exports = new BaseKonnector(start)
